# Night Focus / 每日夜间动力

一个夜间氛围的每日箴言小应用。前端展示每天固定的一句鼓励语，支持随机换一句、收藏、复制、切换背景和沉浸模式；后端用 Express 提供 API，并用 Node.js 内置 SQLite 保存收藏、历史记录和背景设置。

线上地址：<https://nightmotivation.vercel.app/>

## 功能

- 每日箴言：按日期哈希固定当天展示内容。
- 随机切换：点击“换一句”或按空格键获取另一句箴言。
- 收藏管理：收藏喜欢的句子，并在收藏面板中快速回看。
- 背景切换：内置山湖、雪山、森林、旷野、海岸、极光等夜景背景。
- 复制文本：一键复制当前标题和正文。
- 沉浸模式：隐藏工具栏，只保留背景和文案。
- SQLite 存储：本地数据库自动创建在 `data/night-focus.db`；Vercel 部署时使用 `/tmp/night-focus` 作为临时运行时数据库。

## 技术栈

- Node.js + Express
- Node.js 内置 `node:sqlite`
- 原生 HTML / CSS / JavaScript
- SQLite WAL 模式
- Vercel Functions + 静态资源托管

> 由于项目使用 `node:sqlite`，建议使用 Node.js 24 或更高版本运行。本机验证版本为 `v24.16.0`。

## 快速开始

```bash
npm install
npm start
```

启动后访问：

```text
http://localhost:3000
```

如需使用其他端口：

```bash
PORT=4000 npm start
```

Windows PowerShell：

```powershell
$env:PORT=4000
npm start
```

## 脚本

```bash
npm start
```

启动 Express 服务，静态托管 `public/` 和 `public/assets/`，并暴露 `/api/*` 接口。

```bash
npm run dev
```

当前与 `npm start` 相同，适合后续接入 nodemon 或其他开发工具。

## 项目结构

```text
.
├── api/
│   ├── index.js             # Vercel API Function 入口
│   └── [...path].js         # /api/* 的兜底函数入口
├── app.js                   # Vercel Express 识别入口
├── assets/                  # 夜景背景图片
├── public/
│   ├── assets/              # Vercel 静态托管的背景图片
│   └── index.html           # 后端 API 驱动的正式前端入口
├── server/
│   ├── app.js               # Express 应用和 API 路由
│   ├── db.js                # SQLite 初始化、建表和 seed 逻辑
│   └── seed.js              # 默认箴言和背景数据
├── data/                    # 运行时自动生成数据库，已被 .gitignore 忽略
├── night-motivation.html    # 单文件静态原型，使用 localStorage
├── package.json
├── package-lock.json
└── vercel.json              # 将 /api/:path* 重写到 API Function
```

## 部署

项目已经适配 Vercel：

- `app.js` 用于让 Vercel 识别 Express 应用。
- `api/index.js` 和 `api/[...path].js` 用于稳定承接 `/api/*` 请求。
- `vercel.json` 将 `/api/:path*` 重写到 API Function，并保留原始 API 路径。
- `package.json` 固定 Node.js `24.x`，用于支持 `node:sqlite`。
- 背景图放在 `public/assets/`，由 Vercel 直接静态托管。

生产地址：

```text
https://nightmotivation.vercel.app/
```

验证 API：

```text
https://nightmotivation.vercel.app/api/today
```

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/today` | 获取当天固定箴言，并写入历史记录 |
| `GET` | `/api/quotes/random?exclude=1` | 随机获取一句，可排除当前句子 |
| `GET` | `/api/quotes` | 获取全部启用的箴言 |
| `GET` | `/api/backgrounds` | 获取背景列表和当前选中的背景 |
| `PUT` | `/api/settings/background` | 更新背景设置，body: `{ "id": "lake" }` |
| `GET` | `/api/favorites` | 获取收藏列表 |
| `POST` | `/api/favorites` | 收藏箴言，body: `{ "quoteId": 1 }` |
| `DELETE` | `/api/favorites/:quoteId` | 取消收藏 |
| `GET` | `/api/history` | 获取最近 30 条展示历史 |

## 数据说明

首次启动时，`server/db.js` 会自动创建 `data/night-focus.db` 并建表：

- `quotes`：箴言内容。
- `backgrounds`：背景图、标签和色板。
- `favorites`：收藏记录。
- `history`：展示历史。
- `settings`：用户设置，例如当前背景。

默认箴言会按 `server/seed.js` 自动补齐缺失内容；背景配置每次启动都会按 `server/seed.js` 同步更新。

Vercel 上的 SQLite 位于临时目录 `/tmp/night-focus`，适合这个轻量演示应用。收藏、历史记录和背景设置在函数实例重建后可能会丢失；如果后续需要长期保存用户数据，可以换成外部数据库。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Space` | 换一句 |
| `B` | 切换到下一张背景 |
| `C` | 复制当前箴言 |
| `F` | 切换沉浸模式 |
| `Esc` | 退出沉浸模式并关闭收藏面板 |

## 开发提示

- 修改默认内容：编辑 `server/seed.js`。
- 修改界面：编辑 `public/index.html`。
- 修改 API：编辑 `server/app.js`。
- 修改 Vercel API 入口：编辑 `api/index.js` 和 `vercel.json`。
- 重置运行时数据：停止服务后删除 `data/night-focus.db` 及相关 WAL 文件，再重新启动。
- `night-motivation.html` 是可独立打开的静态版本，适合做视觉或交互原型；正式运行建议使用 `public/index.html` + Express 后端。

## 可优化方向

- 拆分前端文件：将 `public/index.html` 中的 CSS 和 JavaScript 拆成独立文件，方便维护和缓存。
- 增加开发热重载：为 `npm run dev` 接入 nodemon，减少手动重启服务的成本。
- 增加测试：为 API 路由、日期哈希、收藏和背景设置补充自动化测试。
- 补充错误处理：为剪贴板权限、API 请求失败和数据库写入失败增加更友好的 UI 状态。
- 优化历史记录：限制同一天 `/api/today` 的重复写入，或为历史表增加去重策略。
- 持久化升级：如果收藏和历史记录需要跨部署保留，可以接入外部数据库。
