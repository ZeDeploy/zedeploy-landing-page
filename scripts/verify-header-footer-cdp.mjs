// One-off verification: checks the header entrance stagger + scrolled state,
// the footer scroll-reveal with staggered socials, hover states that must
// survive the entrance animations, and the prefers-reduced-motion fallbacks.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9224;
const URL_TO_TEST = process.env.URL_TO_TEST || "http://localhost:3004";

const profileDir = join(tmpdir(), "zedeploy-cdp-header-footer");
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

const ws = await (async () => {
  const socket = new WebSocket(await findPageWsUrl());
  await new Promise((res, rej) => {
    socket.onopen = res;
    socket.onerror = rej;
  });
  return socket;
})();

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
    if (
      msg.method === "Runtime.consoleAPICalled" &&
      msg.params.type === "error"
    ) {
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

const loaded = waitEvent("Page.loadEventFired");
await send("Page.navigate", { url: URL_TO_TEST });
await loaded;
await sleep(500);

// --- 1. Header entrance: staggered delays + backwards fill -----------------
const headerAnim = await evalJS(`(() => {
  const logo = document.querySelector(".header-container .logo");
  const links = [...document.querySelectorAll(".header-container .desktop-nav > a")];
  const cs = getComputedStyle(logo);
  return {
    logoAnim: cs.animationName,
    logoFill: cs.animationFillMode,
    logoDelay: parseFloat(cs.animationDelay),
    linkAnims: links.map((a) => getComputedStyle(a).animationName),
    linkDelays: links.map((a) => parseFloat(getComputedStyle(a).animationDelay)),
    logoOpacity: parseFloat(cs.opacity),
  };
})()`);

check(
  "header logo runs zd-header-rise",
  headerAnim.logoAnim === "zd-header-rise",
  headerAnim.logoAnim,
);
check(
  "header entrance fill is backwards (hover not locked out)",
  headerAnim.logoFill === "backwards",
  headerAnim.logoFill,
);
check(
  "nav links all animate",
  headerAnim.linkAnims.length === 5 &&
    headerAnim.linkAnims.every((n) => n === "zd-header-rise"),
  headerAnim.linkAnims.join(","),
);
const staggered = headerAnim.linkDelays.every(
  (d, i) => i === 0 || d > headerAnim.linkDelays[i - 1],
);
check(
  "nav link delays increase left-to-right",
  staggered && headerAnim.linkDelays[4] > headerAnim.logoDelay,
  headerAnim.linkDelays.join(" / "),
);

// --- 2. Entrance really plays (restart it at a controlled moment) ----------
const live = await evalJS(`(() => {
  const logo = document.querySelector(".header-container .logo");
  logo.style.animation = "none";
  void logo.offsetWidth;
  logo.style.animation = "";
  const early = parseFloat(getComputedStyle(logo).opacity);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ early, late: parseFloat(getComputedStyle(logo).opacity) });
    }, 550);
  });
})()`, true);
check(
  "header logo fades from hidden to visible",
  live.early < 0.35 && live.late > 0.95,
  `t=0:${live.early} t=550ms:${live.late}`,
);
await sleep(900); // let the entrance finish before the hover checks

// --- 3. Scrolled state toggles --------------------------------------------
const scrolledOn = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo({ top: 400, behavior: "instant" });
  await sleep(600); // let the 0.35s shadow transition finish
  const el = document.querySelector(".header");
  const cs = getComputedStyle(el);
  return {
    cls: el.className,
    shadow: cs.boxShadow,
    bg: cs.backgroundColor,
  };
})()`, true);
check(
  "header gains .is-scrolled after scrolling",
  scrolledOn.cls.includes("is-scrolled"),
  scrolledOn.cls,
);
check(
  "scrolled header deepens its shadow",
  scrolledOn.shadow.includes("24px") || scrolledOn.shadow.includes("rgba(0, 0, 0, 0.12)"),
  scrolledOn.shadow,
);

const scrolledOff = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.scrollTo({ top: 0, behavior: "instant" });
  await sleep(600);
  return document.querySelector(".header").className;
})()`, true);
check(
  "header returns to resting state at the top",
  !scrolledOff.includes("is-scrolled"),
  scrolledOff,
);

// --- 4. Nav hover still works after the entrance animation -----------------
const navHover = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const link = document.querySelector(".desktop-nav > a:not(.start-button)");
  const r = link.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`, true);
await send("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: navHover.x,
  y: navHover.y,
  button: "none",
});
await sleep(400);
const navHoverTransform = await evalJS(
  `getComputedStyle(document.querySelector(".desktop-nav > a:not(.start-button)")).transform`,
);
check(
  "nav link hover transform still applies",
  navHoverTransform !== "none",
  navHoverTransform,
);

// --- 5. Footer reveal + staggered socials ----------------------------------
const footer = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });

  const wrap = document.querySelector(".footer-reveal");
  let waited = 0;
  while (!wrap.classList.contains("is-shown") && waited < 4000) {
    await sleep(50);
    waited += 50;
  }

  const logo = document.querySelector(".footer-logo");
  const icons = [...document.querySelectorAll(".footer-social-link")];
  const para = document.querySelector(".footer-reveal p");
  const sample = () => ({
    logo: parseFloat(getComputedStyle(logo).opacity),
    icons: icons.map((i) => parseFloat(getComputedStyle(i).opacity)),
    para: parseFloat(getComputedStyle(para).opacity),
  });

  const early = sample();
  await sleep(320);
  const mid = sample();
  await sleep(900);
  const late = sample();

  return {
    shown: wrap.classList.contains("is-shown"),
    waited,
    anims: {
      logo: getComputedStyle(logo).animationName,
      icon: getComputedStyle(icons[0]).animationName,
      para: getComputedStyle(para).animationName,
    },
    iconDelays: icons.map((i) => parseFloat(getComputedStyle(i).animationDelay)),
    early, mid, late,
    shadow: getComputedStyle(document.querySelector(".header")).boxShadow,
  };
})()`, true);

check("footer reveal wrapper gets .is-shown", footer.shown, `waited ${footer.waited}ms`);
check(
  "footer children run zd-footer-rise",
  footer.anims.logo === "zd-footer-rise" &&
    footer.anims.icon === "zd-footer-rise" &&
    footer.anims.para === "zd-footer-rise",
  JSON.stringify(footer.anims),
);
check(
  "social icons stagger (increasing delays)",
  footer.iconDelays.every((d, i) => i === 0 || d > footer.iconDelays[i - 1]),
  footer.iconDelays.join(" / "),
);
check(
  "footer logo rises in after reveal",
  footer.early.logo < 0.4 && footer.late.logo > 0.95,
  `t=0:${footer.early.logo} t=1.2s:${footer.late.logo}`,
);
check(
  "social icons cascade (not all at once)",
  footer.mid.icons[0] > footer.mid.icons[4] + 0.15,
  `mid icon1=${footer.mid.icons[0]} icon5=${footer.mid.icons[4]}`,
);
// .footer p keeps its designed resting opacity of 0.9, so only the logo
// and icons are expected to land on exactly 1.
check(
  "everything visible once the entrance settles",
  footer.late.logo > 0.95 &&
    footer.late.icons.every((v) => v > 0.95) &&
    footer.late.para >= 0.85,
  JSON.stringify(footer.late),
);

// --- 6. Footer logo hover survives the entrance animation ------------------
const footerHoverPos = await evalJS(`(() => {
  const r = document.querySelector(".footer-logo").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
await send("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: footerHoverPos.x,
  y: footerHoverPos.y,
  button: "none",
});
await sleep(500);
const footerHoverTransform = await evalJS(
  `getComputedStyle(document.querySelector(".footer-logo")).transform`,
);
check(
  "footer logo hover transform still applies",
  footerHoverTransform !== "none" && footerHoverTransform !== "matrix(1, 0, 0, 1, 0, 0)",
  footerHoverTransform,
);

const footerShot = await screenshot("zedeploy-footer.png");
console.log("SCREENSHOT footer:", footerShot);

// --- 7. prefers-reduced-motion fallbacks -----------------------------------
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await send("Page.reload");
await sleep(1500);
const reduced = await evalJS(`(() => {
  const logo = document.querySelector(".header-container .logo");
  const link = document.querySelector(".desktop-nav > a");
  const fLogo = document.querySelector(".footer-logo");
  const fIcon = document.querySelector(".footer-social-link");
  const fPara = document.querySelector(".footer-reveal p");
  return {
    header: getComputedStyle(logo).animationName,
    nav: getComputedStyle(link).animationName,
    footerLogo: getComputedStyle(fLogo).animationName,
    footerIcon: getComputedStyle(fIcon).animationName,
    footerPara: getComputedStyle(fPara).animationName,
    // fPara rests at 0.9 by design (.footer p), everything else at 1.
    opacities: [logo, link, fLogo, fIcon].map(
      (el) => parseFloat(getComputedStyle(el).opacity),
    ),
    paraOpacity: parseFloat(getComputedStyle(fPara).opacity),
  };
})()`);
check(
  "reduced motion: all new animations disabled",
  reduced.header === "none" &&
    reduced.nav === "none" &&
    reduced.footerLogo === "none" &&
    reduced.footerIcon === "none" &&
    reduced.footerPara === "none",
  JSON.stringify({
    header: reduced.header,
    nav: reduced.nav,
    footerLogo: reduced.footerLogo,
  }),
);
check(
  "reduced motion: content fully visible anyway",
  reduced.opacities.every((v) => v === 1) && reduced.paraOpacity >= 0.85,
  [...reduced.opacities, reduced.paraOpacity].join(", "),
);
await send("Emulation.setEmulatedMedia", { features: [] });

// --- 8. Mobile menu stagger ------------------------------------------------
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await send("Page.reload");
await sleep(1800);
const mobile = await evalJS(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const burger = document.querySelector(".hamburger");
  const burgerAnim = getComputedStyle(burger).animationName;
  const menu = document.querySelector(".mobile-menu");
  burger.click();
  // Wait for hydration/state to land the .open class before sampling the
  // cascade (the entrance starts the moment the class is added).
  let waited = 0;
  while (!menu.classList.contains("open") && waited < 3000) {
    await sleep(50);
    waited += 50;
    if (waited === 500) burger.click();
  }
  const first = menu.querySelector("nav a");
  return {
    burgerAnim,
    open: menu.classList.contains("open"),
    waited,
    linkAnim: getComputedStyle(first).animationName,
    linkDelay: parseFloat(getComputedStyle(first).animationDelay),
    linkOpacity: parseFloat(getComputedStyle(first).opacity),
  };
})()`, true);
check(
  "hamburger animates in with the header",
  mobile.burgerAnim === "zd-header-rise",
  mobile.burgerAnim,
);
check(
  "mobile menu links cascade on open",
  mobile.open && mobile.linkAnim === "zd-header-rise" && mobile.linkDelay > 0,
  `${mobile.linkAnim} delay=${mobile.linkDelay}s opacity=${mobile.linkOpacity}`,
);
await sleep(700);
const mobileSettled = await evalJS(
  `parseFloat(getComputedStyle(document.querySelector(".mobile-menu nav a")).opacity)`,
);
check("mobile menu links end fully visible", mobileSettled === 1, String(mobileSettled));
await send("Emulation.clearDeviceMetricsOverride");

// --- 9. Back to desktop for a top-of-page screenshot -----------------------
await send("Page.reload");
await sleep(1800);
const topShot = await screenshot("zedeploy-header.png");
console.log("SCREENSHOT header:", topShot);

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
