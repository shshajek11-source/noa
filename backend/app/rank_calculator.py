"""
랭크(Tier Rank) 산정 모듈

투력 기반으로 D1~S5 랭크를 퍼센타일 방식으로 산정합니다.

랭크 구조:
- D1~D5: 하위 0~50% (10% 간격)
- C1~C5: 50~75% (5% 간격)
- B1~B5: 75~95% (4% 간격)
- A1~A5: 95~99.7% (약 1% 간격, 최소 투력 컷 병행)
- S1~S5: 상위 0.3% (세분화)
"""

from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


# 랭크 티어 정의 (퍼센타일 기준)
# 퍼센타일은 "상위 X%"를 의미 (낮을수록 높은 랭크)
RANK_TIERS = {
    # S 티어: 상위 0~0.3%
    "S5": (0.0, 0.06),
    "S4": (0.06, 0.12),
    "S3": (0.12, 0.18),
    "S2": (0.18, 0.24),
    "S1": (0.24, 0.3),

    # A 티어: 상위 0.3~5%
    "A5": (0.3, 1.24),
    "A4": (1.24, 2.18),
    "A3": (2.18, 3.12),
    "A2": (3.12, 4.06),
    "A1": (4.06, 5.0),

    # B 티어: 상위 5~25%
    "B5": (5.0, 9.0),
    "B4": (9.0, 13.0),
    "B3": (13.0, 17.0),
    "B2": (17.0, 21.0),
    "B1": (21.0, 25.0),

    # C 티어: 상위 25~50%
    "C5": (25.0, 30.0),
    "C4": (30.0, 35.0),
    "C3": (35.0, 40.0),
    "C2": (40.0, 45.0),
    "C1": (45.0, 50.0),

    # D 티어: 하위 50~100%
    "D5": (50.0, 60.0),
    "D4": (60.0, 70.0),
    "D3": (70.0, 80.0),
    "D2": (80.0, 90.0),
    "D1": (90.0, 100.0),
}


def calculate_percentile(power_index: int, all_power_indices: List[int]) -> float:
    """
    캐릭터의 투력이 전체에서 상위 몇 %인지 계산합니다.

    Args:
        power_index: 캐릭터의 투력
        all_power_indices: 서버 내 모든 캐릭터의 투력 리스트 (정렬 불필요)

    Returns:
        퍼센타일 (0.0~100.0)
        - 0.0: 1위 (상위 0%)
        - 50.0: 중간
        - 100.0: 최하위
    """
    if not all_power_indices:
        return 50.0  # 데이터 없을 시 중간값 반환

    total_count = len(all_power_indices)

    # 자신보다 높은 투력을 가진 캐릭터 수 계산
    higher_count = sum(1 for p in all_power_indices if p > power_index)

    # 퍼센타일 계산 (상위 몇 %)
    percentile = (higher_count / total_count) * 100.0

    return round(percentile, 2)


def get_tier_rank(percentile: float, power_index: int) -> str:
    """
    퍼센타일을 기반으로 D1~S5 랭크를 산정합니다.

    Args:
        percentile: 캐릭터의 퍼센타일 (0~100)
        power_index: 캐릭터의 투력 (A/S 랭크 최소 컷 적용 시 사용)

    Returns:
        랭크 문자열 (예: "S3", "A1", "B4")
    """
    # 퍼센타일 범위에 맞는 랭크 찾기
    for rank, (min_percentile, max_percentile) in RANK_TIERS.items():
        if min_percentile <= percentile < max_percentile:
            # A/S 랭크는 최소 투력 컷 추가 검증 가능 (선택 사항)
            # 현재는 퍼센타일만 사용
            return rank

    # 범위를 벗어난 경우 (예외 처리)
    if percentile < 0.3:
        return "S5"
    else:
        return "D1"


def calculate_next_rank_power(
    current_rank: str,
    current_power: int,
    all_power_indices: List[int]
) -> Optional[int]:
    """
    다음 랭크까지 필요한 투력 차이를 계산합니다.

    Args:
        current_rank: 현재 랭크 (예: "A3")
        current_power: 현재 투력
        all_power_indices: 서버 내 모든 투력 리스트 (내림차순 정렬)

    Returns:
        다음 랭크까지 필요한 투력 차이 (None이면 이미 최고 랭크)
    """
    # 랭크 순서 (S5가 최고)
    rank_order = [
        "S5", "S4", "S3", "S2", "S1",
        "A5", "A4", "A3", "A2", "A1",
        "B5", "B4", "B3", "B2", "B1",
        "C5", "C4", "C3", "C2", "C1",
        "D5", "D4", "D3", "D2", "D1",
    ]

    if current_rank not in rank_order:
        return None

    current_index = rank_order.index(current_rank)

    # 이미 최고 랭크
    if current_index == 0:
        return None

    # 다음 랭크
    next_rank = rank_order[current_index - 1]
    next_tier_range = RANK_TIERS[next_rank]

    # 다음 랭크의 최소 퍼센타일
    next_min_percentile = next_tier_range[0]

    # 전체 인원 기준 해당 퍼센타일의 인덱스 계산
    total_count = len(all_power_indices)
    target_index = int((next_min_percentile / 100.0) * total_count)

    if target_index >= total_count:
        return None

    # 정렬된 리스트에서 해당 인덱스의 투력 (다음 랭크 최소 투력)
    sorted_powers = sorted(all_power_indices, reverse=True)
    next_rank_min_power = sorted_powers[target_index]

    # 필요한 차이 계산
    power_diff = max(0, next_rank_min_power - current_power)

    return power_diff


def calculate_rank_from_server_data(
    power_index: int,
    server: str,
    all_characters_power: List[Tuple[int, str]]  # (power_index, server)
) -> Tuple[str, float, Optional[int]]:
    """
    서버 기준으로 랭크, 퍼센타일, 다음 랭크까지 필요한 투력을 계산합니다.

    Args:
        power_index: 캐릭터의 투력
        server: 서버명
        all_characters_power: 전체 캐릭터의 (투력, 서버) 튜플 리스트

    Returns:
        (tier_rank, percentile, next_rank_power)
    """
    # 같은 서버 캐릭터만 필터링
    server_powers = [p for p, s in all_characters_power if s == server]

    # 퍼센타일 계산
    percentile = calculate_percentile(power_index, server_powers)

    # 랭크 산정
    tier_rank = get_tier_rank(percentile, power_index)

    # 다음 랭크까지 필요한 투력
    next_rank_power = calculate_next_rank_power(tier_rank, power_index, server_powers)

    logger.debug(
        f"Rank calculated: {tier_rank} (Percentile: {percentile}%, "
        f"Next rank needs: {next_rank_power or 'N/A'} power)"
    )

    return tier_rank, percentile, next_rank_power
