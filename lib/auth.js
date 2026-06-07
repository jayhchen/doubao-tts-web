import { timingSafeEqual } from "node:crypto";

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isAuthorized(
  authorization,
  { username = "admin", password = "" } = {},
) {
  if (!password) {
    return true;
  }

  if (typeof authorization !== "string" || !authorization.startsWith("Basic ")) {
    return false;
  }

  let credentials;

  try {
    credentials = Buffer.from(authorization.slice(6), "base64").toString(
      "utf8",
    );
  } catch {
    return false;
  }

  const separator = credentials.indexOf(":");
  if (separator === -1) {
    return false;
  }

  return (
    safeEqual(credentials.slice(0, separator), username) &&
    safeEqual(credentials.slice(separator + 1), password)
  );
}
