# VM Studio - Fashion AI Generator

> Theory 风格的时尚 AI 生成器，基于 Google Gemini 3 Pro Image API

## 🚀 快速开始

### 1. 启动后端
```bash
cd backend
./diagnose-and-start.sh
```

首次运行会提示配置 Google API Key（从 https://aistudio.google.com/apikey 获取）

### 2. 打开前端
双击 `preview-interactive.html` 或在浏览器中打开

### 3. 开始使用
1. 上传图片（拖拽或点击）
   - Styling Reference *（必需）
   - Face Reference *（必需）
   - 可选：服装和配饰
2. 选择参数（性别、背景、姿势）
3. 点击 Generate
4. 查看生成结果

## ✨ 功能特性

- ✅ 拖拽上传图片
- ✅ 性别切换（Female 9姿势 / Male 6姿势）
- ✅ 背景模式（White / Original）
- ✅ 实时生成进度 + 倒计时
- ✅ 超模比例（8.5头身比）
- ✅ 高清生成（9:16, 2K）
- ✅ Theory 风格极简设计

## 📁 项目结构

```
VM Studio/
├── preview-interactive.html   # 前端页面
├── backend/                   # 后端服务器
│   ├── app/                  # FastAPI 应用
│   ├── diagnose-and-start.sh # 启动脚本
│   ├── .env                  # 配置文件
│   └── requirements.txt      # 依赖包
├── PROJECT_README.md         # 完整文档
├── QUICKSTART.md            # 快速指南
└── START_BACKEND.md         # 后端说明
```

## 🎭 姿势库

### Female（9个）
F1-三角站姿 | F2-交叉腿 | F3-侧身扭转 | F4-行走 | F5-坐姿
F6-靠墙 | F7-手臂上扬 | F8-蹲姿 | F9-回眸

### Male（6个）
M1-正面站立 | M2-侧身站立 | M3-行走 | M4-坐姿 | M5-靠墙 | M6-交叉手臂

## 🔧 技术栈

- **前端**: HTML5 + Tailwind CSS + JavaScript
- **后端**: Python 3.9+ + FastAPI
- **AI**: Google Gemini 3 Pro Image API
- **数据库**: SQLite

## 📞 故障排查

### 后端无法启动
```bash
# 检查 Python 版本
python3 --version

# 检查端口占用
lsof -i :8000
```

### 前端连接失败
1. 确认后端已启动：http://localhost:8000/health
2. 刷新页面重试

### 停止服务器
```bash
pkill -f "uvicorn app.main:app"
```

## 📚 详细文档

- **PROJECT_README.md** - 完整项目说明
- **QUICKSTART.md** - 快速启动指南
- **START_BACKEND.md** - 后端启动详细说明
- **PROJECT_COMPLETE.md** - 项目完成总结

## 🔗 相关链接

- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health
- Google AI Studio: https://aistudio.google.com/apikey

---

**VM Studio v1.0.0** - Built with ❤️ using Google Gemini 3 Pro Image API
