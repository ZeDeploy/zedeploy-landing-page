// One-off verification: clicks each navbar link in headless Chrome and checks
// the target section lands just below the sticky header (not hidden under it).
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const URL_TO_TEST = "http://localhost:3000";

const profileDir = join(tmpdir(), "zedeploy-cdp-nav");
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

const ws = new WebSocket(await findPageWsUrl());
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
await sleep(2500);

const result = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = { links: [] };

    // Instant scrolling so measurements aren't taken mid-animation.
    document.documentElement.style.scrollBehavior = "auto";

    const header = document.querySelector(".header");
    out.headerHeight = Math.round(header.getBoundingClientRect().height);

    // The desktop menu plus the mobile menu must agree on hrefs.
    const desktopHrefs = [...document.querySelectorAll(".desktop-nav a")].map(a => a.getAttribute("href"));
    const mobileHrefs = [...document.querySelectorAll(".mobile-menu nav a")].map(a => a.getAttribute("href"));
    out.desktopHrefs = desktopHrefs;
    out.mobileHrefs = mobileHrefs;

    // Wait until scrollY stops changing (smooth scrolling would otherwise
    // skew measurements; we forced instant but poll anyway for safety).
    async function settle() {
      let last = -1;
      for (let i = 0; i < 30; i++) {
        const y = window.scrollY;
        if (y === last) break;
        last = y;
        await sleep(120);
      }
      return window.scrollY;
    }

    // Cases: every desktop nav link + the Get Started CTA.
    const cases = [
      { label: "Home", href: "#", expectTop: true },
      { label: "Services", href: "#services" },
      { label: "Solutions", href: "#infrastructure" },
      { label: "Contact", href: "#contact-form" },
      { label: "Get Started (CTA)", href: "#contact-form" },
    ];

    for (const c of cases) {
      // Reset to top between cases.
      window.scrollTo({ top: 0, behavior: "instant" });
      await sleep(150);

      const link = desktopHrefs.includes(c.href)
        ? document.querySelector('.desktop-nav a[href="' + c.href + '"]' + (c.label.startsWith("Get") ? '.start-button' : ''))
        : null;

      if (!link) {
        out.links.push({ ...c, found: false });
        continue;
      }

      link.click();
      const finalY = await settle();

      let verdict = null;
      let top = null;
      if (c.expectTop) {
        verdict = finalY < 5 ? "PASS" : "FAIL";
      } else {
        const target = document.querySelector(c.href);
        if (!target) {
          out.links.push({ ...c, found: false, clicked: true });
          continue;
        }
        const rect = target.getBoundingClientRect();
        top = Math.round(rect.top);
        const headerBottom = header.getBoundingClientRect().bottom;
        // Correct landing: section top sits just below the sticky header
        // (within 60px of it) and the section fills the viewport.
        const belowHeader = top >= headerBottom - 2 && top <= headerBottom + 60;
        const fillsView = rect.bottom > window.innerHeight * 0.5;
        verdict = belowHeader && fillsView ? "PASS" : "FAIL";
      }
      out.links.push({ ...c, found: true, finalY: Math.round(finalY), sectionTop: top, verdict });
    }

    // End on the services section for the screenshot.
    const svc = document.querySelector("#services");
    window.scrollTo({ top: svc.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
    await sleep(200);
    return out;
  })()`,
});

if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
const out = result.result.value;

console.log("headerHeight:", out.headerHeight + "px");
console.log("desktop hrefs:", out.desktopHrefs.join(" "));
console.log("mobile  hrefs:", out.mobileHrefs.join(" "));
console.log("mobile matches desktop:", JSON.stringify(out.desktopHrefs) === JSON.stringify(out.mobileHrefs));
console.log("=== CLICK TESTS ===");
let pass = true;
for (const l of out.links) {
  if (!l.found) { console.log(`${l.label}: link NOT FOUND`); pass = false; continue; }
  const detail = l.expectTop ? `scrollY=${l.finalY}` : `sectionTop=${l.sectionTop}px scrollY=${l.finalY}`;
  console.log(`${l.label.padEnd(18)} ${l.href.padEnd(17)} ${detail.padEnd(26)} ${l.verdict}`);
  if (l.verdict === "FAIL") pass = false;
}
console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");

const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(join(tmpdir(), "zedeploy-nav-services.png"), Buffer.from(shot.data, "base64"));
console.log("SCREENSHOT:", join(tmpdir(), "zedeploy-nav-services.png"));

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
