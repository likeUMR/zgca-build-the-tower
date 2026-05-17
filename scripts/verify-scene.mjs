import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9230;
const targetHeight = Number(process.argv[2] ?? "9");
const outputPath =
  process.argv[3] ??
  "d:\\PROJECT\\VSCode\\AI+Game\\ZGCA_Build_The_Tower\\zgca-2048-main\\autoplay-verified-cdp.png";
const targetUrl = `http://127.0.0.1:5173/zgca-2048/?autoplay=1&autoplayTarget=${targetHeight}`;
const edgeProfileDir = `${process.env.TEMP ?? "C:\\Temp"}\\zgca-edge-verify`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = spawn(
  edgePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${edgeProfileDir}`,
    "--window-size=440,980",
    "about:blank"
  ],
  {
    stdio: "ignore"
  }
);

const getJson = async (path) => {
  const response = await fetch(`http://127.0.0.1:${debugPort}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
};

const getPageTarget = async () => {
  for (let index = 0; index < 50; index += 1) {
    try {
      const pages = await getJson("/json/list");
      const page = pages.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) {
        return page;
      }
    } catch {
      // Browser may still be booting.
    }
    await wait(200);
  }

  throw new Error("DevTools page target not found.");
};

const pageTarget = await getPageTarget();
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);

let nextCommandId = 1;
const pending = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id) {
    return;
  }
  const resolver = pending.get(message.id);
  if (!resolver) {
    return;
  }
  pending.delete(message.id);
  if (message.error) {
    resolver.reject(new Error(message.error.message));
    return;
  }
  resolver.resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextCommandId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return result.result.value;
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 440,
    height: 980,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.navigate", { url: targetUrl });

  for (let index = 0; index < 100; index += 1) {
    const readyState = await evaluate("document.readyState");
    if (readyState === "complete") {
      break;
    }
    await wait(100);
  }

  let snapshot = null;

  for (let index = 0; index < 300; index += 1) {
    snapshot = await evaluate(`(() => {
      const heightText = document.querySelector(".status-pill strong")?.textContent ?? "0/0";
      const height = Number(heightText.split("/")[0] ?? "0");
      const currentBlock = document.querySelector("[data-current-block]");
      const towerBlocks = [...document.querySelectorAll(".tower-block")];
      const currentTop = currentBlock ? currentBlock.getBoundingClientRect().top : null;
      const highestTowerTop = towerBlocks.length
        ? Math.min(...towerBlocks.map((element) => element.getBoundingClientRect().top))
        : null;
      return { height, currentTop, highestTowerTop, towerCount: towerBlocks.length };
    })()`);

    if (snapshot?.height >= targetHeight && snapshot?.towerCount >= targetHeight) {
      break;
    }

    await wait(100);
  }

  if (!snapshot || snapshot.height < targetHeight || snapshot.towerCount < targetHeight) {
    throw new Error(`Autoplay did not reach target height. Snapshot: ${JSON.stringify(snapshot)}`);
  }

  await wait(1200);
  snapshot = await evaluate(`(() => {
    const heightText = document.querySelector(".status-pill strong")?.textContent ?? "0/0";
    const height = Number(heightText.split("/")[0] ?? "0");
    const currentBlock = document.querySelector("[data-current-block]");
    const towerBlocks = [...document.querySelectorAll(".tower-block")];
    const currentTop = currentBlock ? currentBlock.getBoundingClientRect().top : null;
    const highestTowerTop = towerBlocks.length
      ? Math.min(...towerBlocks.map((element) => element.getBoundingClientRect().top))
      : null;
    return { height, currentTop, highestTowerTop, towerCount: towerBlocks.length };
  })()`);

  if (
    typeof snapshot.currentTop !== "number" ||
    typeof snapshot.highestTowerTop !== "number" ||
    snapshot.currentTop >= snapshot.highestTowerTop
  ) {
    throw new Error(`Current block is not above tower top. Snapshot: ${JSON.stringify(snapshot)}`);
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });

  await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify({ ok: true, outputPath, snapshot }));
} finally {
  socket.close();
  browser.kill();
}
