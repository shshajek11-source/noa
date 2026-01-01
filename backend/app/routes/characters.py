from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from ..database import get_db
from ..models import Character
from ..schemas import CharacterFullResponse, CharacterDTO
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/characters", tags=["characters"])

@router.get("/recent", response_model=List[CharacterDTO])
def get_recent_characters(limit: int = 5, db: Session = Depends(get_db)):
    """
    Get recently updated characters.
    """
    chars = db.query(Character).order_by(Character.updated_at.desc()).limit(limit).all()
    return [
        CharacterDTO.from_orm(c) for c in chars
    ]

@router.get("/{character_id}/full", response_model=CharacterFullResponse)
def get_character_full_detail(character_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive character details including:
    - Profile (name, level, class, server, race, title, image)
    - Power (combat score, item level, tier rank, percentile)
    - Stats (primary + detailed with percentiles)
    - Equipment (detailed info with soul engraving, manastones)
    - Titles (collection status)
    - Devanion (board status)
    """
    char = db.query(Character).filter(Character.id == character_id).first()
    
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    
    # Build profile section
    profile = {
        "id": char.id,
        "name": char.name,
        "server": char.server,
        "class": char.class_name,
        "level": char.level,
        "race": char.race,
        "title": char.title,
        "character_image_url": char.character_image_url
    }
    
    # Build power section
    power = {
        "combat_score": char.power_index,  # Our calculated score
        "item_level": char.item_level,  # Official item level
        "tier_rank": char.tier_rank,  # D1-S5
        "percentile": char.percentile,  # Top X%
        "server_rank": None  # TODO: Calculate actual server rank
    }
    
    # Build stats section
    stats = {
        "primary": char.primary_stats or {},
        "detailed": char.detailed_stats or {}
    }
    
    # Equipment, titles, devanion
    equipment = char.equipment_data
    titles = char.title_data
    devanion = char.devanion_data
    
    return CharacterFullResponse(
        profile=profile,
        power=power,
        stats=stats,
        equipment=equipment,
        titles=titles,
        devanion=devanion
    )
