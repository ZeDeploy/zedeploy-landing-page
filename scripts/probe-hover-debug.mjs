// Debug: why doesn't :hover apply? Check element under cursor, computed
// custom props, and whether the new rules are in the stylesheet.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9232;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "hoverdbg-"))}`,
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

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_TO_TEST });
await sleep(4000);

const svcTop = await evaluate(
  `Math.round(document.querySelector(".services").getBoundingClientRect().top + window.scrollY)`
);
await evaluate(`(() => {
  const l = window.__lenis;
  if (l) l.scrollTo(${svcTop + 1400}, { immediate: true, force: true });
  else window.scrollTo({ top: ${svcTop + 1400}, behavior: "instant" });
})()`);
await sleep(1500);

const { x, y } = await evaluate(`(() => {
  const r = document.querySelectorAll(".service-card")[0].getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})()`);
console.log("hover point:", x, y);

await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
await sleep(300);

const diag = await evaluate(`(() => {
  const el = document.elementFromPoint(${x}, ${y});
  const card = document.querySelectorAll(".service-card")[0];
  let rules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const r of sheet.cssRules) {
        if (r.selectorText && r.selectorText.includes(".service-card:hover")) rules.push(r.cssText.slice(0, 120));
      }
    } catch {}
  }
  return {
    under: el ? el.tagName + "." + (el.className?.baseVal ?? el.className) : null,
    isCardOrChild: el ? !!el.closest(".service-card") : false,
    hoverLift: getComputedStyle(card).getPropertyValue("--hover-lift"),
    hoverZoom: getComputedStyle(card).getPropertyValue("--hover-zoom"),
    transform: getComputedStyle(card).transform,
    hoverRules: rules,
    matches: card.matches(":hover"),
    mediaHover: matchMedia("(hover: hover)").matches,
  };
})()`);
console.log(JSON.stringify(diag, null, 2));

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
