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

请不要提交 `.env`、API Key、Fly.io Secret 或生成的音频文件。提交应聚焦于一个明确问题，并为行为变化补充测试。
