# 山行档案 · GOHIKING.CLUB

> 把走过的山野，好好收起来。

**线上地址：** https://gohiking.club

一个面向户外徒步群体的影像档案馆。每一张照片都先属于一次真实的徒步活动；上传后由多模态视觉模型从光影、构图、山野叙事与独特观看四个维度逐张观看，写下一份 1–5 分的中文手记。3.0 分以上才进入活动相册；没到 3 分的照片不会被保存，但会收到具体、温柔的拍摄建议。想公开到公共档案时，再由拍摄者本人决定。

网站希望做到的不是“淘汰照片”，而是让每一张被带回来的照片，都得到一次认真、温和的看见。

一次徒步往往属于一群人，而不是一个人。因此产品以**活动**为第一入口：发起人建立一次同行，其他人申请加入，由发起人确认；只有通过的人能看到活动里的照片、成员名单与集合点。上传照片前必须先选一次已加入的活动，不存在没有活动归属的新照片。活动照片只对同行者可见，不会因为 AI 评分自动公开；想放进公共档案时，由拍摄者本人逐张确认。

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
| 图像处理 | **Sharp + exifr** | 自动旋转、原图尺寸 WebP（按需）、1280px 预览、720px 缩略图、LQIP、EXIF/GPS 提取 |
| 多模态观看 | **Ollama / Qwen3.5 视觉模型** 或任意 **OpenAI-compatible** 视觉端点 | 结构化 JSON 输出、截图/非现场硬性筛查、温和的中文反馈 |
| 测试 | **Vitest 5** | 评分归一化、筛查规则、档案分组、工具函数 |
| 部署 | **Docker Multi-stage + Compose + GitHub Actions/GHCR** | Next standalone、Postgres、持久化媒体卷、自动迁移、健康检查 |

### 代码结构

```
src/
  app/                 页面与 Route Handlers
    api/photos/        上传、观看、媒体读取、删除、点赞、公开
    api/activities/    活动创建、申请、审批、邀请、成员管理
    activities/        活动发现、活动相册、发起人工作台
    archive/ photo/    公共档案与单张照片
    studio/            登录后的个人档案、活动与上传
  components/          设计系统、上传/观看反馈、移动端底部导航
  server/
    activities/        活动权限、查询与领域服务
    ai/                观看 prompt、结构化 schema、Provider 适配
    db/                Drizzle schema 与连接
    media/             Sharp 处理、本地媒体存储
    photos/            查询与领域服务
  lib/                 主题、校验、客户端上传 API
.github/workflows/     GHCR 镜像构建与 seed 镜像发布
deploy/                Caddy 生产站点片段
seed/                  演示照片、演示用户与观看手记
docker/                迁移与容器入口
drizzle/               已生成的 SQL 迁移
```

### 数据建模

- `user / session / account / verification`：Better Auth 标准模型，额外扩展 `username / bio / homeBase`。
- `activities`：一次同行的基本信息（标题、日期、地区、路线、集合点、加入方式、可见性、强度与名额）。`meeting_point` 只对成员返回。
- `activity_members`：成员关系。`role` 为 `host | member`，`status` 为 `pending | approved | rejected | left | removed`；成员资格是相册访问的唯一依据。
- `photos`：核心聚合。新上传必须带有 `activity_id`；状态机为 `evaluating → accepted | rejected | failed`，包含评分、结构化观看手记、EXIF、可见性、媒体键与活动归属。`activity_id` 允许为空只是为了兼容历史数据和活动删除兜底。
- `likes`：用户与照片的复合主键，事务内维护 `likeCount`。只有照片所属活动的已通过成员可以点赞，且不能给自己的照片点赞。
- 文件状态流转：上传后先进入 `quarantine/` 并立即观看。达到 3 分后文件移动到长期 `photos/`，以 `activity` 可见性进入活动相册；没到 3 分的照片在返回手记与建议后立即删除文件与记录。

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

1. 浏览器先选择一个已加入的活动，再上传原图到 `/api/photos`，单张上限 **20MB**；支持一次选择最多 **9 张**（单张独立请求，上传 2 路并发）。`activityId` 是必填项，缺少时接口直接返回 `activity_required`。文件先进入只给拍摄者看的临时区。
2. Sharp 校验尺寸、自动旋转，生成原图尺寸 full / 1280px preview / 720px thumb / 24px blur；网页默认只使用 preview 与 thumb，原图只在点击“查看原图”后请求。
3. `exifr` 提取拍摄时间、器材、光圈、快门、ISO 与 GPS。GPS 只保存在数据库，不向公开页面暴露。
4. 上传接口返回 `evaluating` 状态的记录，客户端立即调用 `/api/photos/[id]/evaluate`；批量上传以最多 3 路并发逐张观看。
5. 服务端把 1280px JPEG + 标题/主题/地点交给视觉模型，要求严格 JSON：
   - `score`、`medium`、`hasOutdoorContext`
   - `summary`（中文观看手记）
   - `strengths[]`、`improvements[]`、`tags[]`、`theme`
6. 归一化与硬规则：
   - `medium !== "photograph"`（截图、文档、插画等）→ 分数不得高于 **1.8**，并给出温和、明确的说明。
   - `hasOutdoorContext === false` → 分数不得高于 **2.9**。
   - 分数四舍五入到 1 位小数，但原始分数低于 3.0 时不会被四舍五入“挤进”公共档案。
7. `score >= 3.0`：文件移动到长期媒体区，状态 `accepted`，手记随照片保存。
8. `score < 3.0`：不进入活动相册；在返回手记与拍摄建议后立即删除文件与记录。
9. 模型/网络失败：状态 `failed`，原图安全保留，用户可以在个人档案里再看一次。
10. **公开是第二次决定**：≥3 分进入活动相册后，照片仍然只对同行者可见；拍摄者在照片页点“放进公共档案”时，才把可见性改为 `public`，不会重新打分。

提示词位于 `src/server/ai/prompt.ts`，硬规则在 `src/server/ai/schema.ts`。提示词明确要求模型先看见拍摄者的努力，再谈画面，避免使用否定照片价值的词。

---

## 概念模型

产品里有四个不同的概念，不要混用：

| 概念 | 是什么 | 关系 |
| --- | --- | --- |
| 活动 | 一次同行的共享容器 | 用户 N:M 活动；活动 1:N 照片 |
| 照片 | 一张影像，属于一个作者 | N:1 用户；N:1 活动（可空） |
| 我的档案 | 以用户为中心的跨活动视图 | 我的照片 ∪ 我参与的活动 |
| 公共档案 | 公开的精选子集 | `visibility=public` 且 `status=accepted` |
| 工作室 | 上传、审批、改资料的操作界面 | 我的档案里的操作模式 |

`我的档案` 和 `公共档案` 都是**派生视图**，不是新的数据表：

```text
我的档案 = { author = 我 的照片 } ∪ { 我 approved 的活动 }
活动相册 = { activity_id = A 的照片 }，且查看者是 A 的 approved 成员
公共档案 = { visibility = public 且 status = accepted 的照片 }
```

一张照片必须属于一个活动（`photos.activity_id`）；新上传没有“单独照片”这一入口。如果以后需要一张照片出现在多个活动里，再加分享表，不要现在把主模型改成多对多。

`/studio` 是「我的档案」：活动章节 + 跨活动照片流 + 统计。活动页是共享相册；公共档案是公开出口；工作室只是操作状态。

## 活动与隐私

活动的核心不是“把照片分组”，而是“一次同行的私密相册 + 一个可选的公开出口”。

- **默认私密**：活动照片的 `visibility` 是 `activity`，公共档案查询不会返回它们。
- **申请制**：活动页只公开标题、日期、简介和影像数量；照片、成员名单、集合点与完整说明只对 `approved` 成员可见。待审批、被婉拒、被移出的用户访问图片会得到 404，而不是 403。
- **单一权限判断**：`src/server/activities/access.ts` 的 `canViewPhotoRecord` 同时被图片 Route Handler、照片详情页和 OG metadata 使用，避免各处手写条件造成漏判。
- **不自动公开**：即使照片评分 ≥3，活动照片也不会自动进入公共档案；公开必须由照片作者本人在照片页触发，且可以随时收回。
- **成员之间不显示 AI 分数与手记**：活动相册按拍摄日分组，手记只给拍摄者本人看，避免一次同行变成作品排名。
- **集合点与成员名单**：只返回给通过申请的人；活动列表与公开页不暴露。
- **缓存**：活动图片返回 `Cache-Control: private, no-store`，公共照片才使用 `immutable`；活动照片页对非公开活动加 `noindex`。

一次完整的流程：

1. 发起人创建活动（名称、日期、地区、路线，可选强度、名额、集合点）。
2. 其他人在活动页申请加入，状态 `pending`，此时看不到任何照片。
3. 发起人在 `/studio/activities` 或活动管理页通过 / 婉拒；通过后状态 `approved`。
4. 成员进入活动页只看到属于这次活动的相册，并可以从活动页直接上传。
5. 上传后立即逐张观看；≥3 分进入相册，只对同行者可见，不自动公开。
6. 拍摄者想公开某一张时，在照片页点“请山野看看，放进公共档案”；≥3 分才公开，否则保留手记继续留在活动内。
7. 发起人可以随时结束报名、移出成员；被移出的人立即失去相册访问权。

## 功能清单

- [x] 邮箱注册 / 登录 / 会话保护
- [x] 照片上传、拖拽、EXIF 提取、进度显示
- [x] 批量上传一次最多 9 张，单张 20MB；上传 2 路并发、观看 3 路并发，≥3 分进入活动相册
- [x] 多模态 1–5 分观看、中文观看手记、温柔而具体的选择说明
- [x] 上传前必须选择活动；API 拒绝没有 `activityId` 的照片
- [x] 截图 / 非现场图像硬性筛查
- [x] 3.0 分进入公共档案；未达 3 分返回具体拍摄建议，且不保存独立照片
- [x] 公开首页 / 本期山脊 / 我们如何观看
- [x] 我的档案：活动章节、跨活动照片流、公开筛选
- [x] 公共档案：按主题、月份、摄影师浏览
- [x] 单张照片详情、EXIF、完整手记、作者、相关照片
- [x] 摄影师公开档案 `/hikers/[username]`
- [x] 个人工作室：统计、状态筛选、继续观看、温暖的手记
- [x] 公开 / 仅自己可见
- [x] 活动内互相点赞：仅同活动已通过成员，不能赞自己
- [x] 分享产品/活动：系统分享面板、微信内右上角引导、复制链接、OG 分享图
- [x] **移动端底部 App 式导航**：山野 / 活动 / 放进 / 档案 / 我的
- [x] **移动端双列影像流**：首图与中场大幅图交错，减少滚动长度
- [x] 表单控件 16px，避免 iOS 聚焦自动放大；触控目标 ≥ 44–50px
- [x] PWA manifest、Apple touch icon、安全区适配、响应式预览图与按需原图
- [x] 单张图片 20MB 上限，客户端与服务端双重校验
- [x] ICP 备案号展示：浙ICP备2024126456号-4（链接工信部备案系统）
- [x] 404 / 错误页、robots、sitemap、健康检查
- [x] Docker / Compose / 迁移 / 媒体持久化 / 健康检查
- [x] 单元测试与完整桌面/移动端手工验证

---

## 移动端设计

手机是第一批访问者最可能使用的入口，因此移动端不是桌面的缩小版：

- 底部 Dock 提供「山野 / 活动 / 放进 / 档案 / 我的」五个主要动作；在工作台和登录页自动隐藏，避免遮挡表单。
- 首页影像改为双列节奏：第一张与第四张全宽，其余两张并列；整页高度从约 10,000px 降到约 6,800px。
- 所有输入框在手机上是 16px，避免 iOS Safari 聚焦时缩放页面。
- 主题选择改为两列，上传流程更短；触控目标至少 40–50px。
- 列表只加载 720px 缩略图，详情先加载 1280px 预览；点击“查看原图”后才请求原始尺寸。原图尺寸的 WebP 只在灯箱中加载，不进入首屏网络请求。
- 底部安全区 `env(safe-area-inset-bottom)`、PWA manifest 与 Apple 图标已配置。
- 存档筛选、主题横向浏览、相关照片与页脚都做了触控与滚动适配。
- 已用 390×844 的真实移动视口逐页验证，无横向溢出。

---

## Docker 生产部署

生产镜像由 GitHub Actions 构建并推送到 GHCR。推送 `main` 后会自动生成：

- `ghcr.io/aaronlou/gohiking.club.ts:latest`
- `ghcr.io/aaronlou/gohiking.club.ts:<commit-sha>`
- `ghcr.io/aaronlou/gohiking.club.ts:seed-latest`（一次性随机密码 seed 镜像）

流水线文件：[`.github/workflows/docker.yml`](.github/workflows/docker.yml)。

### 1. 服务器准备

服务器上只需要一个目录、Docker 和 Compose：

```bash
git clone https://github.com/aaronlou/gohiking.club.ts.git /home/admin/gohiking.club
cd /home/admin/gohiking.club
cp .env.production.example .env
```

编辑 `.env`，至少配置：

```dotenv
POSTGRES_PASSWORD=<strong-password>
BETTER_AUTH_SECRET=<openssl rand -hex 32>
CRON_SECRET=<random>
DEEPSEEK_API_KEY=<vision-capable key>
SHOW_DEMO_ACCOUNT=false
```

生产 Compose 使用 `docker-compose.prod.yml`，只把应用绑定到 `127.0.0.1:3000`，由宿主 Caddy 接 HTTPS。

### 2. 启动数据库与应用

```bash
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
```

首次启动会自动执行数据库迁移。健康检查：

```bash
curl -s http://127.0.0.1:3000/api/health
```

### 3. 可选：写入开放档案内容

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

生产 seed 使用 `SEED_RANDOM_PASSWORDS=true`，五位演示作者的密码是随机生成的，不会显示，也不会与本地演示密码相同。这样公开档案有初始内容，但不存在可被公开尝试的演示登录。登录页在生产环境会自动隐藏演示账号入口（`SHOW_DEMO_ACCOUNT=false`）。

### 4. Caddy HTTPS

在现有 Caddyfile 中新增独立站点，不替换其他站点：

```caddyfile
gohiking.club {
    encode zstd gzip

    request_body {
        max_size 25MB
    }

    tls /etc/caddy/ssl/gohiking.club.pem /etc/caddy/ssl/gohiking.club.key

    header {
        Strict-Transport-Security "max-age=31536000"
        -Server
    }

    reverse_proxy 127.0.0.1:3000
}
```

仓库提供了 [`deploy/Caddyfile.gohiking`](deploy/Caddyfile.gohiking) 作为可直接追加的站点片段。这里复用已签发的 `gohiking.club` 证书（SAN 包含 `www.gohiking.club`），不触发新的 ACME 申请；证书到期时间为 2027-01-24。保存前先备份 Caddyfile，然后：

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
```

验证：

```bash
curl -I https://gohiking.club
curl -I http://gohiking.club
```

### 5. 备案号

全站页脚展示：

```text
浙ICP备2024126456号-4
```

并链接至工信部备案系统 `https://beian.miit.gov.cn/`。该信息在桌面与移动端页脚均可见。

### 6. AI 配置

生产推荐使用支持图片输入的 OpenAI-compatible 模型。当前部署使用 DeepSeek 的 `deepseek-flash`：

```dotenv
AI_PROVIDER=openai
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-flash
DEEPSEEK_API_KEY=...
```

本地没有云模型时仍可切回 Ollama：

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:9b
```

### 7. 运维

- 健康检查：`GET /api/health`（数据库 + 媒体目录）
- 手动清理：`POST /api/cron/cleanup`，Header `Authorization: Bearer $CRON_SECRET`
- 备份：备份 `gohiking_pgdata` 与 `gohiking_media` volume
- 更新：`docker compose -f docker-compose.prod.yml pull app && docker compose -f docker-compose.prod.yml up -d app`
- 媒体为本地卷；多副本部署请替换为 S3/R2 存储驱动
- 若 GHCR 包为私有，服务器需用具备 `read:packages` 的 GitHub token 执行一次 `docker login ghcr.io`

## 设计说明

视觉方向是「山野杂志 + 暗房档案」：

- 纸张色 `#f3eee3` 与深林绿 `#202b22` 作为基础，信号橙只用于“放进档案”和关键动作。
- Instrument Serif 的西文展示字与宋体中文形成跨语种编辑气质；DM Mono 只用于坐标、编号和元数据。
- 首页的大幅非对称双图、旋转的评分印章、错位卡片和等高线纹理，避开常见 SaaS 卡片模板。
- 影像网格以 12 栏编辑节奏组织；移动端重排为双列，保留观看的呼吸。
- 文案从“筛选”改为“观看”：不是评判一张照片值不值得存在，而是告诉拍摄者，这一次哪里打动了人，下一次可以怎样更好。

---

## 已知边界

- 活动审批通知目前只在站内显示（工作室角标与活动页状态），还没有邮件或推送。
- 活动邀请目前按用户名直接加入，还没有邀请链接与有效期。
- 活动相册的批量编辑与排序优化还在后续迭代；批量上传已支持最多 9 张。
- 演示照片来自 Unsplash，仅用于产品演示；来源见 [`seed/CREDITS.md`](seed/CREDITS.md)。
- 当前 AI 观看默认指向本机 Ollama；如果未启动 Ollama 或没有配置云模型，上传会明确提示模型尚未就绪，而不是伪造分数。
- 微信内暂未接入 JS-SDK 自定义分享卡片；使用微信右上角菜单分享，页面提供 OG 标题、说明和分享图，手机系统分享面板通常可以直接选择微信。
- 本地媒体卷是单实例方案；生产横向扩容需要对象存储。
- AI 评分是一种编辑参考，不是照片价值的判决。
- 演示账号与 seed 数据只适合验证；生产上线前请移除并更换密码。

---

## License

项目代码为私有项目。演示照片遵循 Unsplash License，具体见 `seed/CREDITS.md`。
