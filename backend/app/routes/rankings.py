from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Character
from ..schemas import RankingResponse, RankingItem

router = APIRouter(prefix="/api/rankings", tags=["rankings"])

@router.get("", response_model=RankingResponse)
def get_rankings(limit: int = 10, db: Session = Depends(get_db)):
    """
    Get global rankings.
    """
    chars = db.query(Character).order_by(Character.power.desc()).limit(limit).all()
    
    items = []
    for i, c in enumerate(chars):
        items.append(RankingItem(
            rank=i+1,
            name=c.name,
            server=c.server,
            class_name=c.class_name,
            power=c.power,
            level=c.level
        ))
        
    return RankingResponse(items=items, total=len(items))

@router.get("/by-server")
def get_rankings_by_server(limit_per_server: int = 3, db: Session = Depends(get_db)):
    """
    Get top N characters per server.
    """
    servers = db.query(Character.server).distinct().all()
    result = {}
    
    for (server_name,) in servers:
        chars = db.query(Character)\
            .filter(Character.server == server_name)\
            .order_by(Character.power.desc())\
            .limit(limit_per_server)\
            .all()
            
        result[server_name] = [
            {
                "name": c.name,
                "server": c.server,
                "class": c.class_name,
                "power": c.power,
                "level": c.level
            } for c in chars
        ]
        
    return {"data": result}
