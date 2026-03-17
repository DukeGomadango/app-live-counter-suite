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
  : "http://localhost:3000/ogp-preview-a.html";

const outPath = join(root, "public", "ogp.png");

async function main() {
  const browser = await launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.goto(url, {
      waitUntil: useFile ? "domcontentloaded" : "networkidle0",
      timeout: useFile ? 15000 : 15000,
    });
    await page.waitForSelector(".ogp", { timeout: 5000 });
    if (useFile) await new Promise((r) => setTimeout(r, 800));
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
