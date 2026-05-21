#!/usr/bin/env node
/**
 * Logs once per second for 60 seconds, then exits.
 */

const DURATION_SEC = 60;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log("=== 60-second logger started ===");
console.log("timestamp:", new Date().toISOString());

for (let second = 1; second <= DURATION_SEC; second++) {
  console.log(
    `[${String(second).padStart(2, "0")}/${DURATION_SEC}]`,
    new Date().toISOString()
  );
  if (second < DURATION_SEC) {
    await sleep(1000);
  }
}

console.log("=== 60-second logger finished ===");
