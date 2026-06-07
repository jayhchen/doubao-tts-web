# Security Policy

## Sensitive configuration

不要在 Issue、日志、截图或提交中公开以下信息：

- `VOLCENGINE_API_KEY`
- `APP_PASSWORD`
- Fly.io access token

生产部署应使用 `fly secrets set` 保存敏感配置，不要把密钥写入 `fly.toml`。

## Reporting a vulnerability

请优先通过 GitHub 仓库的 **Security** 页面提交私密漏洞报告，不要创建公开 Issue。报告中请包含受影响版本、复现步骤和潜在影响。
