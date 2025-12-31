"""
투력(Power Index) 계산 모듈

AION2 캐릭터의 스탯을 기반으로 사이트 고유 투력 지표를 계산합니다.

계산 과정:
1. 각 스탯을 서버 평균 대비 ratio로 정규화
2. 가중치 적용
3. 최종 투력 점수 산출 (기준값: 1000)
"""

from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


# 가중치 설정 (attack.md 요구사항 기준)
WEIGHTS = {
    "attack": 0.30,
    "damage_amp": 0.20,
    "crit": 0.30,  # 치명 확률 + 치명 피해 합산
    "attack_speed": 0.10,
    "survive": 0.10,  # 생존 스탯 (방어 + 피해 감소 + 체력)
}


def extract_stats_from_json(stats_json: Dict) -> Dict[str, int]:
    """
    stats_json에서 필요한 스탯을 추출합니다.

    Args:
        stats_json: 캐릭터 스탯 JSON 데이터

    Returns:
        추출된 스탯 딕셔너리 (존재하지 않는 스탯은 0으로 설정)
    """
    return {
        "attack": stats_json.get("attack", 0),
        "damage_amp": stats_json.get("damage_amp", 0),
        "crit_rate": stats_json.get("crit_rate", 0),
        "crit_damage": stats_json.get("crit_damage", 0),
        "attack_speed": stats_json.get("attack_speed", 0),
        "defense": stats_json.get("defense", 0),
        "damage_reduction": stats_json.get("damage_reduction", 0),
        "hp": stats_json.get("hp", 0),
    }


def normalize_stat(stat_value: int, avg_value: int) -> float:
    """
    스탯을 서버 평균 대비 비율로 정규화합니다.

    Args:
        stat_value: 캐릭터 스탯 값
        avg_value: 서버 평균 스탯 값

    Returns:
        정규화된 비율 (ratio)
    """
    if avg_value == 0:
        # 평균이 0인 경우 (데이터 부족) -> 기준값 1.0 반환
        return 1.0

    return stat_value / avg_value


def calculate_crit_score(crit_rate: int, crit_damage: int,
                        avg_crit_rate: int, avg_crit_damage: int) -> float:
    """
    치명 관련 스탯을 복합적으로 평가합니다.

    치명타는 확률과 피해량 모두 중요하므로 두 지표를 결합합니다.

    Args:
        crit_rate: 캐릭터 치명 확률
        crit_damage: 캐릭터 치명 피해
        avg_crit_rate: 서버 평균 치명 확률
        avg_crit_damage: 서버 평균 치명 피해

    Returns:
        치명 종합 점수 (ratio)
    """
    crit_rate_ratio = normalize_stat(crit_rate, avg_crit_rate)
    crit_damage_ratio = normalize_stat(crit_damage, avg_crit_damage)

    # 치명 확률과 피해의 평균 (동등 비중)
    return (crit_rate_ratio + crit_damage_ratio) / 2.0


def calculate_survive_score(defense: int, damage_reduction: int, hp: int,
                            avg_defense: int, avg_damage_reduction: int, avg_hp: int) -> float:
    """
    생존 관련 스탯을 복합적으로 평가합니다.

    Args:
        defense: 방어력
        damage_reduction: 피해 감소
        hp: 체력
        avg_defense: 서버 평균 방어력
        avg_damage_reduction: 서버 평균 피해 감소
        avg_hp: 서버 평균 체력

    Returns:
        생존 종합 점수 (ratio)
    """
    defense_ratio = normalize_stat(defense, avg_defense)
    reduction_ratio = normalize_stat(damage_reduction, avg_damage_reduction)
    hp_ratio = normalize_stat(hp, avg_hp)

    # 세 지표의 평균 (동등 비중)
    return (defense_ratio + reduction_ratio + hp_ratio) / 3.0


def calculate_power_index(
    stats_json: Dict,
    server_avg: Dict[str, int]
) -> Tuple[int, Dict[str, int]]:
    """
    캐릭터의 투력(Power Index)을 계산합니다.

    Args:
        stats_json: 캐릭터 스탯 JSON
        server_avg: 서버 평균 스탯 딕셔너리
            - avg_attack, avg_damage_amp, avg_crit_rate, avg_crit_damage,
              avg_attack_speed, avg_defense, avg_damage_reduction, avg_hp

    Returns:
        (power_index, stat_contribution)
        - power_index: 투력 점수 (정수)
        - stat_contribution: 각 스탯의 기여도 (백분율)
    """
    # 1. 스탯 추출
    stats = extract_stats_from_json(stats_json)

    # 2. 각 스탯 정규화
    attack_ratio = normalize_stat(stats["attack"], server_avg.get("avg_attack", 1))
    damage_amp_ratio = normalize_stat(stats["damage_amp"], server_avg.get("avg_damage_amp", 1))
    attack_speed_ratio = normalize_stat(stats["attack_speed"], server_avg.get("avg_attack_speed", 1))

    # 3. 복합 지표 계산
    crit_ratio = calculate_crit_score(
        stats["crit_rate"], stats["crit_damage"],
        server_avg.get("avg_crit_rate", 1), server_avg.get("avg_crit_damage", 1)
    )

    survive_ratio = calculate_survive_score(
        stats["defense"], stats["damage_reduction"], stats["hp"],
        server_avg.get("avg_defense", 1), server_avg.get("avg_damage_reduction", 1),
        server_avg.get("avg_hp", 1)
    )

    # 4. 가중치 적용하여 투력 계산
    power_value = (
        WEIGHTS["attack"] * attack_ratio +
        WEIGHTS["damage_amp"] * damage_amp_ratio +
        WEIGHTS["crit"] * crit_ratio +
        WEIGHTS["attack_speed"] * attack_speed_ratio +
        WEIGHTS["survive"] * survive_ratio
    )

    # 5. 1000 기준으로 스케일링
    power_index = round(1000 * power_value)

    # 6. 각 스탯의 기여도 계산 (백분율)
    total = power_value
    stat_contribution = {
        "attack": round((WEIGHTS["attack"] * attack_ratio / total) * 100) if total > 0 else 0,
        "damageAmp": round((WEIGHTS["damage_amp"] * damage_amp_ratio / total) * 100) if total > 0 else 0,
        "crit": round((WEIGHTS["crit"] * crit_ratio / total) * 100) if total > 0 else 0,
        "attackSpeed": round((WEIGHTS["attack_speed"] * attack_speed_ratio / total) * 100) if total > 0 else 0,
        "survive": round((WEIGHTS["survive"] * survive_ratio / total) * 100) if total > 0 else 0,
    }

    logger.debug(
        f"Calculated power_index: {power_index} "
        f"(attack: {attack_ratio:.2f}, dmg_amp: {damage_amp_ratio:.2f}, "
        f"crit: {crit_ratio:.2f}, atk_spd: {attack_speed_ratio:.2f}, "
        f"survive: {survive_ratio:.2f})"
    )

    return power_index, stat_contribution
