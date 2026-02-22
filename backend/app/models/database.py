from sqlalchemy import create_engine, Column, String, Integer, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

Base = declarative_base()


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    background_mode = Column(String, nullable=False)
    pose_ids = Column(JSON, nullable=False)  # List[str]
    model = Column(String, nullable=False)
    inputs = Column(JSON, nullable=False)  # Dict
    outputs = Column(JSON, nullable=False)  # List[str]
    thumbnail = Column(String, nullable=True)


# 创建数据库引擎
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 创建所有表
def init_db():
    Base.metadata.create_all(bind=engine)


# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
