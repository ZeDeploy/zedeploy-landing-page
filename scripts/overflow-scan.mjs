// Diagnostic: scan for elements creating horizontal overflow at a phone
// viewport, at several scroll depths. Usage: node scripts/overflow-scan.mjs [url]
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9235;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "ovf-scan-"))}`,
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

const scan = (label) =>
  evaluate(`(() => {
    const se = document.scrollingElement;
    const cw = document.documentElement.clientWidth;
    const out = {
      label: ${JSON.stringify(label)},
      scrollWidth: se.scrollWidth,
      clientWidth: cw,
      rightGap: se.scrollWidth - cw,
      offenders: [],
    };
    if (out.rightGap > 2) {
      console.log("SANITY");
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > cw + 1 || r.left < -1) {
          out.offenders.push({
            tag: el.tagName,
            cls: String(el.className?.baseVal ?? el.className ?? "").slice(0, 48),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }
      }
      out.offenders = out.offenders.slice(0, 15);
    }
    return out;
  })()`);

const scrollViaLenis = (top) =>
  evaluate(`(() => {
    const l = window.__lenis;
    if (l) l.scrollTo(${top}, { immediate: true, force: true });
    else window.scrollTo({ top: ${top}, behavior: "instant" });
  })()`);

console.log(JSON.stringify(await scan("scroll 0"), null, 1));

const docHeight = await evaluate(
  `document.scrollingElement.scrollHeight`
);
const steps = Math.min(6, Math.ceil(docHeight / 900));
for (let i = 1; i <= steps; i++) {
  const top = Math.round((docHeight * i) / (steps + 1));
  await scrollViaLenis(top);
  await sleep(700);
  const result = await scan(`scroll ${top}`);
  console.log(JSON.stringify(result, null, 1));
}

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
