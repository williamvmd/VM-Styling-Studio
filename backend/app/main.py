from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.config import settings
from app.models.database import init_db
from app.api import generate, history


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    init_db()
    print("✅ Database initialized")
    yield
    # 关闭时的清理工作
    print("👋 Shutting down...")


# 创建 FastAPI 应用
app = FastAPI(
    title="VM Studio API",
    description="Fashion AI Generator Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（用于访问生成的图片）
app.mount("/outputs", StaticFiles(directory=settings.output_dir), name="outputs")

# 注册路由
app.include_router(generate.router)
app.include_router(history.router)


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "VM Studio API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
