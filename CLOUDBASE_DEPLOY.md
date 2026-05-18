# VM Studio CloudBase 部署说明

这套方案是给中国大陆本地访问准备的“省事版”：

- 前端继续使用当前已经改好的同域 `/api/gemini`
- 静态页面放到 CloudBase 静态网站托管
- `/api/gemini` 交给 CloudBase 云函数代理到 `http://zx2.52youxi.cc:3000`
- 页面里的 Relay API Key 仍然由你手动输入，代码会将它保存到浏览器 `localStorage`，刷新页面后自动恢复

## 这套方案为什么可行

CloudBase 官方文档确认了三件关键事：

- 静态网站托管默认自带 HTTP/HTTPS，可直接部署前端
- HTTP 访问服务可以把同一个默认域名下的不同路径分别路由到“静态网站托管”和“云函数”
- 路由按“最长路径优先”匹配，所以 `/api/gemini` 可以优先命中云函数，`/` 再命中静态网站

对应文档：

- [访问静态网站资源](https://docs.cloudbase.net/service/access-static-hosting)
- [通过 HTTP 访问云函数](https://docs.cloudbase.net/service/access-cloud-function)
- [路由匹配规则](https://docs.cloudbase.net/service/routes)
- [静态托管自定义域名](https://docs.cloudbase.net/hosting/custom-domain)

要注意的一点是：官方也明确说了，默认域名更适合开发测试，会有限频。想长期稳定商用，后面还是建议换成自己的域名。

## 你仓库里已经准备好的内容

- 前端：`/Users/william/Desktop/will-project/VM Studio/frontend`
- CloudBase 代理函数：`/Users/william/Desktop/will-project/VM Studio/cloudbase/functions/vmStudioRelayProxy`

这个云函数会把：

- `https://你的默认域名/api/gemini/v1beta/...`

转发到：

- `http://zx2.52youxi.cc:3000/v1beta/...`

## 第 1 步：先构建前端

在本地进入：

`/Users/william/Desktop/will-project/VM Studio/frontend`

执行：

```bash
npm install
npm run build
```

构建完成后，你会得到：

`/Users/william/Desktop/will-project/VM Studio/frontend/dist`

## 第 2 步：创建 CloudBase 环境

1. 打开 CloudBase 控制台
2. 新建一个环境
3. 记住这个环境的默认域名，后面会用到

## 第 3 步：上传静态网站

1. 进入“静态网站托管”
2. 新建或启用静态托管
3. 上传整个 `dist` 文件夹里的内容

上传完成后，先不要急着测，因为这时 `/api/gemini` 还没接好。

## 第 4 步：创建云函数代理

1. 进入“云函数”
2. 新建函数，函数名填：`vmStudioRelayProxy`
3. 运行时选 `Node.js 18` 或更高
4. 将这个目录里的文件上传：

`/Users/william/Desktop/will-project/VM Studio/cloudbase/functions/vmStudioRelayProxy`

5. 在函数环境变量里新增：

`RELAY_BASE_URL=http://zx2.52youxi.cc:3000`

6. 保存并部署

## 第 5 步：配置 HTTP 访问服务

进入“HTTP 访问服务”，在同一个默认域名下加两条规则。

规则 1：

- 关联资源类型：`云函数`
- 资源：`vmStudioRelayProxy`
- 域名：`默认域名`
- 触发路径：`/api/gemini`

规则 2：

- 关联资源类型：`静态网站托管`
- 资源：你刚才上传的静态站点
- 域名：`默认域名`
- 触发路径：`/`

这样配置后：

- 打开首页时，会命中静态网站
- 前端请求 `/api/gemini/...` 时，会优先命中云函数代理

## 第 6 步：开始使用

打开你的默认域名首页：

`https://你的环境默认域名/`

然后：

1. 页面里手动粘贴你的 Relay API Key
2. 上传参考图
3. 点击生成

## 出错时先看这里

### 1. 页面能打开，但生成时报 key 无效

这通常不是 CloudBase 问题，而是你的中转站 key 本身无效，或者该 key 不属于 `zx2.52youxi.cc:3000` 这条链路。

### 2. 首页能打开，但 `/api/gemini` 404

一般是 HTTP 访问服务没配对。重点检查：

- 是否把 `/api/gemini` 绑定到了 `vmStudioRelayProxy`
- 是否和首页用了同一个默认域名
- 是否真的保存发布了路由规则

### 3. 页面空白

优先检查：

- 静态网站托管里是否上传的是 `dist` 里的内容
- `index.html` 是否在静态站点根目录

### 4. 默认域名偶尔打不开或变慢

这是官方文档已经提醒过的限制之一。默认域名适合测试，如果你后面准备长期稳定使用，再升级成自定义域名会更稳。
