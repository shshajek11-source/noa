from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

# ============================================================================
# Character Schemas
# ============================================================================

class Character(BaseModel):
    name: str
    server: str
    class_name: str = Field(alias="class")
    level: int
    power: int
    updated_at: datetime
    raw_payload: Optional[Dict[str, Any]] = None
    stats_payload: Optional[Dict[str, Any]] = None

    # 신규 필드
    item_level: Optional[int] = None
    race: Optional[str] = None
    title: Optional[str] = None
    character_image_url: Optional[str] = None
    primary_stats: Optional[Dict[str, Any]] = None
    detailed_stats: Optional[Dict[str, Any]] = None
    equipment_data: Optional[List[Dict[str, Any]]] = None
    title_data: Optional[Dict[str, Any]] = None
    devanion_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class CharacterFullResponse(BaseModel):
    """Full character detail response"""
    profile: Dict[str, Any]
    power: Dict[str, Any]
    stats: Dict[str, Any]
    equipment: Optional[List[Dict[str, Any]]] = None
    titles: Optional[Dict[str, Any]] = None
    devanion: Optional[Dict[str, Any]] = None


class CharacterDTO(BaseModel):
    server: str
    name: str
    class_name: str = Field(default="Unknown")
    level: int = Field(default=1)
    power: int = Field(default=0)
    updated_at: datetime = Field(default_factory=datetime.now)
    stats_json: Optional[Dict[str, Any]] = None
    character_image_url: Optional[str] = None
    equipment_data: Optional[List[Dict[str, Any]]] = None
    raw_payload: Optional[Dict[str, Any]] = None
    stats_payload: Optional[Dict[str, Any]] = None
    
    class Config:
        populate_by_name = True

class SearchRequest(BaseModel):
    server: str
    name: str

class SearchResponse(BaseModel):
    id: int
    name: str
    server: str
    class_name: str = Field(alias="class")
    level: int
    power: int
    power_score: Optional[int] = None
    power_rank: Optional[str] = None
    percentile: Optional[float] = None
    last_fetched_at: Optional[datetime] = None
    last_scored_at: Optional[datetime] = None
    stats_payload: Optional[Dict[str, Any]] = None
    fetch_status: Optional[str] = None  # "success", "cached", "failed"

    class Config:
        populate_by_name = True

class RankingItem(BaseModel):
    name: str
    server: str
    class_name: str
    level: int
    power: int
    rank: int

class RankingResponse(BaseModel):
    items: List[RankingItem]
    total: Optional[int] = 0
    generated_at: datetime = Field(default_factory=datetime.now)
    type: str = "realtime"
    filter_key: str = "all"

class CharacterStatHistory(BaseModel):
    id: int
    power: int
    level: int
    captured_at: datetime
    stats_json: dict

class CharacterDetailResponse(BaseModel):
    id: int
    name: str
    server: str
    class_name: str = Field(alias="class")
    level: int
    power: int
    power_index: Optional[int] = None  # 사이트 고유 투력 지표
    tier_rank: Optional[str] = None  # D1~S5 랭크
    percentile: Optional[float] = None  # 퍼센타일 (0~100)
    nextRankPower: Optional[int] = None  # 다음 랭크까지 필요한 투력
    statContribution: Optional[dict] = None  # 스탯별 기여도
    updated_at: datetime
    stats: Optional[dict] = None
    rank: Optional[int] = None # Added for Detail Badge (전체 순위)
    warning: Optional[str] = None
    power_change: Optional[int] = None
    level_change: Optional[int] = None

    class Config:
        populate_by_name = True
