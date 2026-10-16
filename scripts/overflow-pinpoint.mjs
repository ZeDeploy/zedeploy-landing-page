// Pinpoint: which element actually creates the document horizontal
// scroll overflow (toggle each suspect display:none and re-measure).
// Usage: node scripts/overflow-pinpoint.mjs [url]
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9236;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "ovf-pin-"))}`,
    "--window-size=390,844",
    "--no-first-run",
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

const ws = new WebSocket(await findPageWsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

const send = (method, params = {}) =>
  new Promise((resolve) => {
    pending.set(++msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression,
  });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_TO_TEST });
await sleep(4500);

const suspects = [
  ".services",
  ".hero",
  "svg.stats-growth-line",
  ".stats-growth-bg",
  ".hero-glass-orbs",
  ".orb-gold",
  ".orb-green",
  ".stats",
  ".final-cta",
  ".form-wrapper",
  ".footer",
  ".infra-visual",
  ".service-card",
  ".contact-card",
];

const sw = () => evaluate(`document.scrollingElement.scrollWidth`);
console.log("baseline scrollWidth:", await sw());
console.log(
  "services overflow style:",
  await evaluate(
    `getComputedStyle(document.querySelector(".services")).overflow`,
  ),
);

for (const sel of suspects) {
  const result = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    const prev = el.style.display;
    el.style.display = "none";
    const w = document.scrollingElement.scrollWidth;
    el.style.display = prev;
    return w;
  })()`);
  console.log(`hide ${sel}: scrollWidth ${result ?? "(not found)"}`);
}

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
