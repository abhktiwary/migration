#!/usr/bin/env node
/**
 * Smoke-test script for Boltic Execution Commands.
 * Exits 0 and prints clear markers so you can find output in serverless logs.
 */

console.log("=== BOLTIC EXECUTION COMMAND: ping ===");
console.log("status: ok");
console.log("timestamp:", new Date().toISOString());
console.log("cwd:", process.cwd());
console.log("node:", process.version);
