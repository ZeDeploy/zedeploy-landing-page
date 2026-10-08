// Debug: find horizontal-overflow offenders at phone width and dump the
// computed --dx/--dy/--fan values on the first cards.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9234;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "ovf-dbg-"))}`,
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
await sleep(4000);

const offenders = () =>
  evaluate(`(() => {
    const cw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > cw + 1 || r.left < -1) {
        out.push({
          tag: el.tagName,
          cls: String(el.className?.baseVal ?? el.className ?? "").slice(0, 40),
          left: Math.round(r.left), right: Math.round(r.right),
        });
      }
    }
    return out.slice(0, 12);
  })()`);

const vars = () =>
  evaluate(`(() => {
    const wrap = document.querySelector(".services-grid > .reveal");
    const card = document.querySelector(".service-card");
    const cs = getComputedStyle(wrap);
    return {
      wrapDx: cs.getPropertyValue("--dx"), wrapDy: cs.getPropertyValue("--dy"),
      cardFan: card.style.getPropertyValue("--fan"),
      cardTransform: getComputedStyle(card).transform.slice(0, 60),
      cardRect: (() => { const r = card.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      vw: document.documentElement.clientWidth,
    };
  })()`);

const scrollViaLenis = (top) =>
  evaluate(`(() => {
    const l = window.__lenis;
    if (l) l.scrollTo(${top}, { immediate: true, force: true });
    else window.scrollTo({ top: ${top}, behavior: "instant" });
  })()`);

console.log("=== at scroll 0 (fan = 0) ===");
console.log("vars:", JSON.stringify(await vars()));
console.log("offenders:", JSON.stringify(await offenders()));

const svcTop = await evaluate(
  `Math.round(document.querySelector(".services").getBoundingClientRect().top + window.scrollY)`
);
await scrollViaLenis(svcTop + 1500);
await sleep(1600);
console.log("=== settled ===");
console.log("offenders:", JSON.stringify(await offenders()));

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
