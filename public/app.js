const form = document.querySelector("#ttsForm");
const text = document.querySelector("#text");
const charCount = document.querySelector("#charCount");
const configStatus = document.querySelector("#configStatus");
const speakerPreset = document.querySelector("#speakerPreset");
const customSpeakerField = document.querySelector("#customSpeakerField");
const customSpeaker = document.querySelector("#customSpeaker");
const generateButton = document.querySelector("#generateButton");
const message = document.querySelector("#message");
const result = document.querySelector("#result");
const audioPlayer = document.querySelector("#audioPlayer");
const downloadLink = document.querySelector("#downloadLink");

let audioUrl = "";

function setLoading(loading) {
  generateButton.disabled = loading;
  generateButton.classList.toggle("loading", loading);
  text.readOnly = loading;
}

function showMessage(value, type = "") {
  message.textContent = value;
  message.className = type;
}

function getSpeaker() {
  return speakerPreset.value === "custom"
    ? customSpeaker.value.trim()
    : speakerPreset.value;
}

function getInstruction() {
  const presetInstruction =
    speakerPreset.selectedOptions[0]?.dataset.instruction || "";
  const customInstruction = document.querySelector("#instruction").value.trim();

  return [presetInstruction, customInstruction].filter(Boolean).join(" ");
}

text.addEventListener("input", () => {
  charCount.textContent = String(text.value.length);
});

speakerPreset.addEventListener("change", () => {
  const custom = speakerPreset.value === "custom";
  customSpeakerField.classList.toggle("hidden", !custom);
  customSpeaker.required = custom;
  if (custom) {
    customSpeaker.focus();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const speaker = getSpeaker();
  if (!speaker) {
    showMessage("请输入自定义音色 ID。", "error");
    return;
  }

  setLoading(true);
  result.classList.add("hidden");
  showMessage("正在调用豆包语音合成 2.0，请稍候...", "working");

  try {
    const response = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.value,
        speaker,
        instruction: getInstruction(),
      }),
    });

    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      const logId = details.logId ? `（Log ID: ${details.logId}）` : "";
      throw new Error(`${details.error || "生成失败。"}${logId}`);
    }

    const audioBlob = await response.blob();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;
    downloadLink.href = audioUrl;
    result.classList.remove("hidden");
    showMessage("生成完成。", "success");
    audioPlayer.play().catch(() => {});
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
});

fetch("/api/status")
  .then((response) => response.json())
  .then(({ configured }) => {
    configStatus.textContent = configured
      ? "API Key 已配置"
      : "尚未配置 API Key";
    configStatus.className = configured
      ? "status status-ready"
      : "status status-error";
  })
  .catch(() => {
    configStatus.textContent = "无法检查配置";
    configStatus.className = "status status-error";
  });
