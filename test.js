const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[Browser ${msg.type()}] ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        console.log(`[Browser PageError] ${error.message}`);
    });

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
        console.log("Page loaded successfully.");
    } catch (e) {
        console.log("Error loading page:", e.message);
    }

    await new Promise(r => setTimeout(r, 5000)); // wait for client-side React loops
    await browser.close();
})();
