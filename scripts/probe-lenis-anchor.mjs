// One-off probe: confirm Lenis is active and anchor links smooth-scroll
// under it, clearing the sticky header. Cleans up after itself.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9229;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "lenis-probe-"))}`,
    "--window-size=1440,900",
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
const consoleLogs = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" ");
    consoleLogs.push(`[${msg.params.type}] ${text}`);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    consoleLogs.push(`[exception] ${JSON.stringify(msg.params.exceptionDetails).slice(0, 500)}`);
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
await sleep(5000); // hydration

const diag = await evaluate(`(() => ({
  hasLenis: typeof window.__lenis !== "undefined" && window.__lenis !== null,
  htmlClass: document.documentElement.className,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
}))()`);
console.log("diag:", JSON.stringify(diag));
if (consoleLogs.length) console.log("console:", consoleLogs.slice(-10).join("\n"));

const lenisActive = diag.hasLenis && diag.htmlClass.includes("lenis");
if (!lenisActive) {
  console.log("=== LENIS NOT ACTIVE — FAIL ===");
  ws.close();
  try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
  process.exit(1);
}

// Click the nav "Services" anchor and sample the scroll position early vs
// settled: a smooth glide is in motion early and lands near the target
// (section top minus the 120px scroll-padding-top, which Lenis honors).
await evaluate(`document.querySelector('.desktop-nav a[href="#services"]').click()`);
await sleep(400);
const yEarly = await evaluate(`Math.round(window.scrollY)`);
await sleep(2500);
const ySettled = await evaluate(`Math.round(window.scrollY)`);
const svcY = await evaluate(
  `Math.round(document.querySelector("#services").getBoundingClientRect().top + window.scrollY)`
);

console.log(JSON.stringify({ yEarly, ySettled, svcY }));
const pass =
  yEarly > 0 && // scroll in motion shortly after the click...
  yEarly < ySettled && // ...still gliding, not an instant jump
  Math.abs(ySettled - (svcY - 120)) < 150; // lands clear of the sticky header
console.log("=== ANCHOR SMOOTH SCROLL:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
