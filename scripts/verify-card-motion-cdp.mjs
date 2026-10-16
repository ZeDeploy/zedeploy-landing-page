// Verification: on a phone-width (390x844) and a desktop-width (1440x900)
// headless Chrome, checks that the service and contact cards carry the
// visible motion treatments:
//  1. mobile: service cards sit in staggered Reveal wrappers and ALL fire
//     after scrolling the full grid into view
//  2. mobile: tapping a service card maps to the gold-glow/lift treatment
//     (the :active rules exist under @media (hover: none))
//  3. mobile: each contact card fills its Reveal wrapper (stretch works)
//  4. desktop: the three contact cards are equal height within their row
// Usage: node scripts/verify-card-motion-cdp.mjs [url]
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT_BASE = 9240;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findPageWsUrl(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  return new Promise((res, rej) => {
    ws.onopen = () => res(ws);
    ws.onerror = rej;
  });
}

async function withChrome({ port, width, height }) {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${mkdtempSync(join(tmpdir(), "card-motion-"))}`,
      `--window-size=${width},${height}`,
      "--no-first-run",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const ws = await connect(await findPageWsUrl(port));
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
    if (res.result?.exceptionDetails)
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    return res.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: URL_TO_TEST });
  await sleep(4500); // hydration

  const api = {
    evaluate,
    close: async () => {
      ws.close();
      try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
    },
  };
  return api;
}

const scrollViaLenis = (top) =>
  `(() => {
    const l = window.__lenis;
    const t = ${JSON.stringify(top)};
    if (l) l.scrollTo(t, { immediate: true, force: true });
    else window.scrollTo({ top: t, behavior: "instant" });
  })()`;

// ---------------- mobile pass ----------------
const mob = await withChrome({ port: PORT_BASE, width: 390, height: 844 });

// Scroll through the ENTIRE services grid in small steps, then measure.
const svc = await mob.evaluate(
  `(() => { const g = document.querySelector(".services-grid");
    return { top: Math.round(g.getBoundingClientRect().top + window.scrollY),
             height: Math.round(g.getBoundingClientRect().height) }; })()`
);
for (let y = svc.top - 100; y <= svc.top + svc.height + 200; y += 200) {
  await mob.evaluate(scrollViaLenis(y));
  await sleep(280);
}

const serviceWrappers = await mob.evaluate(`(() => {
  const grid = document.querySelector(".services-grid");
  return {
    itemCount: grid.children.length,
    wrappedCount: [...grid.children].filter((el) => el.classList.contains("reveal")).length,
    shownCount: grid.querySelectorAll(".reveal.is-shown").length,
    anyCardTransparent: [...grid.querySelectorAll(".service-card")]
      .some((c) => parseFloat(getComputedStyle(c).opacity) < 0.99),
  };
})()`);

const tapRules = await mob.evaluate(`(() => {
  let css = "";
  for (const sheet of document.styleSheets) {
    try { for (const r of sheet.cssRules) css += r.cssText + "\\n"; } catch {}
  }
  const idx = css.indexOf("@media (hover: none)");
  const touchBlock = idx === -1 ? "" : css.slice(idx);
  return {
    hasActiveGlow: touchBlock.includes(".service-card:active") &&
      /rgba\\(196,\\s*186,\\s*2,\\s*0\\.35\\)/.test(touchBlock),
    hasActiveIcon: touchBlock.includes(".service-card:active .service-icon"),
  };
})()`);

// The contact section sits well below the services grid — scroll it into
// view before measuring, or its observers haven't fired yet.
const contactTopM = await mob.evaluate(
  `Math.round(document.querySelector(".contact-cards").getBoundingClientRect().top + window.scrollY)`
);
for (let y = contactTopM - 500; y <= contactTopM + 300; y += 200) {
  await mob.evaluate(scrollViaLenis(y));
  await sleep(280);
}

const contactStretch = await mob.evaluate(`(() => {
  const grid = document.querySelector(".contact-cards");
  const items = [...grid.children];
  return {
    wrappedCount: items.filter((el) => el.classList.contains("reveal")).length,
    shownCount: grid.querySelectorAll(".reveal.is-shown").length,
    allFillWrapper: items.every((w) => {
      const card = w.querySelector(".contact-card");
      return Math.abs(w.getBoundingClientRect().height - card.getBoundingClientRect().height) <= 2;
    }),
  };
})()`);

await mob.close();

// ---------------- desktop pass ----------------
const desk = await withChrome({ port: PORT_BASE + 1, width: 1440, height: 900 });
const contactTop = await desk.evaluate(
  `Math.round(document.querySelector(".contact-cards").getBoundingClientRect().top + window.scrollY)`
);
await desk.evaluate(scrollViaLenis(contactTop - 300));
await sleep(900);
const desktopContact = await desk.evaluate(`(() => {
  const grid = document.querySelector(".contact-cards");
  const items = [...grid.children];
  const hs = items.map((el) => Math.round(el.getBoundingClientRect().height));
  return {
    columnsReady: hs.length === 3,
    equalHeights: hs.length === 3 && Math.max(...hs) - Math.min(...hs) <= 8,
    servicesUnwrapped: !document.querySelector(".services-grid").children[0].classList.contains("reveal"),
  };
})()`);
await desk.close();

console.log("mobile services  :", JSON.stringify(serviceWrappers));
console.log("mobile tap rules :", JSON.stringify(tapRules));
console.log("mobile contact   :", JSON.stringify(contactStretch));
console.log("desktop contact  :", JSON.stringify(desktopContact));

const ok =
  serviceWrappers.itemCount === 6 &&
  serviceWrappers.wrappedCount === 6 &&
  serviceWrappers.shownCount === 6 &&
  !serviceWrappers.anyCardTransparent &&
  tapRules.hasActiveGlow &&
  tapRules.hasActiveIcon &&
  contactStretch.wrappedCount === 3 &&
  contactStretch.shownCount === 3 &&
  contactStretch.allFillWrapper &&
  desktopContact.columnsReady &&
  desktopContact.equalHeights &&
  desktopContact.servicesUnwrapped;

console.log("=== OVERALL:", ok ? "PASS" : "FAIL", "===");
process.exit(ok ? 0 : 1);
