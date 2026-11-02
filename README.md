# 山行档案 · 微信小程序

> 把走过的山野，好好收起来。

`gohiking.club`（山行档案）的微信小程序客户端，与 web 版（`gohiking.club.ts`）共用同一套后端与数据，功能对齐：

- **山野**：首页 —— 本期山脊、精选照片、公共统计、我们如何观看（四维评分标准）
- **活动**：活动发现 —— 我的活动 / 正在招募 / 已经走过、入队申请提醒、发起活动
- **放进**：上传 —— 必须先选活动；单张 / 批量（最多 9 张，单张 ≤ 20MB）；上传 2 路并发、AI 观看 3 路并发；分数印章、观看手记、拍摄建议结果页
- **档案**：公共档案 —— 按主题 / 按时间 / 按摄影师三种视图 + 主题筛选
- **我的**：个人档案 —— 统计四格、活动章节、照片档案状态筛选、继续观看、删除
- **照片详情**：观看分与手记（仅本人 / 公开可见）、点赞（仅同行者）、「放进公共档案 / 收回」、EXIF 元数据、相关照片
- **活动详情 / 管理**：申请加入 / 撤回、成员相册（按拍摄日分组）、集合点仅成员可见、发起人工作台（通过 / 婉拒 / 邀请 / 移出 / 结束报名）
- **徒步者公开档案**、**编辑资料**、**登录 / 注册**（邮箱密码，Better Auth 会话）

---

## 技术形态

- **原生微信小程序**（无构建链、无 npm 依赖），直接用微信开发者工具打开即可运行
- 自定义底部 TabBar（`custom-tab-bar/`），中央凸起信号橙「放进」按钮
- 视觉对齐 web 设计系统：纸张 `#f3eee3` / 墨绿 `#202b22` / 信号橙 `#df5a34`，衬线标题 + mono 元数据 + 2rpx 档案式直角

## 与后端的对接

认证采用 Better Auth 的 **Cookie 会话**（无 Bearer）。小程序在 `utils/api.js` 中：

1. 登录（`POST /api/auth/sign-in/email`）后从 `Set-Cookie` 提取 `gohiking.session_token` 持久化到本地存储
2. 所有 `wx.request` / `wx.uploadFile` 自动附带 `Cookie` 请求头
3. 私有图片由 `/api/mp/*` 返回 **30 分钟、绑定 photoId + viewerId 的 HMAC 签名 URL**；小程序只补全域名，不再把 session token 放进图片地址

### 后端配套改动（`gohiking.club.ts`）

web 版的列表数据原本由 Server Components 渲染，没有 JSON 列表端点。为此在后端新增了一组移动端适配 API（读取为主 + 一个资料更新端点，不影响既有功能，`pnpm typecheck` 与 `pnpm test` 全部通过）：

| 端点 | 说明 |
| --- | --- |
| `GET /api/mp/session` | 当前登录用户 |
| `GET /api/mp/home` | 首页（精选 / 本周 / 统计 / AI 供应商） |
| `GET /api/mp/archive` | 公共档案全量照片 + 摄影师统计 |
| `GET /api/mp/photos/[id]` | 照片详情（含 viewer 权限标志与相关照片） |
| `GET /api/mp/activities` | 公开活动 + 我的活动 + 入队申请 |
| `GET /api/mp/activities/[slug]` | 活动详情（相册 / 成员 / 申请，权限与 web 一致） |
| `GET /api/mp/studio` | 我的档案总览（统计 / 章节 / 照片 / 可上传活动） |
| `GET /api/mp/hikers/[username]` | 徒步者公开档案 |
| `PATCH /api/mp/profile` | 编辑资料（绕开 better-auth 对 Origin 头的强校验） |

私有图片：`/api/mp/studio`、`/api/mp/activities/[slug]`、`/api/mp/photos/[id]` 会把私有照片 URL 签成短期 `uid/exp/sig` 授权；`GET /api/photos/[id]/image` 校验签名或同源 Cookie，不再接受 session token 查询参数。后端签名密钥为 `MEDIA_URL_SECRET`（未配置时回退到 `BETTER_AUTH_SECRET`）。

读写端点（上传 / 评价 / 点赞 / 公开 / 删除 / 活动 CRUD）全部复用 web 既有 API。

## 运行

### 1. 启动后端

```bash
cd ../gohiking.club.ts
pnpm dev        # http://127.0.0.1:3000，需本地 Postgres（见 web 版 README）
```

### 2. 打开小程序

1. 用微信开发者工具导入本目录
2. `project.config.json` 已默认 `urlCheck: false`（不校验合法域名），可直接请求 `http://127.0.0.1:3000`
3. 在登录页底部「开发选项」中把 API 服务器改为 `http://127.0.0.1:3000`（保存在本地存储，不影响他人）；或直接修改 `utils/config.js` 的 `DEFAULT_BASE_URL`
4. 默认服务器为 `https://gohiking.club`（生产）

本地演示账号：`hiker@gohiking.club` / `trailhead2026`

### 3. 真机 / 生产

- 将 `project.config.json` 的 `appid` 换成你的小程序 AppID
- 小程序管理后台配置 **request 合法域名**：`https://gohiking.club`（需 HTTPS + 已备案，生产域名已满足）
- 上线前建议把 `setting.urlCheck` 恢复为 `true`

## 目录结构

```
app.{js,json,wxss}          全局配置与设计系统（色彩 / 字体 / 按钮 / 表单 tokens）
custom-tab-bar/             自定义底部导航（山野 / 活动 / 放进 / 档案 / 我的）
components/
  photo-tile/               照片卡（网格用）
  score-meter/              观看分（分数 + 3.0 邀请线刻度）
  empty-state/              空态
pages/
  home/                     山野（tab）
  activities/               活动（tab）
  upload/                   放进（tab，上传全流程）
  archive/                  档案（tab，三视图）
  me/                       我的（tab，工作室总览）
  login/                    登录 / 注册（含开发选项）
  photo/                    照片详情
  activity/                 活动详情
  activity-new/             发起活动
  activity-manage/          发起人工作台
  me-activities/            我的活动列表
  profile/                  编辑资料
  hiker/                    徒步者公开档案
utils/
  api.js                    Cookie 会话 / 请求封装 / 上传 / 签名图片 URL
  config.js                 服务器地址（含本地覆盖）
  constants.js              主题 / 强度 / 评分标准（与 web 同源）
  format.js                 日期 / 分数 / 相位 / 分组等纯函数
```

## 已知边界

- AI 观看单张耗时 10–40 秒，观看请求超时设置为 180 秒，上传期间请保持页面打开
- 小程序内分享使用微信原生转发（`onShareAppMessage`）；图片卡片为照片缩略图
- `wx.request` 的会话依赖 Cookie 回传，若服务器将来开启 Bearer 插件可平滑替换
- 私有图片使用 30 分钟短期签名 URL；页面长时间停留后重新进入照片页会重新签发。签名 URL 仍可被转发，但只对单张照片有效，且不包含账号 session token
