import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPayload,
  collectAudioFromSse,
  parseSseText,
  validateTtsInput,
} from "../lib/tts.js";

const baseInput = {
  text: "Hello world.",
  speaker: "zh_female_yingyujiaoxue_uranus_bigtts",
  sampleRate: 24000,
  speechRate: 0,
  loudnessRate: 0,
  instruction: "",
};

test("buildPayload creates a TTS 2.0 English request", () => {
  const payload = buildPayload({
    ...baseInput,
    instruction: "Speak warmly.",
  });
  const additions = JSON.parse(payload.req_params.additions);

  assert.equal(payload.req_params.text, "Hello world.");
  assert.equal(
    payload.req_params.speaker,
    "zh_female_yingyujiaoxue_uranus_bigtts",
  );
  assert.equal(payload.req_params.audio_params.format, "mp3");
  assert.equal(payload.req_params.audio_params.bit_rate, 128000);
  assert.equal(additions.explicit_language, "en");
  assert.deepEqual(additions.context_texts, ["Speak warmly."]);
});

test("validateTtsInput rejects invalid ranges", () => {
  assert.throws(
    () => validateTtsInput({ ...baseInput, speechRate: 101 }),
    /语速/,
  );
  assert.throws(
    () => validateTtsInput({ ...baseInput, sampleRate: 44100 }),
    /采样率/,
  );
});

test("parseSseText parses event and multiline data", () => {
  const events = parseSseText(
    'event: 352\ndata: {"code":0,\ndata: "data":"YQ=="}\n\n',
  );

  assert.deepEqual(events, [
    {
      event: "352",
      data: '{"code":0,\n"data":"YQ=="}',
    },
  ]);
});

test("collectAudioFromSse joins audio chunks and reads usage", () => {
  const sse = [
    `event: 352\ndata: ${JSON.stringify({ code: 0, data: Buffer.from("abc").toString("base64") })}`,
    `event: 352\ndata: ${JSON.stringify({ code: 0, data: Buffer.from("def").toString("base64") })}`,
    `event: 152\ndata: ${JSON.stringify({ code: 20000000, message: "OK", data: null, usage: { text_words: 11 } })}`,
    "",
  ].join("\n\n");

  const result = collectAudioFromSse(sse, "log-id");

  assert.equal(result.audio.toString(), "abcdef");
  assert.deepEqual(result.usage, { text_words: 11 });
});

test("collectAudioFromSse surfaces API errors", () => {
  const sse = `event: 153\ndata: ${JSON.stringify({
    code: 45000000,
    message: "speaker permission denied",
  })}\n\n`;

  assert.throws(
    () => collectAudioFromSse(sse, "log-id"),
    /speaker permission denied/,
  );
});
