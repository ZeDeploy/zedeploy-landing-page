// Diagnostic: loads the landing page in headless Chrome over CDP and
// dumps every browser-console error/warning plus any uncaught exception.
// Usage: node scripts/check-console-cdp.mjs [url]
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const profileDir = mkdtempSync(join(tmpdir(), "zedeploy-console-"));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profileDir}`,
    "--window-size=1440,900",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findPageWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

const wsUrl = await findPageWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const exceptions = [];
const consoleEntries = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    exceptions.push(d.exception?.description || d.text);
  } else if (msg.method === "Runtime.consoleAPICalled") {
    const type = msg.params.type;
    if (type === "error" || type === "warning" || type === "assert") {
      const text = (msg.params.args ?? [])
        .map((a) => a.value ?? a.description ?? JSON.stringify(a.preview?.properties ?? a))
        .join(" ");
      consoleEntries.push(`[console.${type}] ${text}`);
    }
  } else if (msg.method === "Log.entryAdded") {
    const { source, level, text } = msg.params.entry;
    if (level === "error" || level === "warning") {
      consoleEntries.push(`[${source}.${level}] ${text}`);
    }
  }
};

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Page.navigate", { url: URL_TO_TEST });
// Let hydration + entry animations run before snapshotting the console.
await sleep(9000);

console.log(`=== Loaded ${URL_TO_TEST} ===`);
console.log("=== UNCAUGHT EXCEPTIONS ===");
exceptions.length ? exceptions.forEach((e) => console.log(e)) : console.log("(none)");
console.log("=== CONSOLE ERRORS / WARNINGS ===");
consoleEntries.length ? consoleEntries.forEach((e) => console.log(e)) : console.log("(none)");

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(0);
