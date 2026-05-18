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

## Relay API Key 配置（已改为更安全默认）

应用现在默认直接请求 HTTPS 中转，你手动输入 Relay API Key 即可使用。

- 前端会将 key 持久化到 `localStorage`，刷新页面后自动恢复
- 当前默认对接 `https://wuaiapi.com`
- 对 `New API / 吾爱 API` 的 Gemini 兼容接口使用 `Authorization: Bearer sk-...`

## 本地开发

```bash
npm install
npm run dev
```

开发模式下，Vite 会把 `/api/gemini/*` 代理到 `http://zx2.52youxi.cc:3000/*`。
如果你不设置环境变量，当前代码也会直接请求 `https://wuaiapi.com`。

## 线上部署（最省事方案）

1. 将 `frontend` 目录部署到 Vercel（Framework 选 `Vite`）。
2. 不需要额外后端服务，`vercel.json` 已提供 API 转发。
3. 打开页面后，在界面里手动输入你的 Relay API Key。

## GitHub Pages + CloudBase 代理（最像你现在站点的方案）

如果你已经确认 `github.io` 在你的使用环境里能正常打开，这是最接近你当前线上站点的方案：

1. 页面继续部署到 GitHub Pages
2. CloudBase 只负责提供一个 HTTPS 代理地址
3. 前端构建时把 `VITE_RELAY_PROXY_BASE_URL` 指向你的 CloudBase `/api/gemini`

准备方法：

1. 参考 `frontend/.env.github-pages.example`
2. 在同目录新建一个本地文件：`frontend/.env.github-pages.local`
3. 填入你自己的 CloudBase 地址，例如：

```bash
VITE_RELAY_PROXY_BASE_URL=https://your-cloudbase-domain/api/gemini
```

4. 然后执行：

```bash
npm run deploy:github-pages
```

这样发布后的 GitHub Pages 页面会继续保留你熟悉的 `github.io` 访问方式，但 API 请求会走你自己的 CloudBase HTTPS 代理。

## GitHub Pages + 吾爱 API（当前推荐）

如果你已经在 `https://wuaiapi.com/console/token` 创建了 token，并且模型广场确认可用模型为：

- `gemini-3.1-flash-image-preview`

那么现在可以直接走这个更简单的方案：

1. 页面继续部署到 GitHub Pages
2. 不需要 CloudBase 或额外代理
3. 构建时默认直接请求 `https://wuaiapi.com`
4. 页面里手动粘贴你在吾爱 API 后台创建的 token

仓库里已经内置：

- `frontend/.env.github-pages`

内容就是：

```bash
VITE_RELAY_PROXY_BASE_URL=https://wuaiapi.com
```

因此你现在直接运行：

```bash
npm run deploy:github-pages
```

即可发布一版默认对接 `wuaiapi` 的 GitHub Pages 页面。

说明：

- 当前默认模型已切到 `gemini-3.1-flash-image-preview`
- 这个端点支持 Gemini 原生格式：

```text
/v1beta/models/gemini-3.1-flash-image-preview:generateContent
```

- 我已额外验证过该端点支持浏览器跨域预检（`OPTIONS` 返回 `access-control-allow-origin: *`）
- 对这套接口，当前代码使用 `Authorization: Bearer sk-...`
  不再把 token 拼进 `?key=`，避免 `New API` 将其识别成别的 key 形式

## 国内免备案测试方案（CloudBase）

如果你主要在中国大陆本地使用，又想避免 `vercel.app` 的可访问性风险，可以走：

1. CloudBase 静态网站托管部署 `dist`
2. CloudBase 云函数部署仓库里的 `cloudbase/functions/vmStudioRelayProxy`
3. 用 CloudBase `HTTP 访问服务` 把 `/` 路由到静态网站，把 `/api/gemini` 路由到云函数

完整步骤见：

`/Users/william/Desktop/will-project/VM Studio/CLOUDBASE_DEPLOY.md`

如果你之后有自己的 HTTPS 代理地址，也可以通过环境变量覆盖：

```bash
VITE_RELAY_PROXY_BASE_URL=https://your-https-proxy.example.com/api/gemini
```

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
