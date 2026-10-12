// Probe: vertical gap between the bottom of the last service-card row
// (cards 4-6) and the top of the next section (.infrastructure), measured
// in settled document coordinates after the fan-out pin completes.
// Usage: node scripts/probe-services-gap.mjs [url] [width]
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9234;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";
const WIDTH = parseInt(process.argv[3] ?? "1440", 10);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "gap-probe-"))}`,
    `--window-size=${WIDTH},900`,
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

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false,
});
await send("Page.navigate", { url: URL_TO_TEST });

// Wait until the service cards are actually in the DOM.
for (let i = 0; i < 30; i++) {
  const ready = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `document.querySelectorAll(".service-card").length`,
  });
  if ((ready.result?.value ?? 0) >= 6) break;
  await sleep(500);
}
await sleep(1000);

// Scroll through the whole page so the fan-out pin completes and layout
// settles, then jump back to the section to measure final positions.
await send("Runtime.evaluate", { expression: `window.scrollTo(0, document.body.scrollHeight)` });
await sleep(1500);
await send("Runtime.evaluate", { expression: `window.scrollTo(0, 0)` });
await sleep(800);

const resp = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: false,
  expression: `(() => {
    const cards = document.querySelectorAll(".service-card");
    const lastCard = cards[5] ?? cards[cards.length - 1];
    const section = document.querySelector(".services");
    const next = document.querySelector(".infrastructure");
    const grid = document.querySelector(".services-grid");
    const cs = getComputedStyle(section);
    return {
      viewport: window.innerWidth,
      lastCardBottom: Math.round(lastCard.getBoundingClientRect().bottom + window.scrollY),
      sectionBottom: Math.round(section.getBoundingClientRect().bottom + window.scrollY),
      nextSectionTop: Math.round(next.getBoundingClientRect().top + window.scrollY),
      gapCardToNext: Math.round(next.getBoundingClientRect().top - lastCard.getBoundingClientRect().bottom),
      gapSectionToNext: Math.round(next.getBoundingClientRect().top - section.getBoundingClientRect().bottom),
      servicesPaddingBottom: cs.paddingBottom,
      gridMarginBottom: getComputedStyle(grid).marginBottom,
    };
  })()`,
});
if (resp.exceptionDetails) {
  console.error("EVAL FAILED:", resp.exceptionDetails.exception?.description ?? resp.exceptionDetails.text);
} else {
  console.log(JSON.stringify(resp.result?.result?.value ?? resp.result, null, 2));
}

ws.close();
chrome.kill();
process.exit(0);
