from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import get_db, init_db
from .models import Character, CharacterStat, RankSnapshot
from .search_log import SearchLog
from .schemas import (
    RankingResponse, RankingItem, CharacterDetailResponse,
    CharacterStatHistory, CharacterDTO, SearchRequest, SearchResponse
)
from .adapter import adapter
from .power_calculator import calculate_power_index
from .rank_calculator import calculate_rank_from_server_data
from .server_stats import get_server_average_stats, update_server_average_stats
from datetime import datetime
from typing import Optional, List
import redis
import json
import os
import logging

# Configure logger
logger = logging.getLogger(__name__)

app = FastAPI(title="AION2 Tool API")

# Import routes
try:
    from .routes import characters, rankings
    app.include_router(characters.router)
    app.include_router(rankings.router)
except ImportError as e:
    logger.warning(f"Routes not found or import error: {e}")

# CORS 설정 - 환경 변수로 관리
# Default to allow both localhost and 127.0.0.1 to avoid "Failed to fetch" on local dev
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
cache = redis.from_url(REDIS_URL)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/servers")
def get_available_servers():
    """
    Returns list of available servers for character search
    """
    servers = ["Siel", "Israphel", "Nezakan", "Zikel", "Chantra"]
    return {
        "servers": servers,
        "default": "Siel"
    }

@app.get("/api/characters/search")
def search_character(
    server: str, 
    name: str, 
    refresh_force: bool = False, # Admin Bypass
    db: Session = Depends(get_db)
):
    # 1. Rate Limiting (Redis)
    client_ip = "127.0.0.1" # In prod, get from request.client.host
    rate_limit_key = f"rate_limit:{client_ip}:search"
    current_requests = cache.incr(rate_limit_key)
    if current_requests == 1:
        cache.expire(rate_limit_key, 60) # 1 minute window
    
    if current_requests > 10:
        raise HTTPException(status_code=429, detail="Too many search requests. Please try again later.")

    # 2. Update Search Log
    keyword = f"{server}:{name}"
    log = db.query(SearchLog).filter(SearchLog.keyword == keyword).first()
    if log:
        log.count += 1
    else:
        new_log = SearchLog(keyword=keyword)
        db.add(new_log)
    db.commit()

    warning_msg = None
    data = None
    fetch_error = None

    # 3. Check DB for Recent Data (Strict Cache Policy)
    # Env Var: MIN_REFRESH_INTERVAL_MINUTES (Default: 60 minutes)
    refresh_interval = int(os.getenv("MIN_REFRESH_INTERVAL_MINUTES", "60"))
    # force_refresh is now passed from query param
    
    char = db.query(Character).filter(Character.server == server, Character.name == name).first()
    
    # Logic: If data exists AND is recent AND no force refresh -> Return DB data
    if char and not refresh_force:
        # Fix: Ensure naive vs aware compatibility
        last_updated = char.updated_at.replace(tzinfo=None) if char.updated_at.tzinfo else char.updated_at
        time_diff = datetime.now() - last_updated
        minutes_elapsed = time_diff.total_seconds() / 60
        
        if minutes_elapsed < refresh_interval:
            logger.info(f"✓ Serving cached data for {server}:{name} (Age: {int(minutes_elapsed)}m < {refresh_interval}m)")
            latest_stats = char.stats[0].stats_json if char.stats else {}
            
            # Warn user if it's cached (Transparency)
            # But "Recent" is better than "Stale"
            # We can use a different field or reuse warning with a lighter tone if needed.
            # Requirement says: "Recent data notice"
            cache_notice = f"[최근 데이터] {int(minutes_elapsed)}분 전 수집된 정보입니다."
            
            return {
                "id": char.id,
                "name": char.name,
                "server": char.server,
                "class": char.class_name,
                "level": char.level,
                "power": char.power,
                "power_index": char.power_score,
                "tier_rank": char.power_rank,
                "percentile": char.percentile,
                "nextRankPower": None,
                "statContribution": None,
                "updated_at": char.updated_at,
                "stats": latest_stats,
                "warning": cache_notice,
                "power_change": None,
                "level_change": None
            }

    # 4. Try fetching from Adapter (If not cached or stale)
    try:
        logger.info(f"→ Attempting to fetch character (Refresh): {server}:{name}")
        data = adapter.get_character(server, name)
        logger.info(f"✓ Successfully fetched from adapter: {server}:{name}")
    except Exception as e:
        fetch_error = str(e)
        logger.warning(f"⚠ Adapter fetch failed for {server}:{name}: {e}")
        warning_msg = "외부 데이터 소스를 사용할 수 없습니다. 저장된 데이터를 표시합니다."

    # char query moved up
    # char = db.query(Character).filter(Character.server == server, Character.name == name).first()

    # 5. Fallback Logic (3-tier: External → DB → Dummy)
    if not data:
        logger.info(f"→ Entering fallback mode for {server}:{name}")

        # Tier 1 Fallback: Existing DB data
        if char:
            logger.info(f"✓ Fallback to DB data: {server}:{name}")
            latest_stats = char.stats[0].stats_json if char.stats else {}
            return {
                "id": char.id,
                "name": char.name,
                "server": char.server,
                "class": char.class_name,
                "level": char.level,
                "power": char.power,
                "power_index": char.power_score,
                "tier_rank": char.power_rank,
                "percentile": char.percentile,
                "nextRankPower": None,
                "statContribution": None,
                "updated_at": char.updated_at,
                "stats": latest_stats,
                "warning": warning_msg,
                "power_change": None,
                "level_change": None
            }

        # Tier 2 Fallback: Generate dummy data (last resort)
        else:
            from .adapter import DummySourceAdapter
            logger.warning(
                f"⚠ No DB data for {server}:{name}. "
                f"Generating dummy data as last resort. Error: {fetch_error}"
            )
            data = DummySourceAdapter()._get_dummy_data(server, name)
            warning_msg = (
                "외부 데이터 소스를 사용할 수 없고 저장된 데이터가 없습니다. "
                "임시 데이터를 표시합니다."
            )
            # Continue to save dummy data (allows future DB fallback)
            logger.info(f"✓ Generated dummy data: {server}:{name}")

    # 6. Success - Update DB and calculate changes
    prev_power = None
    prev_level = None

    if not char:
        char = Character(server=server, name=name)
        db.add(char)
    else:
        # Store previous values for comparison
        prev_power = char.power
        prev_level = char.level

    char.class_name = data.class_name
    char.level = data.level
    char.power = data.power
    char.updated_at = data.updated_at
    char.last_seen_at = datetime.now()

    db.commit()
    db.refresh(char)

    # History tracking: accumulate stats instead of deleting
    if data.stats_json:
        # Add full snapshot including power and level for history tracking
        stats_with_core = {
            **data.stats_json,
            "power": data.power,
            "level": data.level
        }
        stat = CharacterStat(character_id=char.id, stats_json=stats_with_core)
        db.add(stat)
        db.commit()

    # Calculate changes
    power_change = None
    level_change = None
    if prev_power is not None:
        power_change = char.power - prev_power
    if prev_level is not None:
        level_change = char.level - prev_level

    # Calculate Rank (Live)
    # Count chars with higher power
    rank = db.query(Character).filter(Character.power > char.power).count() + 1

    # ============================================================================
    # 투력 계산 및 랭크 산정
    # ============================================================================
    power_score = None
    power_rank = None
    percentile = None
    next_rank_power = None
    stat_contribution = None

    if data.stats_json:
        try:
            # 1. 서버 평균 스탯 가져오기
            server_avg = get_server_average_stats(db, server)

            # 2. 투력 계산
            power_score, stat_contribution = calculate_power_index(data.stats_json, server_avg)

            # 3. 랭크 산정 (서버 내 모든 캐릭터의 투력 필요)
            all_characters = db.query(Character.power_score, Character.server).filter(
                Character.power_score.isnot(None)
            ).all()

            if all_characters:
                power_rank, percentile, next_rank_power = calculate_rank_from_server_data(
                    power_score,
                    server,
                    [(c.power_score, c.server) for c in all_characters]
                )

            # 4. DB에 투력 및 랭크 저장
            char.power_score = power_score
            char.power_rank = power_rank
            char.percentile = percentile
            db.commit()

            logger.info(
                f"Calculated power_score: {power_score}, "
                f"power_rank: {power_rank}, percentile: {percentile}% for {server}:{name}"
            )

        except Exception as e:
            logger.error(f"Failed to calculate power_score for {server}:{name}: {e}")
            # 투력 계산 실패 시 기존 플로우 유지

    return {
        "id": char.id,
        "name": char.name,
        "server": char.server,
        "class": char.class_name,
        "level": char.level,
        "power": char.power,
        "power_index": power_score,
        "tier_rank": power_rank,
        "percentile": percentile,
        "nextRankPower": next_rank_power,
        "statContribution": stat_contribution,
        "rank": rank,
        "updated_at": char.updated_at,
        "stats": data.stats_json,
        "warning": warning_msg,
        "power_change": power_change,
        "level_change": level_change
    }

@app.get("/api/characters/{character_id}/history", response_model=List[CharacterStatHistory])
def get_character_history(character_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Get character stat history (최근 스냅샷 조회)"""
    stats = db.query(CharacterStat).filter(
        CharacterStat.character_id == character_id
    ).order_by(CharacterStat.captured_at.desc()).limit(limit).all()

    return [
        CharacterStatHistory(
            id=s.id,
            power=s.stats_json.get("power", 0),
            level=s.stats_json.get("level", 0),
            captured_at=s.captured_at,
            stats_json=s.stats_json
        ) for s in stats
    ]

@app.post("/api/characters/compare")
def compare_characters(
    characters: List[dict],  # [{"server": "Siel", "name": "혼"}, ...]
    db: Session = Depends(get_db)
):
    """
    Compare 2-3 characters
    Returns comparison table data
    """
    if len(characters) < 2 or len(characters) > 3:
        raise HTTPException(status_code=400, detail="2~3명의 캐릭터를 입력해주세요")
    
    result = []
    
    for char_input in characters:
        server = char_input.get("server")
        name = char_input.get("name")
        
        if not server or not name:
            continue
            
        char = db.query(Character).filter(
            Character.server == server,
            Character.name == name
        ).first()
        
        if not char:
            result.append({
                "server": server,
                "name": name,
                "error": "캐릭터를 찾을 수 없습니다",
                "power": 0,
                "level": 0,
                "class": "Unknown",
                "stats": {}
            })
            continue
        
        # Get latest stats
        latest_stat = db.query(CharacterStat).filter(
            CharacterStat.character_id == char.id
        ).order_by(CharacterStat.captured_at.desc()).first()
        
        stats_json = latest_stat.stats_json if latest_stat else {}
        
        result.append({
            "server": char.server,
            "name": char.name,
            "class": char.class_name,
            "level": char.level,
            "power": char.power,
            "stats": stats_json,
            "updated_at": char.updated_at
        })
    
    return {
        "characters": result,
        "count": len(result),
        "generated_at": datetime.now()
    }

@app.get("/api/search/popular")
def get_popular_keywords(limit: int = 10, db: Session = Depends(get_db)):
    results = db.query(SearchLog.keyword, SearchLog.count).order_by(SearchLog.count.desc()).limit(limit).all()
    # Format: [{"keyword": "server:name", "count": 10}, ...]
    # Or maybe cleaner: [{"server": "s1", "name": "n1", "count": 10}]
    return [{"keyword": r[0], "count": r[1]} for r in results]

@app.get("/api/characters/recent", response_model=List[CharacterDTO])
def get_recent_characters(limit: int = 10, db: Session = Depends(get_db)):
    """
    Get characters sorted by last_seen_at (Recently Searched/Updated)
    """
    # Exclude those with very low power/level if needed, but for now just raw list
    recents = db.query(Character).order_by(Character.last_seen_at.desc()).limit(limit).all()
    
    return [
        CharacterDTO(
            name=c.name,
            server=c.server,
            class_name=c.class_name,
            level=c.level,
            power=c.power,
            updated_at=c.updated_at,
            stats_json=c.stats[0].stats_json if c.stats else {}
        ) for c in recents
    ]

@app.get("/api/rankings", response_model=RankingResponse)
def get_rankings(
    type: str = "power",
    server: Optional[str] = None,
    class_name: Optional[str] = Query(None, alias="class"),
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    # Support multiple sort types
    # type: power (default), level, updated_at

    filter_key = f"{server or 'all'}:{class_name or 'all'}:{type}:page:{page}:limit:{limit}"
    cache_key = f"rank:{filter_key}"

    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    snapshot = db.query(RankSnapshot).filter(
        RankSnapshot.type == type,
        RankSnapshot.filter_key == filter_key
    ).order_by(RankSnapshot.generated_at.desc()).first()

    if snapshot:
        return {
            "items": snapshot.snapshot_json["items"],
            "generated_at": snapshot.generated_at,
            "type": type,
            "filter_key": filter_key,
            "is_realtime": False,
            "message": "스냅샷 데이터 기준" if snapshot.snapshot_json["items"] else "데이터가 없습니다"
        }

    query = db.query(Character)
    if server:
        query = query.filter(Character.server == server)
    if class_name:
        query = query.filter(Character.class_name == class_name)

    # Sorting logic
    if type == "level":
        query = query.order_by(Character.level.desc(), Character.power.desc())
    elif type == "updated_at":
        query = query.order_by(Character.updated_at.desc())
    else: # default power
        query = query.order_by(Character.power.desc())

    results = query.offset((page-1)*limit).limit(limit).all()

    items = [
        RankingItem(
            name=c.name,
            server=c.server,
            class_name=c.class_name,
            level=c.level,
            power=c.power,
            rank=(page-1)*limit + i + 1
        ) for i, c in enumerate(results)
    ]

    # Prepare message for empty data
    message = None
    if not items:
        if server and class_name:
            message = f"{server} 서버의 {class_name} 직업 캐릭터가 없습니다"
        elif server:
            message = f"{server} 서버에 검색된 캐릭터가 없습니다"
        elif class_name:
            message = f"{class_name} 직업의 검색된 캐릭터가 없습니다"
        else:
            message = "검색된 캐릭터가 없습니다"

    response = {
        "items": [item.dict() for item in items],
        "generated_at": datetime.now(),
        "type": type,
        "filter_key": filter_key,
        "is_realtime": True,
        "message": message
    }

    cache.setex(cache_key, 120, json.dumps(response, default=str))
    return response

@app.get("/api/rankings/by-server")
def get_rankings_by_server(limit_per_server: int = 3, db: Session = Depends(get_db)):
    """
    Get TOP N characters per server for home page display
    Returns: {"Siel": [{name, power, class, level}...], "Israphel": [...], ...}
    """
    cache_key = f"rank:by_server:{limit_per_server}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)
    
    servers = ["Siel", "Israphel", "Nezakan", "Zikel", "Chantra"]
    result = {}
    
    for server in servers:
        top_chars = db.query(Character).filter(
            Character.server == server
        ).order_by(Character.power.desc()).limit(limit_per_server).all()
        
        result[server] = [
            {
                "name": c.name,
                "server": c.server,
                "class": c.class_name,
                "level": c.level,
                "power": c.power
            } for c in top_chars
        ]
    
    response = {
        "data": result,
        "generated_at": datetime.now()
    }
    
    cache.setex(cache_key, 300, json.dumps(response, default=str))
    return response


@app.get("/api/stats")
def get_statistics(server: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Get overall statistics for the statistics page
    - Server-wise average & median power
    - Class distribution
    - Power distribution (histogram)
    """
    cache_key = f"stats:overview:{server or 'all'}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Base query
    query = db.query(Character)
    if server:
        query = query.filter(Character.server == server)
    
    # Get total sample size
    sample_size = query.count()
    
    if sample_size == 0:
        return {
            "server_avg": [],
            "class_distribution": [],
            "power_distribution": [],
            "sample_size": 0,
            "total_characters": 0,
            "computed_at": datetime.now(),
            "note": "현재 수집된 데이터 기준",
            "message": "아직 수집된 데이터가 없습니다"
        }

    # 1. Server-wise Average & Median Power
    if server:
        # Single server stats
        chars = query.all()
        powers = [c.power for c in chars]
        powers.sort()
        median_power = powers[len(powers) // 2] if powers else 0
        
        server_avg = [{
            "server": server,
            "avg_power": int(db.query(func.avg(Character.power)).filter(Character.server == server).scalar() or 0),
            "median_power": median_power,
            "count": len(chars)
        }]
    else:
        # All servers
        servers = ["Siel", "Israphel", "Nezakan", "Zikel", "Chantra"]
        server_avg = []
        
        for s in servers:
            avg = db.query(func.avg(Character.power)).filter(Character.server == s).scalar()
            count = db.query(func.count(Character.id)).filter(Character.server == s).scalar()
            
            if count and count > 0:
                # Calculate median
                chars = db.query(Character.power).filter(Character.server == s).order_by(Character.power).all()
                powers = [c[0] for c in chars]
                median_power = powers[len(powers) // 2] if powers else 0
                
                server_avg.append({
                    "server": s,
                    "avg_power": int(avg or 0),
                    "median_power": median_power,
                    "count": count
                })

    # 2. Class Distribution
    class_query = db.query(
        Character.class_name,
        func.count(Character.id).label("count")
    )
    if server:
        class_query = class_query.filter(Character.server == server)
    
    class_stats = class_query.group_by(Character.class_name).all()
    
    class_distribution = [
        {"class": cls, "count": cnt, "percentage": round((cnt / sample_size) * 100, 1)}
        for cls, cnt in class_stats
    ]
    class_distribution.sort(key=lambda x: x["count"], reverse=True)

    # 3. Power Distribution (TOP 100, 50k buckets)
    top_query = query.order_by(Character.power.desc()).limit(100)
    top_chars = top_query.all()
    
    power_buckets = {}
    for char in top_chars:
        bucket = (char.power // 50000) * 50000
        bucket_label = f"{bucket:,} - {bucket + 49999:,}"
        power_buckets[bucket_label] = power_buckets.get(bucket_label, 0) + 1

    power_distribution = [
        {"range": k, "count": v} for k, v in sorted(power_buckets.items())
    ]

    # Total count
    total_characters = db.query(func.count(Character.id)).scalar()

    response = {
        "server_avg": server_avg,
        "class_distribution": class_distribution,
        "power_distribution": power_distribution,
        "sample_size": sample_size,
        "total_characters": total_characters,
        "computed_at": datetime.now(),
        "note": "현재 수집된 데이터 기준",
        "server_filter": server or "all"
    }

    # Cache for 5 minutes
    cache.setex(cache_key, 300, json.dumps(response, default=str))
    return response

@app.get("/api/tiers")
def get_tiers(
    server: Optional[str] = None, 
    class_name: Optional[str] = Query(None, alias="class"),
    db: Session = Depends(get_db)
):
    """
    Get tier-based character rankings using percentile distribution
    - S Tier: Top 5%
    - A Tier: Top 15% (5-15%)
    - B Tier: Top 35% (15-35%)
    - C Tier: Remainder (35%+)
    """
    cache_key = f"tiers:{server or 'all'}:{class_name or 'all'}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Build query
    query = db.query(Character)
    if server:
        query = query.filter(Character.server == server)
    if class_name:
        query = query.filter(Character.class_name == class_name)

    # Get all characters sorted by power
    all_chars = query.order_by(Character.power.desc()).all()
    total = len(all_chars)

    if total == 0:
        return {
            "tiers": {"S": [], "A": [], "B": [], "C": []},
            "tier_thresholds": {"S": 0, "A": 0, "B": 0, "C": 0},
            "tier_counts": {"S": 0, "A": 0, "B": 0, "C": 0},
            "sample_size": 0,
            "total_characters": 0,
            "server": server or "all",
            "class": class_name or "all",
            "generated_at": datetime.now(),
            "message": "데이터가 없습니다"
        }

    # Calculate percentile thresholds (S: 5%, A: 15%, B: 35%)
    idx_5 = int(total * 0.05)   # Top 5%
    idx_15 = int(total * 0.15)  # Top 15%
    idx_35 = int(total * 0.35)  # Top 35%

    # Get threshold power values
    threshold_s = all_chars[idx_5].power if idx_5 < total else all_chars[-1].power
    threshold_a = all_chars[idx_15].power if idx_15 < total else all_chars[-1].power
    threshold_b = all_chars[idx_35].power if idx_35 < total else all_chars[-1].power

    # Classify characters into tiers
    tiers = {"S": [], "A": [], "B": [], "C": []}

    for rank, char in enumerate(all_chars, 1):
        char_data = {
            "rank": rank,
            "name": char.name,
            "server": char.server,
            "class": char.class_name,
            "level": char.level,
            "power": char.power
        }

        if rank <= idx_5:
            tiers["S"].append(char_data)
        elif rank <= idx_15:
            tiers["A"].append(char_data)
        elif rank <= idx_35:
            tiers["B"].append(char_data)
        else:
            tiers["C"].append(char_data)

    response = {
        "tiers": tiers,
        "tier_thresholds": {
            "S": threshold_s,
            "A": threshold_a,
            "B": threshold_b,
            "C": 0
        },
        "tier_counts": {
            "S": len(tiers["S"]),
            "A": len(tiers["A"]),
            "B": len(tiers["B"]),
            "C": len(tiers["C"])
        },
        "sample_size": total,
        "total_characters": total,
        "server": server or "all",
        "class": class_name or "all",
        "generated_at": datetime.now()
    }

    # Cache for 3 minutes
    cache.setex(cache_key, 180, json.dumps(response, default=str))
    return response

@app.post("/api/admin/update-server-stats")
def update_server_stats_endpoint(
    server: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    서버 평균 스탯을 업데이트합니다 (관리자용)

    Args:
        server: 특정 서버만 업데이트 (None이면 전체 서버)
    """
    from .server_stats import update_all_server_stats, update_server_average_stats

    try:
        if server:
            update_server_average_stats(db, server)
            return {"status": "success", "message": f"Updated stats for {server}"}
        else:
            update_all_server_stats(db)
            return {"status": "success", "message": "Updated stats for all servers"}
    except Exception as e:
        logger.error(f"Failed to update server stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rankings/power-index")
def get_power_index_rankings(
    server: Optional[str] = None,
    class_name: Optional[str] = Query(None, alias="class"),
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    투력(Power Index) 기반 랭킹 조회

    Args:
        server: 서버 필터
        class_name: 클래스 필터
        page: 페이지 번호
        limit: 페이지당 아이템 수
    """
    filter_key = f"power_index:{server or 'all'}:{class_name or 'all'}:page:{page}:limit:{limit}"
    cache_key = f"rank:{filter_key}"

    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # 쿼리 빌드
    query = db.query(Character).filter(Character.power_score.isnot(None))

    if server:
        query = query.filter(Character.server == server)
    if class_name:
        query = query.filter(Character.class_name == class_name)

    # 투력 기준 정렬
    query = query.order_by(Character.power_score.desc())

    results = query.offset((page-1)*limit).limit(limit).all()

    items = [
        {
            "rank": (page-1)*limit + i + 1,
            "name": c.name,
            "server": c.server,
            "class": c.class_name,
            "level": c.level,
            "power": c.power,
            "power_index": c.power_score,
            "tier_rank": c.power_rank,
            "percentile": c.percentile,
        } for i, c in enumerate(results)
    ]

    response = {
        "items": items,
        "generated_at": datetime.now(),
        "type": "power_index",
        "filter_key": filter_key,
        "is_realtime": True,
    }

    cache.setex(cache_key, 120, json.dumps(response, default=str))
    return response


@app.get("/api/servers/compare")
def compare_servers(db: Session = Depends(get_db)):
    """
    Compare servers across multiple metrics:
    - Average power per server
    - Top ranker distribution (TOP 100, TOP 500)
    - Server activity (based on search count)
    """
    cache_key = "servers:compare"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # 1. Server-wise average power and character count
    server_stats = db.query(
        Character.server,
        func.avg(Character.power).label('avg_power'),
        func.max(Character.power).label('max_power'),
        func.count(Character.id).label('count')
    ).group_by(Character.server).all()

    server_data = {}
    for s in server_stats:
        server_data[s.server] = {
            "server": s.server,
            "avg_power": round(s.avg_power, 2) if s.avg_power else 0,
            "max_power": s.max_power or 0,
            "total_characters": s.count
        }

    # 2. Top ranker distribution (TOP 100, TOP 500)
    top_100 = db.query(Character).order_by(Character.power.desc()).limit(100).all()
    top_500 = db.query(Character).order_by(Character.power.desc()).limit(500).all()

    for server in server_data.keys():
        server_data[server]["top_100_count"] = sum(1 for c in top_100 if c.server == server)
        server_data[server]["top_500_count"] = sum(1 for c in top_500 if c.server == server)

    # 3. Server activity (based on search logs)
    search_stats = db.query(SearchLog.keyword, SearchLog.count).all()
    server_search_count = {}
    for keyword, count in search_stats:
        # keyword format: "server:name"
        if ':' in keyword:
            server = keyword.split(':')[0]
            server_search_count[server] = server_search_count.get(server, 0) + count

    for server in server_data.keys():
        server_data[server]["search_count"] = server_search_count.get(server, 0)

    response = {
        "servers": list(server_data.values()),
        "generated_at": datetime.now()
    }

    # Cache for 5 minutes
    cache.setex(cache_key, 300, json.dumps(response, default=str))
    return response


# ============================================================================
# New MVP Endpoints (검색 기반 데이터 누적)
# ============================================================================

from .new_endpoints import (
    post_search,
    get_character,
    get_ranking_top,
    get_ranking_paginated,
    get_updates
)

@app.post("/api/search", response_model=SearchResponse)
def search_endpoint(request: SearchRequest, db: Session = Depends(get_db)):
    """캐릭터 검색 및 데이터 수집"""
    return post_search(request, db)

@app.get("/api/character", response_model=SearchResponse)
def character_detail(server: str, name: str, db: Session = Depends(get_db)):
    """캐릭터 상세 조회"""
    return get_character(server, name, db)

@app.get("/api/ranking/top")
def ranking_top(server: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """TOP N 랭킹"""
    return get_ranking_top(server, limit, db)

@app.get("/api/ranking")
def ranking_paginated(
    server: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """페이지네이션 랭킹"""
    return get_ranking_paginated(server, page, page_size, db)

@app.get("/api/updates")
def updates_list(limit: int = 10, db: Session = Depends(get_db)):
    """업데이트 로그"""
    return get_updates(limit, db)


@app.post("/api/admin/generate-dummy-data")
def generate_dummy_data(count: int = 50, db: Session = Depends(get_db)):
    """
    더미 데이터 생성 (개발/테스트용)

    Args:
        count: 생성할 캐릭터 수 (기본: 50)
    """
    import random

    servers = ["Siel", "Israphel", "Nezakan", "Zikel", "Chantra"]
    classes = ["검성", "궁성", "마도성", "호법성", "살성", "창성", "치유성"]

    # 한글 이름 생성을 위한 음절 리스트
    first_chars = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "오", "한", "신", "서", "권", "황"]
    middle_chars = ["민", "서", "예", "지", "하", "도", "우", "승", "현", "준", "영", "수", "동", "재", "성"]
    last_chars = ["준", "서", "우", "진", "호", "민", "성", "재", "혁", "영", "훈", "석", "원", "현", "수"]

    created_characters = []

    try:
        for i in range(count):
            # 랜덤 캐릭터 이름 생성
            name = random.choice(first_chars) + random.choice(middle_chars) + random.choice(last_chars)
            # 중복 방지를 위해 숫자 추가
            name = f"{name}{random.randint(1, 999)}"

            server = random.choice(servers)
            class_name = random.choice(classes)
            level = random.randint(50, 80)

            # 레벨에 따른 파워 범위 설정
            base_power = level * 10000
            power = base_power + random.randint(-30000, 100000)
            power = max(100000, power)  # 최소값 보장

            # 스탯 생성
            stats_payload = {
                "attack": random.randint(15000, 35000),
                "damage_amp": random.randint(5000, 15000),
                "crit_rate": random.randint(3000, 8000),
                "crit_damage": random.randint(10000, 25000),
                "attack_speed": random.randint(2000, 5000),
                "defense": random.randint(8000, 20000),
                "damage_reduction": random.randint(3000, 10000),
                "hp": random.randint(80000, 200000)
            }

            # 기존 캐릭터 확인
            existing_char = db.query(Character).filter(
                Character.server == server,
                Character.name == name
            ).first()

            if existing_char:
                # 이미 존재하면 업데이트
                existing_char.class_name = class_name
                existing_char.level = level
                existing_char.power = power
                existing_char.stats_payload = stats_payload
                existing_char.updated_at = datetime.now()
                existing_char.last_fetched_at = datetime.now()
                existing_char.is_dummy = True
                char = existing_char
            else:
                # 새로 생성
                char = Character(
                    server=server,
                    name=name,
                    class_name=class_name,
                    level=level,
                    power=power,
                    stats_payload=stats_payload,
                    last_fetched_at=datetime.now(),
                    updated_at=datetime.now(),
                    is_dummy=True
                )
                db.add(char)

            db.commit()
            db.refresh(char)

            created_characters.append({
                "name": char.name,
                "server": char.server,
                "class": char.class_name,
                "level": char.level,
                "power": char.power
            })

        logger.info(f"Successfully generated {len(created_characters)} dummy characters")

        return {
            "status": "success",
            "message": f"Generated {count} dummy characters",
            "characters": [c["name"] for c in created_characters[:10]]  # Show first 10
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to generate dummy data: {e}")
        raise HTTPException(status_code=500, detail=f"더미 데이터 생성 실패: {str(e)}")

@app.delete("/api/admin/delete-dummy-data")
def delete_dummy_data(db: Session = Depends(get_db)):
    """
    더미 데이터 삭제 (개발/테스트용)

    is_dummy=True로 표시된 캐릭터만 삭제합니다.
    """
    try:
        # 더미 데이터만 조회
        dummy_chars = db.query(Character).filter(Character.is_dummy == True).all()
        count = len(dummy_chars)

        if count == 0:
            return {
                "status": "success",
                "message": "삭제할 더미 데이터가 없습니다.",
                "deleted_count": 0
            }

        # 더미 데이터 삭제
        db.query(Character).filter(Character.is_dummy == True).delete()
        db.commit()

        logger.info(f"Successfully deleted {count} dummy characters")

        return {
            "status": "success",
            "message": f"{count}개의 더미 캐릭터를 삭제했습니다.",
            "deleted_count": count
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete dummy data: {e}")
        raise HTTPException(status_code=500, detail=f"더미 데이터 삭제 실패: {str(e)}")

# ============================================================================
# Development / Testing Endpoints
# ============================================================================

@app.get("/api/dev/test-fetch")
def test_fetch_character(
    server: str = "Siel",
    name: str = "테스트",
    db: Session = Depends(get_db)
):
    """
    개발용 엔드포인트: 한 개의 캐릭터 데이터만 수집하여 테스트
    
    Args:
        server: 서버 이름 (기본값: Siel)
        name: 캐릭터 이름
        
    Returns:
        실제 adapter를 통해 수집된 캐릭터 데이터와 메타 정보
    """
    logger.info(f"[DEV] Testing character fetch: {server}:{name}")
    
    result = {
        "test_info": {
            "server": server,
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "adapter_type": os.getenv("SOURCE_ADAPTER_TYPE", "dummy")
        },
        "character_data": None,
        "error": None,
        "db_saved": False
    }
    
    try:
        # 1. adapter로 데이터 수집
        logger.info(f"[DEV] Calling adapter.get_character({server}, {name})")
        character_dto = adapter.get_character(server, name)
        
        result["character_data"] = {
            "name": character_dto.name,
            "server": character_dto.server,
            "class_name": character_dto.class_name,
            "level": character_dto.level,
            "power": character_dto.power,
            "updated_at": character_dto.updated_at.isoformat(),
            "stats_json": character_dto.stats_json if hasattr(character_dto, 'stats_json') else None,
            "character_image_url": character_dto.character_image_url,
            "equipment_data": character_dto.equipment_data,
            "raw_payload": character_dto.raw_payload if hasattr(character_dto, 'raw_payload') else None,
            "stats_payload": character_dto.stats_payload if hasattr(character_dto, 'stats_payload') else None
        }
        
        logger.info(f"[DEV] ✓ Successfully fetched character: {character_dto.name}")
        
        # 2. DB에 저장 (선택적)
        try:
            char = db.query(Character).filter(
                Character.server == server,
                Character.name == name
            ).first()
            
            if not char:
                char = Character(server=server, name=name)
                db.add(char)
            
            char.class_name = character_dto.class_name
            char.level = character_dto.level
            char.power = character_dto.power
            char.updated_at = character_dto.updated_at
            
            # Update new fields
            if character_dto.character_image_url:
                char.character_image_url = character_dto.character_image_url
            if character_dto.equipment_data:
                char.equipment_data = character_dto.equipment_data
            
            # char.last_seen_at = datetime.now() # Removed: Field does not exist in model
            
            db.commit()
            result["db_saved"] = True
            logger.info(f"[DEV] ✓ Saved to database: {char.id}")
            
            # 스탯도 저장
            if hasattr(character_dto, 'stats_json') and character_dto.stats_json:
                stat = CharacterStat(
                    character_id=char.id,
                    stats_json=character_dto.stats_json
                )
                db.add(stat)
                db.commit()
                logger.info(f"[DEV] ✓ Saved stats to database")
                
        except Exception as db_error:
            logger.warning(f"[DEV] ⚠ DB save failed: {db_error}")
            result["db_error"] = str(db_error)
        
    except Exception as e:
        result["error"] = {
            "type": type(e).__name__,
            "message": str(e)
        }
        logger.error(f"[DEV] ✗ Fetch failed: {e}", exc_info=True)
    
    return result
