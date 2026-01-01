"""
AION2 MVP Batch Worker - Power Calculation & Ranking Snapshots

배치 작업:
1. power_score 계산 (10분마다)
   - characters 테이블에서 stats_payload 조회
   - 서버별 평균 스탯 계산
   - 정규화 비율 계산 및 가중치 적용
   - power_score, power_rank, percentile, last_scored_at 업데이트

2. 랭킹 스냅샷 생성 (10분마다, power_score 계산 후)
   - power_score 기준 정렬
   - rank_list (전체), top_list (TOP 100) 생성
   - ranking_snapshots 테이블에 저장
"""
from celery import Celery
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Dict, List, Tuple
import os

from .database import SessionLocal
from .models import Character, RankSnapshot
from .power_calculator import calculate_power_index
from .rank_calculator import calculate_percentile, get_tier_rank

logger = get_task_logger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

# 최소 샘플 크기
MIN_SAMPLE_SIZE = 10


@celery.task(bind=True, max_retries=3)
def calculate_power_and_rank_batch(self):
    """
    배치 작업: 투력 점수 및 랭크 계산

    주기: 10분마다 실행

    동작:
    1. characters 테이블에서 stats_payload가 있는 캐릭터 조회
    2. 서버별 평균 스탯 계산
    3. 각 캐릭터의 power_score 계산
    4. 서버별 퍼센타일 및 power_rank 산정
    5. last_scored_at 업데이트
    6. 랭킹 스냅샷 생성
    """
    db = SessionLocal()
    try:
        logger.info("Starting power/rank batch calculation")

        # stats_payload가 있는 캐릭터 조회
        characters = db.query(Character).filter(
            Character.stats_payload.isnot(None)
        ).all()

        if not characters:
            logger.warning("No characters with stats_payload found")
            return {"status": "no_data", "processed": 0}

        logger.info(f"Processing {len(characters)} characters")

        # 서버별 그룹화
        servers = {}
        for char in characters:
            if char.server not in servers:
                servers[char.server] = []
            servers[char.server].append(char)

        processed_count = 0
        failed_count = 0

        # 각 서버별 처리
        for server, server_chars in servers.items():
            try:
                processed, failed = _process_server_batch(db, server, server_chars)
                processed_count += processed
                failed_count += failed
                logger.info(f"Server {server}: processed={processed}, failed={failed}")
            except Exception as e:
                logger.error(f"Failed to process server {server}: {str(e)}")
                failed_count += len(server_chars)

        db.commit()

        # 랭킹 스냅샷 생성
        _generate_all_snapshots(db)
        db.commit()

        result = {
            "status": "success",
            "processed": processed_count,
            "failed": failed_count,
            "servers": len(servers),
            "timestamp": datetime.now().isoformat()
        }

        logger.info(f"Batch complete: {result}")
        return result

    except Exception as exc:
        logger.error(f"Batch failed: {str(exc)}")
        db.rollback()
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    finally:
        db.close()


def _process_server_batch(
    db: Session,
    server: str,
    characters: List[Character]
) -> Tuple[int, int]:
    """
    서버별 캐릭터 배치 처리

    Returns:
        (processed_count, failed_count)
    """
    processed = 0
    failed = 0

    # 1. 서버 평균 스탯 계산
    server_avg = _calculate_server_average_stats(characters)

    if not server_avg:
        logger.warning(f"Failed to calculate server average for {server}")
        return 0, len(characters)

    logger.info(
        f"Server {server} avg stats: "
        f"attack={server_avg.get('avg_attack')}, "
        f"hp={server_avg.get('avg_hp')}"
    )

    # 2. 각 캐릭터의 power_score 계산
    power_scores = []
    char_power_map = {}  # {character_id: power_score}

    for char in characters:
        try:
            if not char.stats_payload:
                continue

            # power_score 계산
            power_score, _ = calculate_power_index(char.stats_payload, server_avg)

            # DB에 저장
            char.power_score = power_score
            char.last_scored_at = datetime.now()

            power_scores.append(power_score)
            char_power_map[char.id] = power_score

        except Exception as e:
            logger.error(
                f"Failed to calculate power for {char.server}:{char.name}: {str(e)}"
            )
            failed += 1
            continue

    # 3. 퍼센타일 및 랭크 계산
    if len(power_scores) < MIN_SAMPLE_SIZE:
        logger.warning(
            f"Server {server} has only {len(power_scores)} characters - "
            f"using relaxed ranking"
        )
        _apply_relaxed_ranking(characters, char_power_map)
        processed = len(power_scores)
    else:
        # 정상 퍼센타일 계산
        for char in characters:
            if char.id not in char_power_map:
                continue

            try:
                power_score = char_power_map[char.id]

                # 퍼센타일 계산 (같은 서버 내에서)
                server_power_list = [
                    char_power_map[c.id]
                    for c in characters
                    if c.id in char_power_map
                ]

                percentile = calculate_percentile(power_score, server_power_list)

                # 랭크 산정 (D1~S5)
                tier_rank = get_tier_rank(percentile, power_score)

                # DB 업데이트
                char.percentile = int(percentile)
                char.power_rank = tier_rank

                processed += 1

            except Exception as e:
                logger.error(
                    f"Failed to calculate rank for {char.server}:{char.name}: {str(e)}"
                )
                failed += 1

    return processed, failed


def _calculate_server_average_stats(characters: List[Character]) -> Dict[str, int]:
    """
    서버 평균 스탯 계산 (stats_payload 기반)

    Returns:
        평균 스탯 딕셔너리
    """
    stats_list = []

    for char in characters:
        if char.stats_payload:
            stats_list.append(char.stats_payload)

    if not stats_list:
        return {}

    sample_size = len(stats_list)

    # 각 스탯의 평균 계산
    avg_stats = {
        "avg_attack": sum(s.get("attack", 0) for s in stats_list) // sample_size,
        "avg_damage_amp": sum(s.get("damage_amp", 0) for s in stats_list) // sample_size,
        "avg_crit_rate": sum(s.get("crit_rate", 0) for s in stats_list) // sample_size,
        "avg_crit_damage": sum(s.get("crit_damage", 0) for s in stats_list) // sample_size,
        "avg_attack_speed": sum(s.get("attack_speed", 0) for s in stats_list) // sample_size,
        "avg_defense": sum(s.get("defense", 0) for s in stats_list) // sample_size,
        "avg_damage_reduction": sum(s.get("damage_reduction", 0) for s in stats_list) // sample_size,
        "avg_hp": sum(s.get("hp", 0) for s in stats_list) // sample_size,
    }

    return avg_stats


def _apply_relaxed_ranking(characters: List[Character], char_power_map: Dict[int, int]):
    """
    샘플이 적은 서버의 간이 랭킹 산정
    """
    # power_score 기준 정렬
    sorted_chars = sorted(
        [(c, char_power_map[c.id]) for c in characters if c.id in char_power_map],
        key=lambda x: x[1],
        reverse=True
    )

    total = len(sorted_chars)

    for idx, (char, power_score) in enumerate(sorted_chars):
        percentile = (idx / total) * 100 if total > 0 else 50.0

        # 간단한 티어 배정
        if percentile < 25:
            tier = 'S' if percentile < 5 else 'A'
        elif percentile < 50:
            tier = 'B'
        elif percentile < 75:
            tier = 'C'
        else:
            tier = 'D'

        # 서브 티어 (1-5)
        sub_tier = min(5, max(1, int(((percentile % 25) / 25) * 5) + 1))

        char.power_rank = f"{tier}{sub_tier}"
        char.percentile = int(percentile)


def _generate_all_snapshots(db: Session):
    """
    모든 서버의 랭킹 스냅샷 생성
    """
    servers = ["Siel", "Israphel", "Nezakan", "Zikel", "Chantra"]

    # 서버별 스냅샷
    for server in servers:
        try:
            _generate_snapshot(db, server)
        except Exception as e:
            logger.error(f"Failed to generate snapshot for {server}: {str(e)}")

    # 전체 통합 스냅샷
    try:
        _generate_snapshot(db, None)
    except Exception as e:
        logger.error(f"Failed to generate global snapshot: {str(e)}")


def _generate_snapshot(db: Session, server: str = None):
    """
    특정 서버(또는 전체)의 랭킹 스냅샷 생성

    Args:
        server: 서버명 (None이면 전체)
    """
    query = db.query(Character).filter(
        Character.power_score.isnot(None)
    )

    if server:
        query = query.filter(Character.server == server)

    # power_score 기준 내림차순 정렬
    all_chars = query.order_by(Character.power_score.desc()).all()

    if not all_chars:
        logger.warning(f"No characters for snapshot: {server or 'all'}")
        return

    # rank_list (전체 리스트)
    rank_list = []
    for i, char in enumerate(all_chars):
        rank_list.append({
            "rank": i + 1,
            "name": char.name,
            "server": char.server,
            "class": char.class_name,
            "level": char.level,
            "power": char.power,
            "power_score": char.power_score,
            "power_rank": char.power_rank
        })

    # top_list (TOP 100)
    top_list = rank_list[:100]

    # 기존 스냅샷 삭제
    db.query(RankSnapshot).filter(
        RankSnapshot.server == (server or "all")
    ).delete()

    # 새 스냅샷 생성
    snapshot = RankSnapshot(
        server=server or "all",
        generated_at=datetime.now(),
        rank_list=rank_list,
        top_list=top_list
    )

    db.add(snapshot)

    logger.info(
        f"Generated snapshot for {server or 'all'}: "
        f"{len(rank_list)} total, {len(top_list)} top"
    )


# Celery Beat 스케줄 설정
celery.conf.beat_schedule = {
    "calculate-power-rank-every-10-min": {
        "task": "app.worker.calculate_power_and_rank_batch",
        "schedule": 600.0,  # 10분 (600초)
    },
}

# Use default celery queue
# celery.conf.task_routes = {
#     "app.worker.calculate_power_and_rank_batch": {"queue": "batch"},
# }

# 재시도 설정
celery.conf.task_acks_late = True
celery.conf.task_reject_on_worker_lost = True
celery.conf.timezone = "UTC"
