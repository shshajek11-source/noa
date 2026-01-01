"""
New API Endpoints for MVP Backend

POST /api/search - 캐릭터 검색 및 데이터 수집
GET /api/character - 캐릭터 상세 조회
GET /api/ranking/top - TOP N 랭킹
GET /api/ranking - 페이지네이션 랭킹
GET /api/updates - 업데이트 로그
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import logging
import os

from .database import get_db
from .models import Character, RankSnapshot
from .schemas import SearchRequest, SearchResponse
from .adapter import adapter

logger = logging.getLogger(__name__)

# 쿨타임 설정 (초 단위)
FETCH_COOLDOWN = int(os.getenv("FETCH_COOLDOWN_SECONDS", "60"))  # 60~180초 권장


def post_search(request: SearchRequest, db: Session = Depends(get_db)):
    """
    POST /api/search

    캐릭터 검색 및 데이터 수집
    - 외부 데이터 수집 시도
    - DB Upsert
    - 쿨타임 체크
    - 실패 시 기존 데이터 반환
    """
    server = request.server
    name = request.name

    # 1. DB에서 기존 데이터 조회
    char = db.query(Character).filter(
        Character.server == server,
        Character.name == name
    ).first()

    # 2. 쿨타임 체크
    fetch_status = "success"
    should_fetch = True

    if char and char.last_fetched_at:
        time_since_fetch = (datetime.now() - char.last_fetched_at.replace(tzinfo=None)).total_seconds()

        if time_since_fetch < FETCH_COOLDOWN:
            should_fetch = False
            fetch_status = "cached"
            logger.info(
                f"Cooldown active for {server}:{name} "
                f"({int(time_since_fetch)}s < {FETCH_COOLDOWN}s)"
            )

    # 3. 외부 데이터 수집 시도 (쿨타임 통과 시)
    if should_fetch:
        try:
            logger.info(f"Fetching data for {server}:{name}")
            data = adapter.get_character(server, name)

            # 4. DB Upsert
            if not char:
                char = Character(server=server, name=name)
                db.add(char)

            # 기본 정보 업데이트
            char.class_name = data.class_name
            char.level = data.level
            char.power = data.power
            char.raw_payload = data.raw_payload
            char.stats_payload = data.stats_payload
            char.last_fetched_at = datetime.now()
            char.updated_at = datetime.now()

            # 투력/랭크는 배치에서 계산 (여기서는 NULL 유지)
            # char.power_score = None  (이미 NULL)
            # char.power_rank = None

            db.commit()
            db.refresh(char)

            fetch_status = "success"
            logger.info(f"Successfully fetched and saved: {server}:{name}")

        except Exception as e:
            logger.error(f"Failed to fetch {server}:{name}: {e}")
            fetch_status = "failed"

            # 수집 실패 시: 기존 데이터가 있으면 그대로 반환
            if not char:
                raise HTTPException(
                    status_code=404,
                    detail=f"Character not found and fetch failed: {str(e)}"
                )

            # 기존 데이터 반환 (서비스 중단 금지)
            logger.info(f"Returning cached data after fetch failure: {server}:{name}")

    # 5. 응답 반환
    return SearchResponse(
        id=char.id,
        name=char.name,
        server=char.server,
        class_name=char.class_name,
        level=char.level,
        power=char.power,
        power_score=char.power_score,
        power_rank=char.power_rank,
        percentile=char.percentile,
        last_fetched_at=char.last_fetched_at,
        last_scored_at=char.last_scored_at,
        stats_payload=char.stats_payload,
        fetch_status=fetch_status
    )


def get_character(server: str, name: str, db: Session = Depends(get_db)):
    """
    GET /api/character?server=&name=

    캐릭터 상세 조회 (DB 저장된 데이터만 반환)
    """
    char = db.query(Character).filter(
        Character.server == server,
        Character.name == name
    ).first()

    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    return SearchResponse(
        id=char.id,
        name=char.name,
        server=char.server,
        class_name=char.class_name,
        level=char.level,
        power=char.power,
        power_score=char.power_score,
        power_rank=char.power_rank,
        percentile=char.percentile,
        last_fetched_at=char.last_fetched_at,
        last_scored_at=char.last_scored_at,
        stats_payload=char.stats_payload,
        fetch_status="cached"
    )


def get_ranking_top(server: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """
    GET /api/ranking/top?server=&limit=

    TOP N 랭킹 조회 (ranking_snapshots의 top_list 사용)
    """
    # 최신 스냅샷 조회
    query = db.query(RankSnapshot)

    if server:
        query = query.filter(RankSnapshot.server == server)

    snapshot = query.order_by(RankSnapshot.generated_at.desc()).first()

    if not snapshot or not snapshot.top_list:
        # 스냅샷 없으면 실시간 조회 (fallback)
        query = db.query(Character)
        if server:
            query = query.filter(Character.server == server)

        top_chars = query.order_by(Character.power.desc()).limit(limit).all()

        return {
            "items": [
                {
                    "rank": i + 1,
                    "name": c.name,
                    "server": c.server,
                    "class": c.class_name,
                    "level": c.level,
                    "power": c.power,
                    "power_score": c.power_score,
                    "power_rank": c.power_rank
                }
                for i, c in enumerate(top_chars)
            ],
            "generated_at": datetime.now(),
            "is_snapshot": False,
            "total": len(top_chars)
        }

    # 스냅샷 데이터 반환
    items = snapshot.top_list[:limit] if isinstance(snapshot.top_list, list) else []

    return {
        "items": items,
        "generated_at": snapshot.generated_at,
        "is_snapshot": True,
        "total": len(items)
    }


def get_ranking_paginated(
    server: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    GET /api/ranking?server=&page=&pageSize=

    페이지네이션 랭킹 조회 (ranking_snapshots의 rank_list 사용)
    """
    # 최신 스냅샷 조회
    query = db.query(RankSnapshot)

    if server:
        query = query.filter(RankSnapshot.server == server)

    snapshot = query.order_by(RankSnapshot.generated_at.desc()).first()

    if not snapshot or not snapshot.rank_list:
        # 스냅샷 없으면 실시간 조회 (fallback)
        query = db.query(Character)
        if server:
            query = query.filter(Character.server == server)

        offset = (page - 1) * page_size
        chars = query.order_by(Character.power.desc()).offset(offset).limit(page_size).all()
        total = query.count()

        return {
            "items": [
                {
                    "rank": offset + i + 1,
                    "name": c.name,
                    "server": c.server,
                    "class": c.class_name,
                    "level": c.level,
                    "power": c.power,
                    "power_score": c.power_score,
                    "power_rank": c.power_rank
                }
                for i, c in enumerate(chars)
            ],
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "generated_at": datetime.now(),
            "is_snapshot": False
        }

    # 스냅샷 데이터에서 페이지네이션
    rank_list = snapshot.rank_list if isinstance(snapshot.rank_list, list) else []
    total = len(rank_list)
    offset = (page - 1) * page_size
    items = rank_list[offset:offset + page_size]

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
        "generated_at": snapshot.generated_at,
        "is_snapshot": True
    }


def get_updates(limit: int = 10, db: Session = Depends(get_db)):
    """
    GET /api/updates

    최근 업데이트 로그 반환
    """
    recent_updates = db.query(Character).order_by(
        Character.updated_at.desc()
    ).limit(limit).all()

    return {
        "updates": [
            {
                "character_name": c.name,
                "server": c.server,
                "class": c.class_name,
                "level": c.level,
                "power": c.power,
                "updated_at": c.updated_at,
                "last_fetched_at": c.last_fetched_at
            }
            for c in recent_updates
        ],
        "total": len(recent_updates)
    }
