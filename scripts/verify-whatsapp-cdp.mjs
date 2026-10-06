// Verification: drives headless Chrome over CDP and checks the floating
// WhatsApp button behavior — hidden at the top of the page, visible once
// scrolled, and hidden again while the footer is on screen.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9224;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const profileDir = mkdtempSync(join(tmpdir(), "zedeploy-wa-verify-"));

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
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression,
  });
  if (res.result?.exceptionDetails) {
    throw new Error(JSON.stringify(res.result.exceptionDetails));
  }
  return res.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_TO_TEST });
await sleep(4000); // hydration

const stateExpr = `(() => {
  const el = document.querySelector(".whatsapp-float");
  if (!el) return { exists: false };
  const cs = getComputedStyle(el);
  return {
    exists: true,
    hasVisibleClass: el.classList.contains("is-visible"),
    opacity: parseFloat(cs.opacity),
    clickable: cs.pointerEvents === "auto",
  };
})()`;

const results = {};

// 1) At the top of the page: hidden
results.atTop = await evaluate(stateExpr);

// 2) Mid-page: visible
await evaluate(`window.scrollTo({ top: 900, behavior: "instant" })`);
await sleep(600);
results.midPage = await evaluate(stateExpr);

// 3) Footer fully in view: hidden again
await evaluate(
  `window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })`
);
await sleep(800);
results.atFooter = await evaluate(stateExpr);

console.log("at top     :", JSON.stringify(results.atTop));
console.log("mid page   :", JSON.stringify(results.midPage));
console.log("at footer  :", JSON.stringify(results.atFooter));

const pass =
  results.atTop.exists &&
  !results.atTop.hasVisibleClass &&
  results.atTop.opacity === 0 &&
  results.midPage.exists &&
  results.midPage.hasVisibleClass &&
  results.midPage.opacity === 1 &&
  results.midPage.clickable &&
  results.atFooter.exists &&
  !results.atFooter.hasVisibleClass &&
  results.atFooter.opacity === 0;

console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
