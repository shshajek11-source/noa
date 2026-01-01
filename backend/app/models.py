from sqlalchemy import create_engine, Column, BigInteger, Integer, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, JSON, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db/aion2")

# Use JSON for testing (SQLite-compatible), JSONB for production (PostgreSQL)
JSONType = JSON if "sqlite" in DATABASE_URL.lower() else JSONB

# Use Integer for testing (SQLite autoincrement), BigInteger for production (PostgreSQL)
IntegerType = Integer if "sqlite" in DATABASE_URL.lower() else BigInteger

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

from .search_log import SearchLog

class Character(Base):
    __tablename__ = "characters"

    id = Column(IntegerType, primary_key=True, index=True)
    name = Column(String(64), nullable=False, index=True)
    server = Column(String(64), nullable=False, index=True)
    class_name = Column("class", String(64), nullable=False)
    level = Column(Integer, nullable=False)
    power = Column(IntegerType, nullable=False)

    # Raw data from external source
    raw_payload = Column(JSONType, nullable=True)

    # Normalized stats (parsed and cleaned)
    stats_payload = Column(JSONType, nullable=True)

    # Power scoring (calculated by batch job, not real-time)
    power_score = Column(IntegerType, nullable=True)  # 배치에서 계산한 투력 점수
    power_rank = Column(String(16), nullable=True)  # D1~S5 등급
    percentile = Column(Integer, nullable=True)  # 퍼센타일 (0-100)

    # Expanded Data
    character_image_url = Column(String(256), nullable=True)
    equipment_data = Column(JSONType, nullable=True)  # 무기, 방어구 등 장비 정보

    # Dummy data marker
    is_dummy = Column(Boolean, nullable=True, default=False)  # 더미 데이터 여부

    # Timestamps
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)  # 마지막 외부 데이터 수집 시각
    last_scored_at = Column(DateTime(timezone=True), nullable=True)  # 마지막 투력 계산 시각
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('server', 'name', name='uix_server_name'),
        CheckConstraint('level >= 0', name='check_level_positive'),
        CheckConstraint('power >= 0', name='check_power_positive'),
    )

    stats = relationship("CharacterStat", back_populates="character", cascade="all, delete-orphan")

class CharacterStat(Base):
    __tablename__ = "character_stats"

    id = Column(IntegerType, primary_key=True, index=True)
    character_id = Column(IntegerType, ForeignKey("characters.id", ondelete="CASCADE"))
    stats_json = Column(JSONType, nullable=False)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())

    character = relationship("Character", back_populates="stats")

class RankSnapshot(Base):
    __tablename__ = "ranking_snapshots"

    id = Column(IntegerType, primary_key=True, index=True)
    server = Column(String(64), nullable=False, index=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Ranking data
    rank_list = Column(JSONType, nullable=True)  # 전체 랭킹 리스트
    top_list = Column(JSONType, nullable=True)  # TOP N 리스트 (빠른 조회용)

    # Legacy fields (호환성 유지)
    type = Column(String(32), nullable=True)
    filter_key = Column(String(128), nullable=True)
    snapshot_json = Column(JSONType, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

class ServerAverageStats(Base):
    __tablename__ = "server_average_stats"

    id = Column(IntegerType, primary_key=True, index=True)
    server = Column(String(64), nullable=False, unique=True, index=True)
    avg_attack = Column(Integer, nullable=False, default=0)
    avg_damage_amp = Column(Integer, nullable=False, default=0)
    avg_crit_rate = Column(Integer, nullable=False, default=0)
    avg_crit_damage = Column(Integer, nullable=False, default=0)
    avg_attack_speed = Column(Integer, nullable=False, default=0)
    avg_defense = Column(Integer, nullable=False, default=0)
    avg_damage_reduction = Column(Integer, nullable=False, default=0)
    avg_hp = Column(Integer, nullable=False, default=0)
    sample_size = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

def init_db():
    Base.metadata.create_all(bind=engine)
