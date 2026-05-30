/**
 * public/ogp-preview-a.html の .ogp を 1200x630 でキャプチャして public/ogp.png に保存する。
 * 実行: node scripts/capture-ogp.mjs
 * 事前に npm run dev でサーバーを起動するか、--file でローカルHTMLを開く。
 */
import { launch } from "puppeteer";
import { pathToFileURL } from "url";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const useFile = process.argv.includes("--file");

const url = useFile
  ? pathToFileURL(join(root, "public", "ogp-preview-a.html")).href
  : "http://localhost:3001/og-template";

const outPath = join(root, "public", "ogp.png");

async function main() {
  const browser = await launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--disable-gpu-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
    ],
  });
  try {
    const page = await browser.newPage();
    
    // ページ側のエラーとログをキャプチャしてコンソールに出力するリスナーを追加
    page.on("console", (msg) => console.log(`[BROWSER LOG] ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[BROWSER ERROR] ${err.message}`));
    
    await page.setViewport({ width: 1200, height: 630 });
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector(".ogp", { timeout: 15000 });
    
    // WebGLマテリアルと環境マップ（Sunset preset）の非同期読み込み・描画完了を確実にするための3秒ウェイト
    console.log("Waiting 3 seconds for Three.js WebGL compile & Environment maps to render...");
    await new Promise((r) => setTimeout(r, 3000));
    
    const el = await page.$(".ogp");
    if (!el) throw new Error(".ogp が見つかりません");
    await el.screenshot({ path: outPath, type: "png" });
    console.log("Saved:", outPath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  if (!useFile && (err.code === "ECONNREFUSED" || err.message?.includes("Navigation"))) {
    console.error("開発サーバーが起動していません。");
    console.error("  npm run dev で起動するか、次のように --file でローカルHTMLを開いてください:");
    console.error("  node scripts/capture-ogp.mjs --file");
  } else {
    console.error(err);
  }
  process.exit(1);
});
