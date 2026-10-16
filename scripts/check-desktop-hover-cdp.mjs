// Verify: at desktop width on a pointer-fine device, the card hover
// treatment (gold glow + lift + icon pop + glare) is still fully intact —
// the touch resets live inside @media (hover: none) only.
import { spawn, execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9246;
const URL_TO_TEST = process.argv[2] ?? "http://localhost:3000";

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "desk-hover-"))}`,
  "--window-size=1440,900", "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: "ignore" });

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
  throw new Error("no CDP");
}
const ws = new WebSocket(await findPageWsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) =>
  new Promise((r) => { pending.set(++msgId, r); ws.send(JSON.stringify({ id: msgId, method, params })); });
const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_TO_TEST });
await sleep(4500);

console.log("hoverNone:", await evaluate(`matchMedia("(hover: none)").matches`),
            "| vw:", await evaluate(`document.documentElement.clientWidth`));

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

const diff = (a, b) => a && b && (a.shadow !== b.shadow || a.transform !== b.transform ||
  a.iconTransform !== b.iconTransform || a.glare !== b.glare);

async function hoverCheck(name, sel, iconSel) {
  // Walk the page until the pinned fan-out has settled AND the card is fully
  // on screen. Hover is deliberately disabled while .is-fanning (pointer-events:
  // none), so measuring mid-pin reads a false negative that is by design.
  let target = null;
  // Step 100px: the settled-and-visible window after the pin is only ~150px
  // wide, so coarser steps step straight over it.
  for (let y = 0; y <= 6000; y += 100) {
    await evaluate(`(() => { if (window.__lenis) window.__lenis.scrollTo(${y}, { immediate: true, force: true });
                             else window.scrollTo(${y}, 0); })()`);
    await sleep(200);
    const s = await evaluate(`(() => {
      const card = document.querySelector(${JSON.stringify(sel)});
      const r = card.getBoundingClientRect();
      // --fan is written inline by GSAP: 0 = stacked deck (cards overlap, so
      // the centre point may hit a DIFFERENT stacked card), 1 = settled.
      const fan = parseFloat(card.style.getPropertyValue("--fan") || "1");
      return { fanning: document.querySelector(".services").classList.contains("is-fanning"),
               fan: Number.isFinite(fan) ? fan : 1,
               screen: r.top > 60 && r.bottom < innerHeight - 20,
               r: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } };
    })()`);
    if (!s.fanning && s.fan >= 0.999 && s.screen) { target = y; break; }
  }
  if (target === null) throw new Error(`no settled on-screen position for ${name}`);
  console.log(`  settled at scrollY=${target}`);
  await sleep(700);
  const pt = await evaluate(`(() => {
    const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);
  const base = await evaluate(SNAP(sel, iconSel));
  const pe = await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).pointerEvents`);
  const hitOk = await evaluate(`(() => {
    const c = document.querySelector(${JSON.stringify(sel)});
    const r = c.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
    return !!hit?.closest(${JSON.stringify(sel)});
  })()`);
  console.log(`  pointer-events: ${pe} | hitTest: ${hitOk}`);
  if (!hitOk) throw new Error(`${name}: centre point does not hit the measured card`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y, buttons: 0 });
  await sleep(450);
  const hov = await evaluate(SNAP(sel, iconSel));
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 6, y: 6, buttons: 0 });
  await sleep(350);
  const out = await evaluate(SNAP(sel, iconSel));
  console.log(`\n${name}`);
  console.log("  base :", base.shadow, "|", base.transform, "| glare", base.glare);
  console.log("  hover:", hov.shadow, "| icon", hov.iconTransform, "| glare", hov.glare, "| changed:", diff(base, hov));
  console.log("  out  :", out.shadow, "| changed:", diff(base, out));
  return { hoverChanged: diff(base, hov), glow: /196, 186, 2/.test(hov.shadow), notPressed: !hov.pressed };
}

const a = await hoverCheck("service card @1440", ".service-card", ".service-icon");
const b = await hoverCheck("contact card @1440", ".contact-card", ".contact-card-icon");
const checks = { serviceHover: a.hoverChanged && a.glow && a.notPressed, contactHover: b.hoverChanged && b.notPressed };
console.log("\nchecks:", JSON.stringify(checks));
const pass = Object.values(checks).every(Boolean);
console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");
ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
