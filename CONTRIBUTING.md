# Contributing

感谢你参与改进本项目。

## 本地开发

需要 Node.js 20 或更高版本。

```bash
cp .env.example .env
npm start
```

开发时可使用文件监听：

```bash
npm run dev
```

## 提交前检查

```bash
npm test
node --check server.js
node --check lib/auth.js
node --check lib/tts.js
node --check public/app.js
```

## 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
<type>(<scope>): <description>
```

常用类型：

- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 仅文档变化
- `test`: 测试变化
- `refactor`: 不改变行为的重构
- `chore`: 构建、部署或维护工作
- `ci`: 持续集成配置

示例：

```text
feat(tts): add custom voice support
fix(auth): reject malformed basic credentials
chore(deploy): update fly configuration
```

请不要提交 `.env`、API Key、Fly.io Secret 或生成的音频文件。提交应聚焦于一个明确问题，并为行为变化补充测试。
