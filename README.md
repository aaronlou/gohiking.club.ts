# 山行档案 · GOHIKING.CLUB

> 只留下值得背下山的照片。

一个面向户外徒步群体的影像档案馆。注册用户上传照片后，由真实的多模态视觉模型从光影、构图、山野叙事与独特观看四个维度评分（1–5 分）。低于 **3.0** 的照片不进入公开档案，会得到具体的中文原因，并在 **24 小时**后自动清理；入选照片会保留完整的评审手记，并按主题、月份、摄影师重新组织。

网站同时包含一个「电子相机工坊」：用户可以装配属于自己的机身、镜头、胶片配方、背带与刻字，获得唯一序列号、下载规格卡，并直接打开取景器拍下下一张照片。

![首页](./docs/screenshot-home.jpg)

![相机工坊](./docs/screenshot-camera.jpg)

---

## 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 前端 / 全栈 | **Next.js 16 App Router + React 19 + TypeScript 5.9** | Server Components 负责档案查询，Client Components 负责上传、评审与相机交互 |
| 样式 | **Tailwind CSS 4 + 自建设计系统** | 纸张、墨绿、信号橙，Instrument Serif + 宋体；大量自定义 CSS 建立杂志式排版 |
| 数据库 | **PostgreSQL 16 + Drizzle ORM 0.45** | 类型安全 schema、SQL 迁移、事务、关系建模 |
| 认证 | **Better Auth 1.7 + Drizzle adapter** | 邮箱密码、会话 Cookie、用户名/简介扩展字段 |
| 图像处理 | **Sharp + exifr** | 自动旋转、2200px WebP、720px 缩略图、LQIP、EXIF/GPS 提取 |
| 多模态评审 | **Ollama / Qwen3.5 视觉模型** 或任意 **OpenAI-compatible** 视觉端点 | 结构化 JSON 输出、截图/非现场硬性筛查、分数硬上限 |
| 测试 | **Vitest 5** | 评分归一化、筛查规则、档案分组、工具函数 |
| 部署 | **Docker Multi-stage + Docker Compose** | Next standalone、Postgres、持久化媒体卷、自动迁移、健康检查 |

### 代码结构

```
src/
  app/                 页面与 Route Handlers
    api/photos/        上传、评审、媒体读取、删除、点赞
    api/cameras/       相机保存、规格卡 SVG
    archive/ photo/    公共档案浏览
    studio/            登录后的工作台与上传
    camera/            电子相机工坊
  components/          设计系统组件、上传/相机客户端交互
  server/
    ai/                评分 prompt、结构化 schema、Provider 适配
    db/                Drizzle schema 与连接
    media/             Sharp 处理、本地媒体存储
    photos/            查询与领域服务
    cameras/           相机领域服务、SVG 卡片
  lib/                 主题、相机预设、校验、客户端上传 API
seed/                  演示照片、演示用户、相机与评审文本
docker/                迁移脚本与入口脚本
drizzle/               已生成的 SQL 迁移
```

### 数据建模

- `user / session / account / verification`：Better Auth 标准模型，额外扩展 `username / bio / homeBase`。
- `photos`：核心聚合。包含状态机 `evaluating → accepted | rejected | failed`、评分与结构化 AI 理由、EXIF、可见性、软删除保留期限和媒体键。
- `cameras`：用户装配的电子相机，唯一序列号，关联拍摄来源。
- `likes`：用户与照片的复合主键，事务内维护 `likeCount`。
- 服务层负责状态流转和文件移动：评审前文件在 `quarantine/`，达到 3 分才移动到 `photos/`。低于 3 分的记录保留 24 小时用于解释，然后由内置定时任务/`/api/cron/cleanup` 清理文件与数据库记录。

---

## 本地启动

### 前置条件

- Node.js **22+**（开发使用 Node 25 验证）
- pnpm **10+**
- Docker（用于 Postgres；也可以使用本机 PostgreSQL）
- 可选：Ollama + 视觉模型，用于真实 AI 评分

### 1. 安装依赖

```bash
pnpm install
cp .env.example .env
# 修改 BETTER_AUTH_SECRET / DATABASE_URL（如需要）
```

生成一个安全的 secret：

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

`.env` 默认对应：

```dotenv
DATABASE_URL=postgresql://gohiking:gohiking@127.0.0.1:54329/gohiking
```

### 3. 迁移并写入演示内容

```bash
pnpm db:migrate
pnpm db:seed
```

演示账号：

```text
邮箱：hiker@gohiking.club
密码：trailhead2026
```

> 演示账号只用于本地评审；上线前请勿在生产环境运行 seed，或立即修改/删除这些账号。

### 4. 准备视觉模型

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

也可以用任意 OpenAI-compatible 视觉模型：

```dotenv
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4.1-mini
```

评分不依赖前端密钥，所有模型调用都发生在 Route Handler。

### 5. 启动

```bash
pnpm dev
```

打开 **http://localhost:3000**。

常用命令：

```bash
pnpm typecheck       # TypeScript
pnpm test            # Vitest
pnpm build           # 生产构建
pnpm start           # 生产模式（需先 build）
pnpm media:check seed/assets/forest-light.jpg  # 直接测试视觉评审
pnpm db:studio       # Drizzle Studio
```

---

## 真实 AI 评审链路

1. 浏览器上传原图到 `/api/photos`，图片先进入隔离区。
2. Sharp 校验尺寸、自动旋转，生成 2200px display / 720px thumb / 24px blur，并保持原图宽高比。
3. `exifr` 提取拍摄时间、器材、光圈、快门、ISO 与 GPS。GPS 只保存在数据库，不向公开页面暴露。
4. 客户端调用 `/api/photos/[id]/evaluate`。
5. 服务端把 1280px JPEG + 标题/主题/地点发给视觉模型，要求返回严格 JSON：
   - `score`、`medium`、`hasOutdoorContext`
   - `summary`（80–140 字中文评审）
   - `strengths[]`、`improvements[]`、`tags[]`、`theme`
6. 归一化与硬规则：
   - `medium !== "photograph"`（截图、文档、插画等）→ 分数不得高于 **1.8**，并覆盖为用户可理解的“截图不是现场照片”说明。
   - `hasOutdoorContext === false` → 分数不得高于 **2.9**。
   - 其余分数四舍五入到 1 位小数。
7. `score >= 3.0`：文件从隔离区移动到长期媒体区，状态 `accepted`，保留评审理由。
8. `score < 3.0`：状态 `rejected`，保留完整原因与 24 小时倒计时；到期由定时清理任务删除文件与记录。
9. 模型/网络失败：状态 `failed`，原图安全保留，用户可在工作台重新评审。

提示词位于 `src/server/ai/prompt.ts`，硬性规则在 `src/server/ai/schema.ts`。截图规则经过真实测试：一张包含网页的照片截图被限制到 1.5 分并明确解释，而不是因为截图里有一张风景照就被误收录。

---

## 功能清单

- [x] 邮箱注册 / 登录 / 会话保护
- [x] 照片上传、拖拽、EXIF 提取、进度显示
- [x] 多模态 1–5 分评审、中文评审手记、入选/未入选解释
- [x] 截图/非现场图像硬性筛查
- [x] 低于 3 分 24 小时隔离、倒计时、立即清理
- [x] 公开首页 / 本期山脊 / 评分标准
- [x] 完整档案：按主题、月份、摄影师浏览
- [x] 单张照片详情、EXIF、评审理由、作者、相关照片
- [x] 摄影师公开档案 `/hikers/[username]`
- [x] 个人工作室：统计、状态筛选、重新评审、清理
- [x] 公开/仅自己可见
- [x] 点赞（登录后）
- [x] 电子相机工坊：5 机身 / 3 镜头 / 5 胶片 / 3 背带 / 刻字 / 序列号
- [x] 相机规格卡 SVG 导出
- [x] 浏览器取景器拍摄 + 胶片滤镜 + 直接提交评审
- [x] 响应式移动端、可访问的表单标签与菜单
- [x] 404 / 错误页、robots、sitemap、健康检查
- [x] Docker / Compose / 迁移 / 媒体持久化 / 健康检查
- [x] 单元测试与完整 E2E 手工验证

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

首次启动会自动执行 Drizzle 迁移。媒体存储在 `media` Docker volume，数据库存储在 `pgdata` volume。

### 3. 可选：写入演示内容

```bash
docker compose --profile seed run --rm seed
```

### 4. 反向代理

生产环境建议放在 Caddy / Nginx / Traefik 后，并启用 HTTPS。若使用 HTTPS，必须设置 `AUTH_SECURE_COOKIES=true`，同时保证 `APP_URL` 和 `BETTER_AUTH_URL` 都是最终 HTTPS 域名。上传限制默认 30MB，请同步调整反向代理的 `client_max_body_size`。

### 5. 运维

- 健康检查：`GET /api/health`（数据库 + 媒体目录）
- 手动清理：`POST /api/cron/cleanup`，Header `Authorization: Bearer $CRON_SECRET`
- 备份：备份 `pgdata` 与 `media` 两个 volume
- 外部 AI：容器内若访问宿主机 Ollama，Compose 已加入 `host.docker.internal` 映射；生产更推荐 OpenAI-compatible 托管端点。
- 单机对象存储：媒体使用本地卷。若要多副本/Serverless 部署，请将 `src/server/media/storage.ts` 替换为 S3/R2 驱动，并把媒体读取 Route 改为签名 URL。

---

## 设计说明

视觉方向是「山野杂志 + 暗房档案」：

- 纸张色 `#f3eee3` 与深林绿 `#202b22` 作为基础，信号橙只用于评分/入选这类编辑判断。
- Instrument Serif 的西文展示字与宋体中文形成跨语种编辑气质；DM Mono 只用于坐标、编号和元数据。
- 首页的大幅非对称双图、旋转的评分印章、错位卡片和等高线纹理，刻意避开常见 SaaS 卡片模板。
- 影像网格以 12 栏编辑节奏组织，移动端改为单列大幅图像，保留观看的呼吸。
- 相机用纯 CSS 渲染，支持实时改变机身/镜头/胶片/刻字；规格卡用 SVG 生成，不依赖截图工具。

---

## 已知边界

- 演示照片来自 Unsplash，仅用于产品演示；来源见 [`seed/CREDITS.md`](seed/CREDITS.md)。
- 当前 AI 评分默认指向本机 Ollama；如果未启动 Ollama 或没有配置云模型，上传会明确提示“评审服务未就绪”，而不是伪造分数。
- 本地媒体卷是单实例方案；生产横向扩容需要对象存储。
- 电子相机是「观看设定 + 浏览器取景器」，不是实体相机或真实 RAW 处理管线。
- 演示账号与 seed 数据只适合验证；生产上线前请清理并更换密码。

---

## License

项目代码为私有项目。演示照片遵循 Unsplash License，具体见 `seed/CREDITS.md`。
