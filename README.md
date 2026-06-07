# Doubao TTS Web

一个轻量的英文文本转语音 Web 应用，后端调用火山引擎“豆包语音合成 2.0”V3 SSE 接口。可在本地运行，也可通过 Docker Compose 或 Fly.io 部署。

> 本项目不是火山引擎官方项目。使用前请确认豆包语音服务的开通状态、计费方式和音色权限。

## 功能

- 输入英文文本并生成 MP3
- 默认使用英式英语 2.0 音色
- 选择预设音色或填写自定义音色 ID
- 使用自然语言指令控制情绪、语气和节奏
- 页面内试听并下载音频
- API Key 仅保存在服务端
- 可选 HTTP Basic 登录保护
- 无数据库、无第三方运行时依赖

## 本地运行

需要 Node.js 20 或更高版本。

```bash
cp .env.example .env
```

编辑 `.env`：

```dotenv
VOLCENGINE_API_KEY=你的_API_Key

# 可选。本地不设置密码时不会要求登录。
APP_USERNAME=admin
APP_PASSWORD=

HOST=127.0.0.1
PORT=3000

# Docker Compose 对外端口
DOCKER_PORT=3000
```

启动应用：

```bash
npm start
```

访问 <http://127.0.0.1:3000>。

## Docker

推荐使用 Docker Compose。默认镜像为 `ghcr.io/jayhchen/doubao-tts-web:latest`，根目录的 `.env` 会用于 Compose 变量插值：

```bash
docker compose pull
docker compose up -d
```

访问 <http://127.0.0.1:3000>。查看日志和停止服务：

```bash
docker compose logs -f
docker compose down
```

如需修改宿主机端口，在 `.env` 中设置 `DOCKER_PORT`。如需固定镜像版本，可设置：

```dotenv
DOUBAO_TTS_IMAGE=ghcr.io/jayhchen/doubao-tts-web:v1.0.0
```

容器内部始终监听 `0.0.0.0:3000`，并通过 `/healthz` 执行健康检查。

也可以直接使用 Docker：

```bash
docker build -t doubao-tts-web .
docker run --rm -p 3000:3000 \
  -e VOLCENGINE_API_KEY=你的_API_Key \
  -e APP_PASSWORD=设置一个访问密码 \
  doubao-tts-web
```

容器默认监听 `0.0.0.0:3000`。

## 部署到 Fly.io

项目中的 [fly.toml](./fly.toml) 使用以下策略：

- 从本仓库的 `Dockerfile` 构建镜像
- 部署到 `ams` 区域
- 使用一台 `shared-cpu-1x`、256 MB 内存的 Machine
- Machine 保持运行，不自动停止
- 强制 HTTPS
- 使用 `/healthz` 进行健康检查

### 1. 修改应用名

Fly.io 应用名必须全局唯一。修改 `fly.toml`：

```toml
app = "你的唯一应用名"
```

如需更换区域，同时修改：

```toml
primary_region = "ams"
```

### 2. 创建 Fly 应用

安装并登录 `flyctl` 后执行：

```bash
fly auth login
fly apps create 你的唯一应用名
```

命令中的应用名必须与 `fly.toml` 的 `app` 一致。

### 3. 配置 Secret

Fly.io 地址默认可被公网访问。强烈建议同时设置应用访问密码，避免他人消耗你的火山引擎额度：

```bash
fly secrets set \
  VOLCENGINE_API_KEY=你的_API_Key \
  APP_USERNAME=admin \
  APP_PASSWORD=设置一个强密码
```

不要将这些值写入 `fly.toml` 或提交到 Git。

### 4. 部署

```bash
fly deploy
```

查看状态和日志：

```bash
fly status
fly checks list
fly logs
```

打开应用：

```bash
fly apps open
```

后续代码更新后再次运行 `fly deploy` 即可。

## 发布容器镜像

推送符合 SemVer 的 `v*.*.*` 标签时，GitHub Actions 会运行测试，并将多架构镜像发布到 GHCR：

```bash
git tag v1.0.0
git push origin v1.0.0
```

`v1.0.0` 会生成以下镜像标签：

- `ghcr.io/jayhchen/doubao-tts-web:v1.0.0`
- `ghcr.io/jayhchen/doubao-tts-web:v1.0`
- `ghcr.io/jayhchen/doubao-tts-web:v1`
- `ghcr.io/jayhchen/doubao-tts-web:latest`

镜像支持 `linux/amd64` 和 `linux/arm64`。首次发布后，需要在 GitHub Package 设置中将镜像可见性改为 Public，未登录的 Docker Compose 才能直接拉取。

## 推送到 GitHub

当前仓库已使用 `main` 分支、Conventional Commits 和重新整理后的提交历史。可以使用 GitHub CLI 创建公开仓库：

```bash
gh repo create doubao-tts-web --public --source=. --remote=origin --push
```

也可以先在 GitHub 创建空仓库，再执行：

```bash
git remote add origin git@github.com:jayhchen/doubao-tts-web.git
git push -u origin main
```

## 测试

```bash
npm test
```

## 接口说明

- V3 SSE：`https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse`
- 资源 ID：`seed-tts-2.0`
- 鉴权：`X-Api-Key`
- 输出格式：MP3，24 kHz，128 kbps

默认音色为 Tina 老师 2.0（`zh_female_yingyujiaoxue_uranus_bigtts`），这是官方音色列表中明确标注支持英式英语的 2.0 音色。

Tim、Dacey 和 Stokie 的原生标注为美式英语。页面中的英音预设通过豆包语音合成 2.0 的语音指令能力要求模型使用英式口音。

## 官方文档

- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Compose 环境变量](https://docs.docker.com/compose/how-tos/environment-variables/)
- [GitHub Actions 发布 Docker 镜像](https://docs.github.com/actions/publishing-packages/publishing-docker-images)
- [Fly.io Dockerfile 部署](https://fly.io/docs/languages-and-frameworks/dockerfile/)
- [Fly.io fly.toml 配置](https://fly.io/docs/reference/configuration/)
- [Fly.io Secrets](https://fly.io/docs/apps/secrets/)
- [火山引擎 HTTP Chunked/SSE V3](https://www.volcengine.com/docs/6561/1598757)
- [火山引擎音色列表](https://www.volcengine.com/docs/6561/1257544)

## License

[MIT](./LICENSE)
