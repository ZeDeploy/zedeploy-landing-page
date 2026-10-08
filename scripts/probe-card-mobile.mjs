// Probe: fan-out behavior at phone width (390x844). Checks the deck stacks,
// scrubs, lands in final positions, and never causes horizontal overflow.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9233;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";
const WIDTH = parseInt(process.argv[3] ?? "390", 10);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "mobile-probe-"))}`,
    `--window-size=${WIDTH},844`,
    "--force-device-scale-factor=1",
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

const state = () =>
  evaluate(`(() => {
    const cards = document.querySelectorAll(".service-card");
    const r1 = cards[0].getBoundingClientRect();
    const r6 = cards[5].getBoundingClientRect();
    const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };
    const c6 = { x: r6.left + r6.width / 2, y: r6.top + r6.height / 2 };
    const vw = document.documentElement.clientWidth;
    // How far the cards themselves poke past the viewport edges (the
    // animation's responsibility). Pre-existing page overflow (stats
    // SVG, decorative orbs) is out of scope here.
    let cardOverflow = 0;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      cardOverflow = Math.max(cardOverflow, r.right - vw, -r.left, 0);
    }
    return {
      fan: cards[0].style.getPropertyValue("--fan"),
      separation: Math.round(Math.hypot(c1.x - c6.x, c1.y - c6.y)),
      cardOverflow: Math.round(cardOverflow),
    };
  })()`);

const scrollViaLenis = (top) =>
  evaluate(`(() => {
    const l = window.__lenis;
    if (l) l.scrollTo(${top}, { immediate: true, force: true });
    else window.scrollTo({ top: ${top}, behavior: "instant" });
  })()`);

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_TO_TEST });
await sleep(4000);

const svcTop = await evaluate(
  `Math.round(document.querySelector(".services").getBoundingClientRect().top + window.scrollY)`
);

await scrollViaLenis(0);
await sleep(1400);
const stacked = await state();

await scrollViaLenis(svcTop + 600);
await sleep(1600);
const mid = await state();

await scrollViaLenis(svcTop + 1500);
await sleep(1600);
const settled = await state();

console.log("stacked :", JSON.stringify(stacked));
console.log("mid     :", JSON.stringify(mid));
console.log("settled :", JSON.stringify(settled));

const pass =
  stacked.separation < 400 && // single-column deck: vertical stack
  mid.separation > stacked.separation && // fanning out...
  settled.separation > mid.separation && // ...and landing
  settled.fan === "1" &&
  stacked.cardOverflow <= 0 && mid.cardOverflow <= 0 && settled.cardOverflow <= 0; // cards stay on-screen

console.log("=== MOBILE FAN-OUT:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
