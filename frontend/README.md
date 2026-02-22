# VM STYLING STUDIO - Frontend

完整的 React + TypeScript 前端应用，使用 Google Gemini API 生成时尚图片。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 功能特性

- ✅ **多模态输入**: 支持上传造型参考、面部参考、服装和配饰图片
- ✅ **姿势选择**: 9个女性姿势 + 6个男性姿势
- ✅ **实时计时**: 生成过程显示倒计时
- ✅ **历史记录**: 保存所有生成会话，支持快速预览
- ✅ **图片导航**: 左右箭头和缩略图快速切换
- ✅ **拖拽上传**: 所有上传区域支持拖拽
- ✅ **响应式设计**: 完美适配桌面和移动端

## 技术栈

- **React 18** + **TypeScript**
- **Vite** - 快速构建工具
- **Tailwind CSS** - 样式框架
- **@google/genai** - Google Gemini API SDK
- **lucide-react** - 图标库

## 项目结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── UploadSlot.tsx      # 上传组件
│   │   └── HistoryDrawer.tsx   # 历史记录抽屉
│   ├── services/
│   │   └── geminiService.ts    # Gemini API 服务
│   ├── App.tsx                 # 主应用组件
│   ├── types.ts                # TypeScript 类型定义
│   ├── constants.ts            # 常量和 Prompt 模板
│   ├── main.tsx                # 应用入口
│   └── index.css               # 全局样式
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## API Key 配置

应用使用 `window.aistudio` API 来选择 Google AI API Key：

1. 在 Google AI Studio 中打开应用
2. 首次生成时会提示选择 API Key
3. 或者在代码中设置 `window.API_KEY`

## 开发说明

### 添加新姿势

编辑 `src/constants.ts`：

```typescript
export const FEMALE_POSES: Pose[] = [
  { id: 'F10', title: 'New Pose', description: '...' },
  // ...
];
```

### 修改 Prompt

编辑 `src/constants.ts` 中的 `CORE_PROMPT_TEMPLATE`。

### 自定义样式

编辑 `tailwind.config.js` 或 `src/index.css`。

## 部署

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

构建产物在 `dist/` 目录，可以部署到任何静态托管服务。

## License

MIT
