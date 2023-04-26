import { writeFileSync } from 'fs';
import { desktopConfig, startFlow } from 'lighthouse';
import { afterEach } from 'mocha';
import open from 'open';
import puppeteer from 'puppeteer';

describe('audit example', () => {
  let browser;

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: false,
    });
  });

  afterEach(async () => {
    await browser.close();
  });

  it('run test without cache', async () => {
    const page = await browser.newPage();
    const flow = await startFlow(page,  {
      name: 'Single Navigation' ,
      config: desktopConfig,
    });
    await flow.navigate('https://web.dev/performance-scoring/');

    const report = await flow.generateReport();
    writeFileSync('flow.report.html', report);
    open('flow.report.html', { wait: false });
  });

  it('run test with cache', async () => {
    const page = await browser.newPage();

    const testUrl = 'https://web.dev/performance-scoring/';
    const flow = await startFlow(page, {
      name: 'Cold and warm navigations',
    });
    await flow.navigate(testUrl, {
      stepName: 'Cold navigation',
    });

    await flow.navigate(testUrl, {
      stepName: 'Warm navigation',
      configContext: {
        settingsOverrides: { disableStorageReset: true },
      },
    });

    const report = await flow.generateReport();
    writeFileSync('flow.report-1.html', report);
    open('flow.report-1.html', { wait: false });
  });

  it('snapshot example', async () => {
    const page = await browser.newPage();
    const flow = await startFlow(page, { name: 'Squoosh snapshots' });

    await page.goto('https://squoosh.app/', { waitUntil: 'networkidle0' });

    // Wait for first demo-image button, then open it.
    const demoImageSelector = 'ul[class*="demos"] button';
    await page.waitForSelector(demoImageSelector);
    await flow.snapshot({ stepName: 'Page loaded' });
    await page.click(demoImageSelector);

    // Wait for advanced settings button in UI, then open them.
    const advancedSettingsSelector = 'form label[class*="option-reveal"]';
    await page.waitForSelector(advancedSettingsSelector);
    await flow.snapshot({ stepName: 'Demo loaded' });
    await page.click(advancedSettingsSelector);

    await flow.snapshot({ stepName: 'Advanced settings opened' });

    const report = await flow.generateReport();
    writeFileSync('flow.report-2.html', report);
    open('flow.report-2.html', { wait: false });
  });

  it('timer example', async () => {
    const page = await browser.newPage();
    // Get a session handle to be able to send protocol commands to the page.
    const session = await page.target().createCDPSession();

    const testUrl = 'https://pie-charmed-treatment.glitch.me/';
    const flow = await startFlow(page, {
      name: 'CLS during navigation and on scroll',
      config: desktopConfig,
    });

    // Regular Lighthouse navigation.
    await flow.navigate(testUrl, { stepName: 'Navigate only' });

    // Navigate and scroll timespan.
    await flow.startTimespan({ stepName: 'Navigate and scroll' });
    await page.goto(testUrl, { waitUntil: 'networkidle0' });
    // We need the ability to scroll like a user. There's not a direct puppeteer function for this, but we can use the DevTools Protocol and issue a Input.synthesizeScrollGesture event, which has convenient parameters like repetitions and delay to somewhat simulate a more natural scrolling gesture.
    // https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-synthesizeScrollGesture
    await session.send('Input.synthesizeScrollGesture', {
      x: 100,
      y: 0,
      yDistance: -2500,
      speed: 1000,
      repeatCount: 2,
      repeatDelayMs: 250,
    });
    await flow.endTimespan();

    await browser.close();

    const report = await flow.generateReport();
    writeFileSync('flow.report-4.html', report);
    open('flow.report-4.html', { wait: false });
  });

  // it.skip('audits page', async function () {
  //   this.timeout(120000);
  //   page = await browser.newPage();
  //   await page.setViewport({ width: 1920, height: 1080 });
  //   const flow = await startFlow(page, {
  //     config: desktopConfig,
  //     flags: { screenEmulation: { disabled: true } },
  //   });

  //   // Navigate with a URL
  //   await flow.navigate('');

  //   // Navigate with startNavigation/endNavigation
  //   await flow.startNavigation();
  //   await page.waitForFunction(
  //     'document.evaluate(\'(//*[@class="generatePurchaseOrder"]//label[.="Input Supplier Name"])[last()]\', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue !== null'
  //   );
  //   const element = await page.$x(
  //     '(//*[@class="generatePurchaseOrder"]//label[.="Input Supplier Name"])[last()]'
  //   );
  //   if (element.length > 0) {
  //     await element[0].click();
  //   } else {
  //     console.error('Element not found');
  //   }
  //   await flow.endNavigation();

  //   writeFileSync('report.html', await flow.generateReport());
  // });
});
