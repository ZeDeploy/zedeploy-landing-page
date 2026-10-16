// Verify: on an emulated touch phone, do the Our Services / Get In Touch
// cards visibly animate on tap? TiltCard toggles .is-pressed on pointerdown
// and drops it ~320ms after release; the CSS replays the desktop hover
// treatment (lift + gold glow + icon pop + glare).
// Also checks that desktop mouse hover is still intact.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9241;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "touch-hover-"))}`,
    "--window-size=390,844",
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

// Phone emulation: metrics + touch => (hover: none) / (pointer: coarse) match.
await send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
});
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

await send("Page.navigate", { url: URL_TO_TEST });
await sleep(4500);

const media = await evaluate(`({
  hoverNone: matchMedia("(hover: none)").matches,
  coarse: matchMedia("(pointer: coarse)").matches,
  vw: document.documentElement.clientWidth,
})`);
console.log("media:", JSON.stringify(media));

const scrollTo = (sel) =>
  evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    const y = el.getBoundingClientRect().top + window.scrollY - 140;
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: "instant" });
    return Math.round(y);
  })()`);

const SNAP = (sel, iconSel) => `(() => {
  const card = document.querySelector(${JSON.stringify(sel)});
  if (!card) return { missing: true };
  const cs = getComputedStyle(card);
  const icon = ${iconSel ? `card.querySelector(${JSON.stringify(iconSel)})` : "null"};
  return {
    pressed: card.classList.contains("is-pressed"),
    shadow: cs.boxShadow.replace(/\\s+/g, " ").slice(0, 95),
    transform: cs.transform.replace(/\\s+/g, " ").slice(0, 60),
    iconTransform: icon ? getComputedStyle(icon).transform : null,
    glare: getComputedStyle(card, "::after").opacity,
  };
})()`;

const visDiff = (a, b) =>
  a && b && (a.shadow !== b.shadow || a.transform !== b.transform ||
             a.iconTransform !== b.iconTransform || a.glare !== b.glare);

async function probeCard(name, sel, iconSel) {
  await scrollTo(sel);
  await sleep(900);

  const atPoint = await evaluate(`(() => {
    const c = document.querySelector(${JSON.stringify(sel)});
    const r = c.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    return { x, y, hitIsInside: !!hit?.closest(${JSON.stringify(sel)}) };
  })()`);

  const base = await evaluate(SNAP(sel, iconSel));

  // touch tap: hold, then release
  await send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: atPoint.x, y: atPoint.y, id: 1 }],
  });
  await sleep(300);
  const during = await evaluate(SNAP(sel, iconSel));
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(200);
  const afterRelease = await evaluate(SNAP(sel, iconSel));
  await sleep(600);
  const settled = await evaluate(SNAP(sel, iconSel));

  // mouse hover: desktop treatment must be untouched
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved", x: atPoint.x, y: atPoint.y, buttons: 0,
  });
  await sleep(400);
  const hovered = await evaluate(SNAP(sel, iconSel));
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 4, y: 4, buttons: 0 });
  await sleep(300);

  const rows = [
    ["tap held ", during],
    ["released ", afterRelease],
    ["settled  ", settled],
    ["mouse hov", hovered],
  ];
  console.log(`\n--- ${name} (hit ok: ${atPoint.hitIsInside}) ---`);
  for (const [label, s] of rows) {
    console.log(`  ${label}: pressed=${String(s.pressed).padEnd(5)} ` +
      `visible=${visDiff(base, s) ? "YES" : "no "} glare=${s.glare} shadow=${s.shadow.slice(0, 58)}`);
  }

  return {
    hitOk: atPoint.hitIsInside,
    tapVisible: visDiff(base, during) && during.pressed,
    linger: afterRelease.pressed && visDiff(base, afterRelease),
    cleansUp: !settled.pressed && !visDiff(base, settled),
    hoverWorks: visDiff(base, hovered),
  };
}

const results = [];
results.push(await probeCard("service card", ".service-card", ".service-icon"));
results.push(await probeCard("contact card", ".contact-card", ".contact-card-icon"));

const checks = {
  media: media.hoverNone && media.coarse && media.vw <= 480,
  hit: results.every((r) => r.hitOk),
  tapAnimates: results.every((r) => r.tapVisible),
  lingersAfterLift: results.every((r) => r.linger),
  cleansUp: results.every((r) => r.cleansUp),
  desktopHoverIntact: results.every((r) => r.hoverWorks),
};
console.log("\nchecks:", JSON.stringify(checks));
const pass = Object.values(checks).every(Boolean);
console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
