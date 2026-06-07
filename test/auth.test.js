import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorized } from "../lib/auth.js";

function basic(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

test("authorization is optional when no password is configured", () => {
  assert.equal(isAuthorized(undefined), true);
});

test("authorization accepts matching Basic credentials", () => {
  assert.equal(
    isAuthorized(basic("admin", "secret"), {
      username: "admin",
      password: "secret",
    }),
    true,
  );
});

test("authorization rejects missing or invalid credentials", () => {
  const config = { username: "admin", password: "secret" };

  assert.equal(isAuthorized(undefined, config), false);
  assert.equal(isAuthorized(basic("admin", "wrong"), config), false);
  assert.equal(isAuthorized("Bearer token", config), false);
});
