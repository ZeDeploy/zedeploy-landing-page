// One-off verification for the /privacy route: renders, metadata, table of
// contents anchors, in-page TOC scrolling under the sticky header, route-aware
// nav links (/#services from sub-pages), the footer privacy link, reveal
// animations, reduced-motion fallbacks and console cleanliness.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9225;
const BASE = process.env.BASE_URL || "http://localhost:3004";

const profileDir = join(tmpdir(), "zedeploy-cdp-privacy");
mkdirSync(profileDir, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--remote-debugging-address=127.0.0.1`,
    `--user-data-dir=${profileDir}`,
    `--window-size=1440,900`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
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
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let msgId = 0;
const pending = new Map();
const eventWaiters = [];
const consoleErrors = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(msg.params.exceptionDetails?.text || "exceptionThrown");
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push(
        msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "),
      );
    }
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
function waitEvent(method, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    eventWaiters.push({ method, resolve });
    setTimeout(() => reject(new Error(`timeout waiting ${method}`)), timeoutMs);
  });
}
async function evalJS(expression, awaitPromise = false) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
  return res.result.value;
}
async function navigate(url) {
  const loaded = waitEvent("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;
  await sleep(700);
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const path = join(tmpdir(), name);
  writeFileSync(path, Buffer.from(shot.data, "base64"));
  return path;
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

await send("Page.enable");
await send("Runtime.enable");

// --- 1. The page renders with the right metadata ---------------------------
await navigate(`${BASE}/privacy`);
const page = await evalJS(`(() => {
  const toc = [...document.querySelectorAll(".privacy-toc a")];
  return {
    path: location.pathname,
    title: document.title,
    h1: document.querySelector(".privacy-hero h1")?.textContent?.trim(),
    kicker: document.querySelector(".privacy-kicker")?.textContent?.trim(),
    updated: document.querySelector(".privacy-updated")?.textContent?.trim(),
    sectionCount: document.querySelectorAll(".policy-section, .privacy-contact")
      .length,
    tocCount: toc.length,
    missingTargets: toc
      .map((a) => a.getAttribute("href"))
      .filter((h) => !document.querySelector(h)),
    navHrefs: [...document.querySelectorAll(".desktop-nav a")].map((a) =>
      a.getAttribute("href"),
    ),
    logoHref: document.querySelector(".logo")?.getAttribute("href"),
    footerPrivacy: document.querySelector(".footer p a")?.getAttribute("href"),
    highlightCount: document.querySelectorAll(".privacy-highlights li").length,
    formEndpointLeak: document.body.innerHTML.includes("formspree.io/f/"),
  };
})()`);

check("route is /privacy", page.path === "/privacy", page.path);
check(
  "document title is page-specific",
  page.title === "Privacy Policy | ZeDeploy",
  page.title,
);
check(
  "hero heading rendered",
  page.h1 === "Privacy Policy" && page.kicker === "Legal",
  `${page.kicker} / ${page.h1}`,
);
check(
  "last-updated chip present",
  typeof page.updated === "string" && page.updated.includes("12 October 2026"),
  page.updated,
);
check(
  "12 policy sections with matching TOC entries",
  page.sectionCount === 12 && page.tocCount === 12,
  `sections=${page.sectionCount} toc=${page.tocCount}`,
);
check(
  "every TOC link points at a real section",
  page.missingTargets.length === 0,
  page.missingTargets.join(",") || "all resolve",
);
check(
  "four takeaway chips rendered",
  page.highlightCount === 4,
  String(page.highlightCount),
);
check(
  "nav links point back home from /privacy",
  JSON.stringify(page.navHrefs) ===
    JSON.stringify([
      "/",
      "/#services",
      "/#infrastructure",
      "/#contact-form",
      "/#contact-form",
    ]),
  page.navHrefs.join(","),
);
check(
  "logo links home from /privacy",
  page.logoHref === "/",
  String(page.logoHref),
);
check(
  "footer links to the privacy policy",
  page.footerPrivacy === "/privacy",
  String(page.footerPrivacy),
);

// --- 2. Header + footer entrance animations run on this route --------------
const anims = await evalJS(`(() => ({
  headerLogo: getComputedStyle(document.querySelector(".header-container .logo")).animationName,
  headerFill: getComputedStyle(document.querySelector(".header-container .logo")).animationFillMode,
}))()`);
check(
  "header entrance plays on /privacy",
  anims.headerLogo === "zd-header-rise" && anims.headerFill === "backwards",
  `${anims.headerLogo} / ${anims.headerFill}`,
);

// --- 3. TOC click scrolls the target under the sticky header ---------------
const tocScroll = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo({ top: 0, behavior: "instant" });
  await sleep(200);
  document.querySelector('.privacy-toc a[href="#your-rights"]').click();

  let last = -1;
  let y = window.scrollY;
  for (let i = 0; i < 40; i++) {
    y = window.scrollY;
    if (y === last) break;
    last = y;
    await sleep(120);
  }

  // The section reveals itself on arrival (0.7s transition) — wait for it
  // to settle before reading the landing position.
  const target = document.querySelector("#your-rights");
  let waited = 0;
  while (
    parseFloat(getComputedStyle(target.querySelector(".reveal")).opacity) <
      0.99 &&
    waited < 2000
  ) {
    await sleep(100);
    waited += 100;
  }
  await sleep(200);

  const header = document.querySelector(".header");
  const rect = target.getBoundingClientRect();
  return {
    y: Math.round(y),
    top: Math.round(rect.top),
    headerBottom: Math.round(header.getBoundingClientRect().bottom),
    opacity: getComputedStyle(target.querySelector(".reveal")).opacity,
    visible: rect.bottom > 0,
  };
})()`, true);

check(
  "TOC jump lands below the sticky header",
  tocScroll.top >= tocScroll.headerBottom - 2 &&
    tocScroll.top <= tocScroll.headerBottom + 60,
  `top=${tocScroll.top} headerBottom=${tocScroll.headerBottom}`,
);
check(
  "jumped-to section is revealed (not still hidden)",
  tocScroll.opacity === "1" && tocScroll.visible,
  `opacity=${tocScroll.opacity}`,
);

// --- 4. Scrolling the whole page reveals every section ---------------------
const reveals = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = "auto";
  for (let y = 0; y < document.body.scrollHeight; y += 250) {
    window.scrollTo({ top: y, behavior: "instant" });
    await sleep(90);
  }
  window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  await sleep(1500);
  const hidden = [...document.querySelectorAll(".privacy-page .reveal")].filter(
    (el) => parseFloat(getComputedStyle(el).opacity) < 0.95,
  );
  const footer = document.querySelector(".footer-reveal");
  return {
    total: document.querySelectorAll(".privacy-page .reveal").length,
    hidden: hidden.length,
    footerShown: footer.classList.contains("is-shown"),
    footerLogoOpacity: parseFloat(
      getComputedStyle(document.querySelector(".footer-logo")).opacity,
    ),
  };
})()`, true);
check(
  "all scroll-reveals fire on /privacy",
  reveals.total > 0 && reveals.hidden === 0,
  `${reveals.total - reveals.hidden}/${reveals.total} shown`,
);
check(
  "footer entrance still runs on /privacy",
  reveals.footerShown && reveals.footerLogoOpacity > 0.95,
  `shown=${reveals.footerShown} logo=${reveals.footerLogoOpacity}`,
);
check(
  "no form endpoint (or form) on the policy page",
  page.formEndpointLeak === false,
  String(page.formEndpointLeak),
);

const shotPrivacy = await screenshot("zedeploy-privacy.png");
console.log("SCREENSHOT privacy:", shotPrivacy);

// --- 5. Footer link navigates from home to the policy ----------------------
await navigate(`${BASE}/`);
const homeNav = await evalJS(`(() => ({
  hrefs: [...document.querySelectorAll(".desktop-nav a")].map((a) => a.getAttribute("href")),
  logo: document.querySelector(".logo")?.getAttribute("href"),
  privacyLink: document.querySelector(".footer p a")?.getAttribute("href"),
}))()`);
check(
  "home nav hrefs unchanged (anchors, not /#anchors)",
  JSON.stringify(homeNav.hrefs) ===
    JSON.stringify([
      "#",
      "#services",
      "#infrastructure",
      "#contact-form",
      "#contact-form",
    ]),
  homeNav.hrefs.join(","),
);
check("home logo still '#'", homeNav.logo === "#", String(homeNav.logo));
check(
  "home footer links to /privacy",
  homeNav.privacyLink === "/privacy",
  String(homeNav.privacyLink),
);

await evalJS(`document.querySelector(".footer p a").click()`);
let afterClick = "";
for (let i = 0; i < 40; i++) {
  await sleep(250);
  afterClick = await evalJS(`location.pathname`);
  if (afterClick === "/privacy") break;
}
check("footer link navigates to /privacy", afterClick === "/privacy", afterClick);

// --- 6. prefers-reduced-motion on this route -------------------------------
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await navigate(`${BASE}/privacy`);
const reduced = await evalJS(`(() => ({
  heroAnim: getComputedStyle(document.querySelector(".privacy-hero")).animationName,
  contactAnim: getComputedStyle(document.querySelector(".privacy-contact")).animationName,
  orbAnim: getComputedStyle(document.querySelector(".orb")).animationName,
  headerAnim: getComputedStyle(document.querySelector(".header-container .logo")).animationName,
  h1Opacity: parseFloat(getComputedStyle(document.querySelector(".privacy-hero h1").parentElement).opacity),
  ledeOpacity: parseFloat(getComputedStyle(document.querySelector(".privacy-lede").parentElement).opacity),
}))()`);
check(
  "reduced motion: gradients/orbs/header animations off",
  reduced.heroAnim === "none" &&
    reduced.contactAnim === "none" &&
    reduced.orbAnim === "none" &&
    reduced.headerAnim === "none",
  JSON.stringify(reduced),
);
check(
  "reduced motion: hero copy fully visible",
  reduced.h1Opacity === 1 && reduced.ledeOpacity === 1,
  `${reduced.h1Opacity} / ${reduced.ledeOpacity}`,
);
await send("Emulation.setEmulatedMedia", { features: [] });

check(
  "no console errors / exceptions during the run",
  consoleErrors.length === 0,
  consoleErrors.slice(0, 5).join(" | "),
);

const pass = checks.every((c) => c.ok);
console.log(`=== ${checks.filter((c) => c.ok).length}/${checks.length} checks passed ===`);
console.log("=== OVERALL:", pass ? "PASS" : "FAIL", "===");

ws.close();
try { execSync(`taskkill /PID ${chrome.pid} /T /F`); } catch {}
process.exit(pass ? 0 : 1);
