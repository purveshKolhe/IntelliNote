import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function run() {
  const wsUrl = process.env.AGY_BROWSER_WS_URL;
  if (!wsUrl) {
    console.error("AGY_BROWSER_WS_URL is not set!");
    process.exit(1);
  }

  console.log("Connecting to browser...");
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null
  });

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('localhost:5174'));
  if (!page) {
    console.log("No localhost:5174 page open, taking the first one.");
    page = pages[0];
  }

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`PAGE LOG: [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    logs.push(`[PAGE ERROR] ${err.toString()}`);
    console.error(`PAGE ERROR: ${err}`);
  });

  console.log("Navigating to http://localhost:5174/ ...");
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Step 1: Create a workspace if none exists
  console.log("Checking for workspaces...");
  const hasWorkspace = await page.evaluate(() => {
    const card = document.querySelector('.workspace-card');
    return !!card;
  });

  if (!hasWorkspace) {
    console.log("No workspace found. Creating one...");
    const createBtnSelector = '#btn-dashboard-create-ws';
    console.log("Waiting for selector #btn-dashboard-create-ws...");
    await page.waitForSelector(createBtnSelector);
    console.log("Selector found. Clicking #btn-dashboard-create-ws via DOM...");
    await page.evaluate((sel) => document.querySelector(sel).click(), createBtnSelector);
    console.log("Clicked. Waiting for selector #modal-ws-name-input...");
    await page.waitForSelector('#modal-ws-name-input');
    console.log("Selector found. Focusing #modal-ws-name-input...");
    await page.focus('#modal-ws-name-input');
    console.log("Typing workspace name...");
    await page.keyboard.type('Automation Workspace');
    console.log("Clicking #modal-ws-create-btn via DOM...");
    await page.evaluate(() => document.getElementById('modal-ws-create-btn').click());
    console.log("Workspace created. Waiting for redirection...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log("Workspace exists. Entering the first workspace...");
    console.log("Clicking .workspace-card via DOM...");
    await page.evaluate(() => document.querySelector('.workspace-card').click());
    console.log("Clicked. Waiting 2s for transition...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Step 2: Add a Timer widget by typing '/' and selecting the Timer widget
  console.log("Adding Timer widget...");
  const editableSelector = '.block-editable';
  await page.waitForSelector(editableSelector);
  
  // Clear the first block, focus, and type '/'
  await page.evaluate(() => {
    const editable = document.querySelector('.block-editable');
    editable.focus();
    // Select all and delete to clear block
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
  });
  
  await page.keyboard.type('/');
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log("Selecting Timer widget from slash menu...");
  const timerMenuItemSelector = '.slash-menu-item[data-type="timer-widget"]';
  await page.waitForSelector(timerMenuItemSelector);
  await page.evaluate((sel) => document.querySelector(sel).click(), timerMenuItemSelector);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 3: Add a task
  console.log("Adding a new task in Timer widget...");
  const taskInputSelector = 'input[placeholder="Add new task..."]';
  await page.waitForSelector(taskInputSelector);
  await page.focus(taskInputSelector);
  await page.keyboard.type('My Sprint Task');
  await page.keyboard.press('Enter');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 4: Interact with task (Start, Pause, Reset/Log Session)
  console.log("Locating the new task row...");
  const taskRowDetails = await page.evaluate(() => {
    const taskInput = Array.from(document.querySelectorAll('input')).find(el => el.value === 'My Sprint Task');
    if (!taskInput) return null;
    const parentRow = taskInput.closest('div').parentElement;
    
    const startBtn = parentRow.querySelector('button[title="Start"]');
    const resetBtn = parentRow.querySelector('button[title="Reset & Log Session"]');
    const gearBtn = parentRow.querySelector('button[title="Session Logs"]');
    
    if (startBtn) startBtn.click();
    return { hasStart: !!startBtn, hasReset: !!resetBtn, hasGear: !!gearBtn };
  });

  console.log("Start button clicked. Task row elements:", taskRowDetails);
  console.log("Letting timer run for 3 seconds...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("Pausing the timer...");
  await page.evaluate(() => {
    const taskInput = Array.from(document.querySelectorAll('input')).find(el => el.value === 'My Sprint Task');
    if (taskInput) {
      const parentRow = taskInput.closest('div').parentElement;
      const pauseBtn = parentRow.querySelector('button[title="Pause"]');
      if (pauseBtn) pauseBtn.click();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("Resetting & Logging the session...");
  await page.evaluate(() => {
    const taskInput = Array.from(document.querySelectorAll('input')).find(el => el.value === 'My Sprint Task');
    if (taskInput) {
      const parentRow = taskInput.closest('div').parentElement;
      const resetBtn = parentRow.querySelector('button[title="Reset & Log Session"]');
      if (resetBtn) resetBtn.click();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 5: Click the gear button on the timer widget (Session Logs) to open the Analytics Dashboard
  console.log("Opening the Analytics Dashboard...");
  await page.evaluate(() => {
    const taskInput = Array.from(document.querySelectorAll('input')).find(el => el.value === 'My Sprint Task');
    if (taskInput) {
      const parentRow = taskInput.closest('div').parentElement;
      const gearBtn = parentRow.querySelector('button[title="Session Logs"]');
      if (gearBtn) gearBtn.click();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Step 6: Check if the dashboard opens and inspect if there are any console errors or if the UI is broken
  const dashboardDetails = await page.evaluate(() => {
    const panel = document.getElementById('loop-timer-analytics-panel');
    if (!panel) return { opened: false };
    
    const title = panel.querySelector('.loop-analytics-title')?.textContent?.trim();
    const stats = Array.from(panel.querySelectorAll('.loop-analytics-stat-card')).map(card => {
      return {
        value: card.querySelector('.loop-analytics-stat-val')?.textContent?.trim(),
        label: card.querySelector('.loop-analytics-stat-lbl')?.textContent?.trim()
      };
    });
    
    const logCards = Array.from(panel.querySelectorAll('.loop-analytics-log-card')).map(card => {
      return {
        taskName: card.querySelector('.loop-analytics-log-task')?.textContent?.trim(),
        meta: card.querySelector('.loop-analytics-log-meta')?.textContent?.trim()
      };
    });

    return {
      opened: true,
      title,
      stats,
      logCards,
      htmlLength: panel.innerHTML.length
    };
  });

  console.log("Dashboard status:", dashboardDetails);

  // Capture final screenshot
  const screenshotPath = '/home/purveshkolhe/Desktop/intellinote/final_state.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Final screenshot saved to ${screenshotPath}`);

  // Write all gathered data to a report json file
  const report = {
    logs,
    dashboardDetails,
    screenshotPath
  };
  fs.writeFileSync('/home/purveshkolhe/Desktop/intellinote/automation_report.json', JSON.stringify(report, null, 2));
  console.log("Automation report written to automation_report.json");

  await browser.disconnect();
}

run().catch(e => {
  console.error("Automation error:", e);
  process.exit(1);
});
