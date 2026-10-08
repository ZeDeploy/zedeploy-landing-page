// Probe: hover must never clobber the fan-out transform. Hovers whichever
// card is actually under the pointer (the deck's topmost card when stacked)
// and checks the fan-out position persists with lift/zoom composed on top.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9231;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "hover-probe-"))}`,
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

// Move the mouse to the point and report which card index (if any) ends up
// hovered, plus that card's parsed transform.
const hoverAt = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await sleep(150);
  return evaluate(`(() => {
    const cards = [...document.querySelectorAll(".service-card")];
    const idx = cards.findIndex((c) => c.matches(":hover"));
    const t = getComputedStyle(cards[Math.max(idx, 0)]).transform;
    const m = t === "none" ? null : t.match(/matrix\\(([^)]+)\\)/)[1].split(",").map(Number);
    return {
      hoveredIndex: idx,
      transform: t,
      tx: m ? Math.round(m[4]) : null,
      ty: m ? Math.round(m[5]) : null,
      scaleX: m ? Math.round(m[0] * 1000) / 1000 : null,
      rot: m ? Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI * 10) / 10 : null,
    };
  })()`);
};

const cardCenter = (index) =>
  evaluate(`(() => {
    const r = document.querySelectorAll(".service-card")[${index}].getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
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

// Park the cursor in a neutral corner.
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });

const svcTop = await evaluate(
  `Math.round(document.querySelector(".services").getBoundingClientRect().top + window.scrollY)`
);

// 1) Stacked deck: scroll just enough to bring the deck into view (still
// before the scrub starts, so fan = 0), hover the topmost card of the deck
// (whichever the pointer really lands on) and compare unhovered vs hovered.
await scrollViaLenis(svcTop - 300);
await sleep(1400);
const deckPoint = await cardCenter(5); // last card paints on top of the deck
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
await sleep(100);
const stacked = await hoverAt(deckPoint.x, deckPoint.y);
const stackedHover = await hoverAt(deckPoint.x, deckPoint.y); // still hovered
// capture unhovered state of that same card for comparison
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
await sleep(150);
const stackedPlain = await evaluate(`(() => {
  const cards = [...document.querySelectorAll(".service-card")];
  const c = cards[${JSON.stringify(stacked.hoveredIndex)}];
  if (!c) return null;
  const m = getComputedStyle(c).transform.match(/matrix\\(([^)]+)\\)/)[1].split(",").map(Number);
  return { tx: Math.round(m[4]), ty: Math.round(m[5]), scaleX: Math.round(m[0] * 1000) / 1000,
           rot: Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI * 10) / 10 };
})()`);

// 2) Settled: scroll just past the pin end so card 0 sits mid-viewport
// (clear of the sticky header), hover it, then unhover.
await scrollViaLenis(svcTop + 1140);
await sleep(1500);
const p = await cardCenter(0);
const settledHover = await hoverAt(p.x, p.y);
const settled = await hoverAt(5, 5);

console.log("stacked plain :", JSON.stringify(stackedPlain));
console.log("stacked hover :", JSON.stringify(stackedHover));
console.log("settled hover :", JSON.stringify(settledHover));
console.log("settled plain :", JSON.stringify(settled));

const pass =
  stackedHover.hoveredIndex >= 0 &&
  !!stackedPlain && // pointer really lands on a deck card
  stackedHover.rot === stackedPlain.rot && // hover keeps the fan-out rotation
  Math.abs(stackedHover.ty - (stackedPlain.ty - 6)) <= 2 && // lift (rotated frame)
  Math.abs(stackedHover.scaleX - (stackedPlain.scaleX + 0.04)) < 0.01 &&
  settledHover.hoveredIndex === 0 &&
  Math.abs(settledHover.scaleX - 1.04) < 0.01 && // settled hover = lift+zoom
  settledHover.rot === 0 &&
  settled.transform === "matrix(1, 0, 0, 1, 0, 0)"; // un-hovers to identity

console.log("=== HOVER COMPOSITION:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
