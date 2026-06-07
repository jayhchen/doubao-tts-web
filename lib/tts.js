import { randomUUID } from "node:crypto";

export const TTS_ENDPOINT =
  "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse";
export const RESOURCE_ID = "seed-tts-2.0";

const SUCCESS_CODES = new Set([0, 20000000]);
const SAMPLE_RATES = new Set([16000, 24000, 48000]);

export class TtsError extends Error {
  constructor(message, { status = 502, logId = "", code = null } = {}) {
    super(message);
    this.name = "TtsError";
    this.status = status;
    this.logId = logId;
    this.code = code;
  }
}

export function validateTtsInput(input) {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const speaker =
    typeof input.speaker === "string" ? input.speaker.trim() : "";
  const instruction =
    typeof input.instruction === "string" ? input.instruction.trim() : "";
  const sampleRate = Number(input.sampleRate ?? 24000);
  const speechRate = Number(input.speechRate ?? 0);
  const loudnessRate = Number(input.loudnessRate ?? 0);

  if (!text) {
    throw new TtsError("请输入要朗读的英文文本。", { status: 400 });
  }
  if (text.length > 10000) {
    throw new TtsError("文本过长，请控制在 10000 个字符以内。", {
      status: 400,
    });
  }
  if (!speaker || !/^[A-Za-z0-9_-]+$/.test(speaker)) {
    throw new TtsError("音色 ID 不合法。", { status: 400 });
  }
  if (!SAMPLE_RATES.has(sampleRate)) {
    throw new TtsError("采样率仅支持 16000、24000 或 48000。", {
      status: 400,
    });
  }
  if (!Number.isFinite(speechRate) || speechRate < -50 || speechRate > 100) {
    throw new TtsError("语速必须在 -50 到 100 之间。", { status: 400 });
  }
  if (
    !Number.isFinite(loudnessRate) ||
    loudnessRate < -50 ||
    loudnessRate > 100
  ) {
    throw new TtsError("音量必须在 -50 到 100 之间。", { status: 400 });
  }
  if (instruction.length > 500) {
    throw new TtsError("语音指令请控制在 500 个字符以内。", {
      status: 400,
    });
  }

  return {
    text,
    speaker,
    instruction,
    sampleRate,
    speechRate,
    loudnessRate,
  };
}

export function buildPayload(input) {
  const values = validateTtsInput(input);
  const additions = { explicit_language: "en" };

  if (values.instruction) {
    additions.context_texts = [values.instruction];
  }

  return {
    user: {
      uid: "doubao-tts-local",
    },
    req_params: {
      text: values.text,
      speaker: values.speaker,
      audio_params: {
        format: "mp3",
        sample_rate: values.sampleRate,
        bit_rate: 128000,
        speech_rate: values.speechRate,
        loudness_rate: values.loudnessRate,
      },
      additions: JSON.stringify(additions),
    },
  };
}

export function parseSseText(text) {
  const events = [];
  const normalized = text.replace(/\r\n/g, "\n");

  for (const block of normalized.split("\n\n")) {
    if (!block.trim()) {
      continue;
    }

    let event = "message";
    const dataLines = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length > 0) {
      events.push({ event, data: dataLines.join("\n") });
    }
  }

  return events;
}

export function collectAudioFromSse(text, logId = "") {
  const chunks = [];
  let usage = null;

  for (const event of parseSseText(text)) {
    let payload;

    try {
      payload = JSON.parse(event.data);
    } catch {
      throw new TtsError("火山引擎返回了无法解析的数据。", { logId });
    }

    if (
      payload.code !== undefined &&
      payload.code !== null &&
      !SUCCESS_CODES.has(Number(payload.code))
    ) {
      throw new TtsError(payload.message || "语音合成失败。", {
        logId,
        code: payload.code,
      });
    }

    if (event.event === "352" && typeof payload.data === "string") {
      chunks.push(Buffer.from(payload.data, "base64"));
    }

    if (payload.usage) {
      usage = payload.usage;
    }
  }

  if (chunks.length === 0) {
    throw new TtsError("语音合成完成，但没有收到音频数据。", { logId });
  }

  return {
    audio: Buffer.concat(chunks),
    usage,
  };
}

export async function synthesizeSpeech(
  input,
  { apiKey, fetchImpl = fetch } = {},
) {
  if (!apiKey) {
    throw new TtsError(
      "未配置 VOLCENGINE_API_KEY，请先创建 .env 文件并填写 API Key。",
      { status: 500 },
    );
  }

  let response;

  try {
    response = await fetchImpl(TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Resource-Id": RESOURCE_ID,
        "X-Api-Request-Id": randomUUID(),
        "X-Control-Require-Usage-Tokens-Return": "text_words",
      },
      body: JSON.stringify(buildPayload(input)),
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    const message =
      error.name === "TimeoutError"
        ? "语音合成请求超时，请稍后重试。"
        : "无法连接火山引擎语音服务，请检查网络后重试。";
    throw new TtsError(message, { status: 502 });
  }

  const logId = response.headers.get("x-tt-logid") || "";
  const body = await response.text();

  if (!response.ok) {
    throw new TtsError(`火山引擎请求失败（HTTP ${response.status}）。`, {
      logId,
    });
  }

  return {
    ...collectAudioFromSse(body, logId),
    logId,
  };
}
