import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isAuthorized } from "./lib/auth.js";
import { loadEnvFile } from "./lib/config.js";
import { synthesizeSpeech, TtsError } from "./lib/tts.js";

loadEnvFile();

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function requireAuthorization(request, response) {
  const authorized = isAuthorized(request.headers.authorization, {
    username: process.env.APP_USERNAME || "admin",
    password: process.env.APP_PASSWORD || "",
  });

  if (authorized) {
    return true;
  }

  response.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "WWW-Authenticate": 'Basic realm="Doubao TTS", charset="UTF-8"',
  });
  response.end("需要登录。");
  return false;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 128 * 1024) {
      throw new TtsError("请求内容过大。", { status: 413 });
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new TtsError("请求 JSON 格式错误。", { status: 400 });
  }
}

async function serveStatic(pathname, response) {
  const requestedPath = pathname === "/" ? "index.html" : pathname;
  const filePath = resolve(publicDir, requestedPath.replace(/^[/\\]+/, ""));

  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${sep}`)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type":
        contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url,
      `http://${request.headers.host || "127.0.0.1"}`,
    );

    if (request.method === "GET" && url.pathname === "/healthz") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (!requireAuthorization(request, response)) {
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      sendJson(response, 200, {
        configured: Boolean(process.env.VOLCENGINE_API_KEY),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/synthesize") {
      const input = await readJson(request);
      const result = await synthesizeSpeech(input, {
        apiKey: process.env.VOLCENGINE_API_KEY,
      });

      response.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": result.audio.length,
        "Content-Disposition": 'inline; filename="doubao-tts.mp3"',
        "Cache-Control": "no-store",
        "X-TTS-Log-Id": result.logId,
        "X-TTS-Text-Words": String(result.usage?.text_words ?? ""),
      });
      response.end(result.audio);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(url.pathname, response);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    const status = error instanceof TtsError ? error.status : 500;
    const message =
      error instanceof TtsError ? error.message : "服务器内部错误。";

    console.error(error);
    sendJson(response, status, {
      error: message,
      code: error.code ?? null,
      logId: error.logId ?? "",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Doubao TTS is running at http://${host}:${port}`);
});
