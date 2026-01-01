"""
서버 평균 스탯 관리 모듈

서버별 캐릭터 스탯 평균을 계산하고 업데이트합니다.
투력 계산 시 정규화 기준으로 사용됩니다.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Optional
import logging

from .models import Character, CharacterStat, ServerAverageStats

logger = logging.getLogger(__name__)


def get_server_average_stats(db: Session, server: str) -> Dict[str, int]:
    """
    서버별 평균 스탯을 조회합니다.

    Args:
        db: 데이터베이스 세션
        server: 서버명

    Returns:
        평균 스탯 딕셔너리
    """
    server_stats = db.query(ServerAverageStats).filter(
        ServerAverageStats.server == server
    ).first()

    if server_stats:
        return {
            "avg_attack": server_stats.avg_attack,
            "avg_damage_amp": server_stats.avg_damage_amp,
            "avg_crit_rate": server_stats.avg_crit_rate,
            "avg_crit_damage": server_stats.avg_crit_damage,
            "avg_attack_speed": server_stats.avg_attack_speed,
            "avg_defense": server_stats.avg_defense,
            "avg_damage_reduction": server_stats.avg_damage_reduction,
            "avg_hp": server_stats.avg_hp,
        }

    # 서버 평균 데이터가 없으면 전체 평균으로 fallback
    logger.warning(f"No server average stats for {server}, using global average")
    return get_global_average_stats(db)


def get_global_average_stats(db: Session) -> Dict[str, int]:
    """
    전체 서버 평균 스탯을 조회합니다 (fallback용).

    Args:
        db: 데이터베이스 세션

    Returns:
        전체 평균 스탯 딕셔너리
    """
    # 전체 서버의 평균 계산
    all_servers = db.query(ServerAverageStats).all()

    if not all_servers:
        # 데이터가 전혀 없는 경우 기본값 반환
        logger.warning("No server stats available, using default values")
        return {
            "avg_attack": 500,
            "avg_damage_amp": 100,
            "avg_crit_rate": 50,
            "avg_crit_damage": 200,
            "avg_attack_speed": 100,
            "avg_defense": 500,
            "avg_damage_reduction": 50,
            "avg_hp": 10000,
        }

    # 전체 서버 평균 계산 (샘플 크기 가중 평균)
    total_sample = sum(s.sample_size for s in all_servers)

    if total_sample == 0:
        # 샘플이 없는 경우 기본값
        return {
            "avg_attack": 500,
            "avg_damage_amp": 100,
            "avg_crit_rate": 50,
            "avg_crit_damage": 200,
            "avg_attack_speed": 100,
            "avg_defense": 500,
            "avg_damage_reduction": 50,
            "avg_hp": 10000,
        }

    weighted_avg = {
        "avg_attack": sum(s.avg_attack * s.sample_size for s in all_servers) // total_sample,
        "avg_damage_amp": sum(s.avg_damage_amp * s.sample_size for s in all_servers) // total_sample,
        "avg_crit_rate": sum(s.avg_crit_rate * s.sample_size for s in all_servers) // total_sample,
        "avg_crit_damage": sum(s.avg_crit_damage * s.sample_size for s in all_servers) // total_sample,
        "avg_attack_speed": sum(s.avg_attack_speed * s.sample_size for s in all_servers) // total_sample,
        "avg_defense": sum(s.avg_defense * s.sample_size for s in all_servers) // total_sample,
        "avg_damage_reduction": sum(s.avg_damage_reduction * s.sample_size for s in all_servers) // total_sample,
        "avg_hp": sum(s.avg_hp * s.sample_size for s in all_servers) // total_sample,
    }

    return weighted_avg


def update_server_average_stats(db: Session, server: str) -> None:
    """
    특정 서버의 평균 스탯을 재계산하고 업데이트합니다.

    Args:
        db: 데이터베이스 세션
        server: 서버명
    """
    # 해당 서버의 모든 캐릭터 조회
    characters = db.query(Character).filter(Character.server == server).all()

    if not characters:
        logger.warning(f"No characters found for server: {server}")
        return

    # 각 캐릭터의 최신 스탯 수집
    stats_list = []
    for char in characters:
        if char.stats:
            # 최신 스탯 가져오기
            latest_stat = char.stats[0]
            stats_json = latest_stat.stats_json
            stats_list.append(stats_json)

    if not stats_list:
        logger.warning(f"No stats data found for server: {server}")
        return

    # 평균 계산
    sample_size = len(stats_list)

    avg_attack = sum(s.get("attack", 0) for s in stats_list) // sample_size
    avg_damage_amp = sum(s.get("damage_amp", 0) for s in stats_list) // sample_size
    avg_crit_rate = sum(s.get("crit_rate", 0) for s in stats_list) // sample_size
    avg_crit_damage = sum(s.get("crit_damage", 0) for s in stats_list) // sample_size
    avg_attack_speed = sum(s.get("attack_speed", 0) for s in stats_list) // sample_size
    avg_defense = sum(s.get("defense", 0) for s in stats_list) // sample_size
    avg_damage_reduction = sum(s.get("damage_reduction", 0) for s in stats_list) // sample_size
    avg_hp = sum(s.get("hp", 0) for s in stats_list) // sample_size

    # DB 업데이트 또는 생성
    server_stats = db.query(ServerAverageStats).filter(
        ServerAverageStats.server == server
    ).first()

    if server_stats:
        # 업데이트
        server_stats.avg_attack = avg_attack
        server_stats.avg_damage_amp = avg_damage_amp
        server_stats.avg_crit_rate = avg_crit_rate
        server_stats.avg_crit_damage = avg_crit_damage
        server_stats.avg_attack_speed = avg_attack_speed
        server_stats.avg_defense = avg_defense
        server_stats.avg_damage_reduction = avg_damage_reduction
        server_stats.avg_hp = avg_hp
        server_stats.sample_size = sample_size
    else:
        # 생성
        server_stats = ServerAverageStats(
            server=server,
            avg_attack=avg_attack,
            avg_damage_amp=avg_damage_amp,
            avg_crit_rate=avg_crit_rate,
            avg_crit_damage=avg_crit_damage,
            avg_attack_speed=avg_attack_speed,
            avg_defense=avg_defense,
            avg_damage_reduction=avg_damage_reduction,
            avg_hp=avg_hp,
            sample_size=sample_size,
        )
        db.add(server_stats)

    db.commit()

    logger.info(
        f"Updated server average stats for {server}: "
        f"sample_size={sample_size}, avg_attack={avg_attack}, avg_hp={avg_hp}"
    )


def update_all_server_stats(db: Session) -> None:
    """
    모든 서버의 평균 스탯을 재계산합니다.

    Args:
        db: 데이터베이스 세션
    """
    servers = ["Siel", "Israphel", "Nezakan", "Zikel", "Chantra"]

    for server in servers:
        try:
            update_server_average_stats(db, server)
        except Exception as e:
            logger.error(f"Failed to update stats for server {server}: {e}")
