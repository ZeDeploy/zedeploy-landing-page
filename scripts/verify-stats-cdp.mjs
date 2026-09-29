// One-off visual verification: drives headless Chrome over CDP, scrolls the
// landing page and checks the growth graph is inside the black stats section.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const URL_TO_TEST = "http://localhost:3000";

const profileDir = join(tmpdir(), "zedeploy-cdp-profile");
mkdirSync(profileDir, { recursive: true });

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
const eventWaiters = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    for (let i = eventWaiters.length - 1; i >= 0; i--) {
      const w = eventWaiters[i];
      if (w.method === msg.method) {
        eventWaiters.splice(i, 1);
        w.resolve(msg.params);
      }
    }
  }
};
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function waitEvent(method, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    eventWaiters.push({ method, resolve });
    setTimeout(() => reject(new Error(`timeout waiting ${method}`)), timeoutMs);
  });
}

await send("Page.enable");
await send("Runtime.enable");
const loaded = waitEvent("Page.loadEventFired");
await send("Page.navigate", { url: URL_TO_TEST });
await loaded;
await sleep(2500); // let hydration + entry animations settle

const result = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    const q = (s) => document.querySelector(s);

    // The stylesheet sets scroll-behavior: smooth, which turns programmatic
    // scrollTo calls into slow animations. Force instant jumps for testing.
    document.documentElement.style.scrollBehavior = "auto";

    // ---- structural checks -------------------------------------------
    const graph = q(".stats-growth-bg");
    const stats = q(".stats");
    const infra = q(".infrastructure");
    out.graphExists = !!graph;
    out.graphInsideStats = !!graph && !!stats && stats.contains(graph);
    out.graphInsideInfra = !!graph && !!infra && infra.contains(graph);
    out.graphSvgExists = !!graph?.querySelector("svg");
    out.graphDots = document.querySelectorAll(".stats-growth-dot").length;

    const statsColor = stats ? getComputedStyle(stats).backgroundColor : null;
    out.statsColor = statsColor;
    out.statsIsBlack = statsColor === "rgb(44, 44, 44)";

    const cs = stats ? getComputedStyle(stats) : null;
    out.statsFullScreen = cs ? parseInt(cs.minHeight) >= window.innerHeight - 2 : false;

    const host = graph?.closest(".stats-growth-bg");
    out.graphCoversSection = !!host && (() => {
      const a = host.getBoundingClientRect(), b = stats.getBoundingClientRect();
      return Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2;
    })();

    // graph anchored low inside the section (bottom of SVG box near section bottom)
    out.graphAnchoredBottom = (() => {
      if (!host) return false;
      const g = host.getBoundingClientRect(), s = stats.getBoundingClientRect();
      return Math.abs(g.bottom - s.bottom) < 4 && g.top >= s.top;
    })();

    out.statValues = [...document.querySelectorAll(".stat-item h4")].map((h) => h.textContent.trim());

    // ---- scroll-through with per-section color sampling ---------------
    const sections = [".hero", ".services", ".infrastructure", ".stats", ".final-cta", ".contact-section", ".footer"];
    out.scrollLog = [];
    for (const sel of sections) {
      window.scrollTo({ top: 0, behavior: "instant" });
      await sleep(80);
      const el = q(sel);
      if (!el) { out.scrollLog.push({ sel, found: false }); continue; }
      const r = el.getBoundingClientRect();
      window.scrollTo({ top: r.top + window.scrollY + 10, behavior: "instant" });
      await sleep(300);
      // probe below the sticky header, mid-viewport
      const probe = document.elementFromPoint(window.innerWidth / 2, Math.round(window.innerHeight * 0.55));
      const section = probe ? probe.closest("section") : null;
      out.scrollLog.push({
        sel,
        found: true,
        enteredViewport: el.getBoundingClientRect().top < window.innerHeight,
        topColor: section ? getComputedStyle(section).backgroundColor : null,
        probeTag: probe ? probe.tagName.toLowerCase() : null,
      });
    }

    // land on stats and check graph visibility in viewport
    const sr = stats.getBoundingClientRect();
    window.scrollTo({ top: sr.top + window.scrollY + 10, behavior: "instant" });
    await sleep(400);
    const gr = graph.getBoundingClientRect();
    out.graphVisibleAtStats = gr.bottom > 0 && gr.top < window.innerHeight;
    out.graphOnScreenFraction = (() => {
      const vh = window.innerHeight;
      const visible = Math.min(gr.bottom, vh) - Math.max(gr.top, 0);
      return Math.round((visible / gr.height) * 100);
    })();
    window.scrollTo({ top: sr.top + window.scrollY + 10, behavior: "instant" }); // stay for screenshot
    await sleep(300);
    return out;
  })()`,
});

if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
const out = result.result.value;

// ---- report ----------------------------------------------------------
console.log("=== STRUCTURE ===");
console.log("graphExists:", out.graphExists);
console.log("graphInsideStats:", out.graphInsideStats);
console.log("graphInsideInfra:", out.graphInsideInfra);
console.log("graphSvgExists:", out.graphSvgExists);
console.log("graphDots:", out.graphDots);
console.log("graphCoversSection:", out.graphCoversSection);
console.log("graphAnchoredBottom:", out.graphAnchoredBottom);
console.log("graphVisibleAtStats:", out.graphVisibleAtStats, `(${out.graphOnScreenFraction}% of graph height on screen)`);
console.log("statsColor:", out.statsColor, "| statsIsBlack:", out.statsIsBlack);
console.log("statsFullScreen:", out.statsFullScreen);
console.log("statValues:", out.statValues.join(" | "));
console.log("=== SCROLL-THROUGH ===");
for (const e of out.scrollLog) {
  console.log(
    `${e.sel.padEnd(20)} found:${e.found}` +
      (e.found ? ` inView:${e.enteredViewport} probe:<${e.probeTag}> topColor:${e.topColor}` : "")
  );
}

const pass =
  out.graphExists && out.graphInsideStats && !out.graphInsideInfra &&
  out.graphSvgExists && out.graphDots === 8 && out.statsIsBlack &&
  out.statsFullScreen && out.graphCoversSection && out.graphAnchoredBottom &&
  out.graphVisibleAtStats;
console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");

// ---- screenshot of the stats section --------------------------------
const shot = await send("Page.captureScreenshot", { format: "png" });
const shotPath = join(tmpdir(), "zedeploy-stats-section.png");
writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
console.log("SCREENSHOT:", shotPath);

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
