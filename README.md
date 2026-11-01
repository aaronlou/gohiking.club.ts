# 山行档案 · GOHIKING.CLUB

> 把走过的山野，好好收起来。

一个面向户外徒步群体的影像档案馆。注册用户放进照片后，由真实的多模态视觉模型从光影、构图、山野叙事与独特观看四个维度写下一份 1–5 分的中文观看手记。3.0 分以上的照片进入公共档案；还没到 3 分的照片不会被公开，也不会被否定，而是先回到只属于拍摄者的暂存区，保留 24 小时供阅读手记，然后自动移除。

网站希望做到的不是“淘汰照片”，而是让每一张被带回来的照片，都得到一次认真、温和的看见。

![首页](./docs/screenshot-home.jpg)

![移动端首页](./docs/screenshot-mobile.jpg)

---

## 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 前端 / 全栈 | **Next.js 16 App Router + React 19 + TypeScript 5.9** | Server Components 负责档案查询，Client Components 负责上传、观看反馈与移动端交互 |
| 样式 | **Tailwind CSS 4 + 自建设计系统** | 纸张、墨绿、信号橙；Instrument Serif + 宋体；杂志式排版 |
| 数据库 | **PostgreSQL 16 + Drizzle ORM 0.45** | 类型安全 schema、SQL 迁移、事务、关系建模 |
| 认证 | **Better Auth 1.7 + Drizzle adapter** | 邮箱密码、会话 Cookie、用户名/简介扩展字段 |
| 图像处理 | **Sharp + exifr** | 自动旋转、2200px WebP、720px 缩略图、LQIP、EXIF/GPS 提取 |
| 多模态观看 | **Ollama / Qwen3.5 视觉模型** 或任意 **OpenAI-compatible** 视觉端点 | 结构化 JSON 输出、截图/非现场硬性筛查、温和的中文反馈 |
| 测试 | **Vitest 5** | 评分归一化、筛查规则、档案分组、工具函数 |
| 部署 | **Docker Multi-stage + Docker Compose** | Next standalone、Postgres、持久化媒体卷、自动迁移、健康检查 |

### 代码结构

```
src/
  app/                 页面与 Route Handlers
    api/photos/        上传、观看、媒体读取、删除、点赞
    archive/ photo/    公共档案与单张照片
    studio/            登录后的个人档案与上传
  components/          设计系统、上传/观看反馈、移动端底部导航
  server/
    ai/                观看 prompt、结构化 schema、Provider 适配
    db/                Drizzle schema 与连接
    media/             Sharp 处理、本地媒体存储
    photos/            查询与领域服务
  lib/                 主题、校验、客户端上传 API
seed/                  演示照片、演示用户与观看手记
docker/                迁移与容器入口
drizzle/               已生成的 SQL 迁移
```

### 数据建模

- `user / session / account / verification`：Better Auth 标准模型，额外扩展 `username / bio / homeBase`。
- `photos`：核心聚合。状态机为 `evaluating → accepted | rejected | failed`；包含评分、结构化观看手记、EXIF、可见性、暂存到期时间和媒体键。
- `likes`：用户与照片的复合主键，事务内维护 `likeCount`。
- 文件状态流转：上传后先进入 `quarantine/`；达到 3 分才移动到长期 `photos/`。未到 3 分的记录保留 24 小时，之后由内置定时任务和 `/api/cron/cleanup` 移除文件与记录。

---

## 本地启动

### 前置条件

- Node.js **22+**（开发使用 Node 25 验证）
- pnpm **10+**
- Docker（用于 Postgres；也可以使用本机 PostgreSQL）
- 可选：Ollama + 视觉模型，用于真实 AI 观看

### 1. 安装

```bash
pnpm install
cp .env.example .env
```

生成 secret：

```bash
openssl rand -hex 32
```

### 2. 启动数据库

```bash
docker run -d \
  --name gohiking-db-local \
  -e POSTGRES_USER=gohiking \
  -e POSTGRES_PASSWORD=gohiking \
  -e POSTGRES_DB=gohiking \
  -p 127.0.0.1:54329:5432 \
  postgres:16-alpine
```

`.env` 默认 DATABASE_URL：

```dotenv
DATABASE_URL=postgresql://gohiking:gohiking@127.0.0.1:54329/gohiking
```

### 3. 迁移与演示内容

```bash
pnpm db:migrate
pnpm db:seed
```

演示账号：

```text
邮箱：hiker@gohiking.club
密码：trailhead2026
```

> 演示账号只用于本地验证。上线前请勿在生产环境运行 seed，或立即更换账号密码。

### 4. 准备观看照片的模型

本机已安装 Ollama 时：

```bash
ollama pull qwen3.5:9b
ollama serve
```

`.env`：

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:9b
```

也可以使用任意 OpenAI-compatible 视觉模型：

```dotenv
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4.1-mini
```

所有模型调用都发生在 Route Handler，前端不接触密钥。

### 5. 启动

```bash
pnpm dev
```

打开 **http://localhost:3000**。

常用命令：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm start
pnpm media:check seed/assets/forest-light.jpg
pnpm db:studio
```

---

## 真实 AI 观看链路

1. 浏览器上传原图到 `/api/photos`，文件先进入只给拍摄者看的暂存区。
2. Sharp 校验尺寸、自动旋转，生成 2200px display / 720px thumb / 24px blur，并保留原图宽高比。
3. `exifr` 提取拍摄时间、器材、光圈、快门、ISO 与 GPS。GPS 只保存在数据库，不向公开页面暴露。
4. 客户端调用 `/api/photos/[id]/evaluate`。
5. 服务端把 1280px JPEG + 标题/主题/地点交给视觉模型，要求严格 JSON：
   - `score`、`medium`、`hasOutdoorContext`
   - `summary`（中文观看手记）
   - `strengths[]`、`improvements[]`、`tags[]`、`theme`
6. 归一化与硬规则：
   - `medium !== "photograph"`（截图、文档、插画等）→ 分数不得高于 **1.8**，并给出温和、明确的说明。
   - `hasOutdoorContext === false` → 分数不得高于 **2.9**。
   - 分数四舍五入到 1 位小数，但原始分数低于 3.0 时不会被四舍五入“挤进”公共档案。
7. `score >= 3.0`：文件移动到长期媒体区，状态 `accepted`，手记随照片保存。
8. `score < 3.0`：状态 `rejected`，照片先留给拍摄者 24 小时；到期自动移除，也可提前删除。
9. 模型/网络失败：状态 `failed`，原图安全保留，用户可以在个人档案里再看一次。

提示词位于 `src/server/ai/prompt.ts`，硬规则在 `src/server/ai/schema.ts`。提示词明确要求模型先看见拍摄者的努力，再谈画面，避免使用否定照片价值的词。

---

## 功能清单

- [x] 邮箱注册 / 登录 / 会话保护
- [x] 照片上传、拖拽、EXIF 提取、进度显示
- [x] 多模态 1–5 分观看、中文观看手记、温柔而具体的选择说明
- [x] 截图 / 非现场图像硬性筛查
- [x] 3.0 分进入公共档案；未到时 24 小时暂存、倒计时、提前删除
- [x] 公开首页 / 本期山脊 / 我们如何观看
- [x] 完整档案：按主题、月份、摄影师浏览
- [x] 单张照片详情、EXIF、完整手记、作者、相关照片
- [x] 摄影师公开档案 `/hikers/[username]`
- [x] 个人工作室：统计、状态筛选、继续观看、温暖的手记
- [x] 公开 / 仅自己可见
- [x] 点赞（登录后）
- [x] **移动端底部 App 式导航**：山野 / 档案 / 放进 / 我的
- [x] **移动端双列影像流**：首图与中场大幅图交错，减少滚动长度
- [x] 表单控件 16px，避免 iOS 聚焦自动放大；触控目标 ≥ 44–50px
- [x] PWA manifest、Apple touch icon、安全区适配、图片 `srcSet`
- [x] 404 / 错误页、robots、sitemap、健康检查
- [x] Docker / Compose / 迁移 / 媒体持久化 / 健康检查
- [x] 单元测试与完整桌面/移动端手工验证

---

## 移动端设计

手机是第一批访问者最可能使用的入口，因此移动端不是桌面的缩小版：

- 底部悬浮 Dock 提供「山野 / 档案 / 放进 / 我的」四个主要动作；在工作台和登录页自动隐藏，避免遮挡表单。
- 首页影像改为双列节奏：第一张与第四张全宽，其余两张并列；整页高度从约 10,000px 降到约 6,800px。
- 所有输入框在手机上是 16px，避免 iOS Safari 聚焦时缩放页面。
- 主题选择改为两列，上传流程更短；触控目标至少 40–50px。
- 图片提供 `srcSet`，手机加载 720px 缩略图，桌面按需加载 2200px 大图。
- 底部安全区 `env(safe-area-inset-bottom)`、PWA manifest 与 Apple 图标已配置。
- 存档筛选、主题横向浏览、相关照片与页脚都做了触控与滚动适配。
- 已用 390×844 的真实移动视口逐页验证，无横向溢出。

---

## Docker 生产部署

### 1. 准备环境变量

```bash
cp .env.docker.example .env
```

至少修改：

```dotenv
APP_URL=https://your-domain.example
BETTER_AUTH_URL=https://your-domain.example
BETTER_AUTH_SECRET=<openssl rand -hex 32>
AUTH_SECURE_COOKIES=true
POSTGRES_PASSWORD=<strong-password>
AI_PROVIDER=openai
AI_API_KEY=<key>
AI_MODEL=gpt-4.1-mini
CRON_SECRET=<random>
```

### 2. 构建并启动

```bash
docker compose up -d --build
```

App：`http://localhost:3000`（或 `APP_PORT`）。

首次启动会自动执行 Drizzle 迁移。媒体存储在 `media` volume，数据库存储在 `pgdata` volume。

### 3. 可选：写入演示内容

```bash
docker compose --profile seed run --rm seed
```

### 4. 反向代理

生产建议放在 Caddy / Nginx / Traefik 后并启用 HTTPS。使用 HTTPS 时设置 `AUTH_SECURE_COOKIES=true`，并确保 `APP_URL` 与 `BETTER_AUTH_URL` 都是最终域名。上传限制默认 30MB，请同步调整反向代理的 `client_max_body_size`。

### 5. 运维

- 健康检查：`GET /api/health`（数据库 + 媒体目录）
- 手动清理：`POST /api/cron/cleanup`，Header `Authorization: Bearer $CRON_SECRET`
- 备份：备份 `pgdata` 与 `media` 两个 volume
- 生产更推荐 OpenAI-compatible 托管视觉端点；容器访问宿主机 Ollama 时，Compose 已配置 `host.docker.internal`
- 媒体为本地卷；多副本部署请替换为 S3/R2 存储驱动

---

## 设计说明

视觉方向是「山野杂志 + 暗房档案」：

- 纸张色 `#f3eee3` 与深林绿 `#202b22` 作为基础，信号橙只用于“放进档案”和关键动作。
- Instrument Serif 的西文展示字与宋体中文形成跨语种编辑气质；DM Mono 只用于坐标、编号和元数据。
- 首页的大幅非对称双图、旋转的评分印章、错位卡片和等高线纹理，避开常见 SaaS 卡片模板。
- 影像网格以 12 栏编辑节奏组织；移动端重排为双列，保留观看的呼吸。
- 文案从“筛选”改为“观看”：不是评判一张照片值不值得存在，而是告诉拍摄者，这一次哪里打动了人，下一次可以怎样更好。

---

## 已知边界

- 演示照片来自 Unsplash，仅用于产品演示；来源见 [`seed/CREDITS.md`](seed/CREDITS.md)。
- 当前 AI 观看默认指向本机 Ollama；如果未启动 Ollama 或没有配置云模型，上传会明确提示模型尚未就绪，而不是伪造分数。
- 本地媒体卷是单实例方案；生产横向扩容需要对象存储。
- AI 评分是一种编辑参考，不是照片价值的判决。
- 演示账号与 seed 数据只适合验证；生产上线前请移除并更换密码。

---

## License

项目代码为私有项目。演示照片遵循 Unsplash License，具体见 `seed/CREDITS.md`。
