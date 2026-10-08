// Verification: drives headless Chrome over CDP and checks the services
// depth-stack & fan-out effect (GSAP ScrollTrigger) — the section pins at
// ~80px from the viewport top while cards start stacked/transformed, glide
// through an intermediate state, and land on their final grid positions.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9226;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const profileDir = mkdtempSync(join(tmpdir(), "zedeploy-fan-verify-"));

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

// Force instant scrolling so measurements aren't taken mid-animation.
await evaluate(`document.documentElement.style.scrollBehavior = "auto"`);

// Scroll through Lenis when it's active — a raw window.scrollTo gets
// overridden by Lenis's lerped internal scroll state on the next tick.
const scrollTo = (top) =>
  evaluate(`(() => {
    const l = window.__lenis;
    if (l) l.scrollTo(${top}, { immediate: true, force: true });
    else window.scrollTo({ top: ${top}, behavior: "instant" });
  })()`);

const stateExpr = `(() => {
  const section = document.querySelector(".services");
  const cards = document.querySelectorAll(".service-card");
  if (!section || cards.length !== 6) return { ok: false, cardCount: cards.length };
  // Visual separation: distance between the centers of card 1 and card 6
  // (layout + transform). Stacked deck => small; fanned grid => large.
  const r1 = cards[0].getBoundingClientRect();
  const r6 = cards[5].getBoundingClientRect();
  const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };
  const c6 = { x: r6.left + r6.width / 2, y: r6.top + r6.height / 2 };
  return {
    ok: true,
    fan1: cards[0].style.getPropertyValue("--fan"),
    transform1: getComputedStyle(cards[0]).transform,
    cardSeparation: Math.round(Math.hypot(c1.x - c6.x, c1.y - c6.y)),
    sectionTop: Math.round(section.getBoundingClientRect().top),
    // All cards must stay fully opaque during the scrub — any fade-in
    // running concurrently with the fan-out reads as flicker.
    opacities: [...cards].map((c) => getComputedStyle(c).opacity),
  };
})()`;

const results = {};

// 1) Top of page: services below the fold — cards stacked (fan = 0)
await scrollTo(0);
await sleep(700);
results.stacked = await evaluate(stateExpr);

// Document offset of the section (measured before pinning kicks in).
const svcTop = await evaluate(
  `Math.round(document.querySelector(".services").getBoundingClientRect().top + window.scrollY)`
);

// 2) Scroll ~500px into the 1200px pinned scrub: partial fan-out, and the
// section should be pinned at ~80px from the viewport top.
await scrollTo(svcTop + 500);
await sleep(1600); // scrub: 1 — let the tween catch up with the scrollbar
results.midFan = await evaluate(stateExpr);

// 3) Scroll past the end of the scrub: fan-out complete, cards in final
// grid positions.
await scrollTo(svcTop + 1400);
await sleep(1600);
results.fanned = await evaluate(stateExpr);

console.log("stacked   :", JSON.stringify(results.stacked));
console.log("mid fan   :", JSON.stringify(results.midFan));
console.log("fanned    :", JSON.stringify(results.fanned));

const allOpaque = (r) => r.opacities.every((o) => Number(o) === 1);

const pass =
  results.stacked.ok &&
  results.stacked.cardSeparation < 120 && // tight depth-stacked deck at rest
  allOpaque(results.stacked) &&
  results.midFan.ok &&
  Math.abs(results.midFan.sectionTop - 80) < 40 && // section pinned below header
  allOpaque(results.midFan) && // no entrance fades fighting the scrub
  results.fanned.ok &&
  results.fanned.cardSeparation > 600 && // spread across the grid
  allOpaque(results.fanned) &&
  results.fanned.transform1 === "matrix(1, 0, 0, 1, 0, 0)" && // settled exactly
  (results.midFan.cardSeparation > results.stacked.cardSeparation) &&
  (results.midFan.cardSeparation < results.fanned.cardSeparation);

console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
