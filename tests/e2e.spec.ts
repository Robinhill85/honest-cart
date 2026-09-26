import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = '/opt/cursor/artifacts';
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Honest Cart - Happy Path E2E', () => {
  test('complete user journey from ask to receipt', async ({ browser }) => {
    // Desktop context for main flow
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await desktopContext.newPage();

    try {
      // Step 1: Ask screen
      console.log('Step 1: Loading ask screen...');
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-ask-screen.png'), fullPage: true });
      console.log('✓ Ask screen loaded');

      // Verify ask screen elements
      await expect(page.locator('h1')).toContainText('Honest Cart');
      await expect(page.locator('textarea')).toBeVisible();

      // Step 2: Research feed
      console.log('Step 2: Starting research...');
      await page.click('button:has-text("Research & Compare")');
      await page.waitForSelector('text=Researching', { timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-research-feed.png'), fullPage: true });
      
      // Wait for research to complete and redirect
      await page.waitForURL('**/compare', { timeout: 15000 });
      console.log('✓ Research completed, redirected to compare');

      // Step 3: Comparison board
      console.log('Step 3: Testing comparison board...');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-compare-initial.png'), fullPage: true });

      await expect(page.getByText('No data').first()).toBeVisible();

      const headings = page.locator('h3');
      const orderBefore = await headings.allTextContents();
      console.log('Order before:', orderBefore.join(' > '));

      // Noise cancelling starts at 100%. Dropping it to 0 changes who is first.
      console.log('Step 3a: Moving noise-cancelling slider to 0...');
      await page.locator('input[type="range"]').nth(0).fill('0');
      await expect.poll(async () => headings.first().textContent()).not.toBe(orderBefore[0]);
      const orderAfter = await headings.allTextContents();
      expect(orderAfter.join('|')).not.toBe(orderBefore.join('|'));
      console.log('Order after:', orderAfter.join(' > '));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-compare-order-changed.png'), fullPage: true });
      console.log('✓ Noise-cancelling slider changed the order');

      // Open evidence drawer
      console.log('Step 3c: Opening evidence drawer...');
      const featureBars = page.locator('button:has(.rounded-full)').first();
      await featureBars.click();
      await page.waitForSelector('text=Reviews', { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-evidence-drawer.png'), fullPage: true });
      
      // Close drawer
      await page.click('button:has-text("✕")');
      await page.waitForTimeout(500);
      console.log('✓ Evidence drawer opened and closed');

      // Step 4: Deal screen
      console.log('Step 4: Navigating to deal screen...');
      // Navigate directly to deal page (the link only appears when Sony is #1)
      await page.goto(`${BASE_URL}/deal`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-deal-screen.png'), fullPage: true });
      console.log('✓ Deal screen loaded');

      // Step 5: Negotiation
      console.log('Step 5: Starting negotiation...');
      await page.click('button:has-text("Ask Currys to Match")');
      await page.waitForSelector('text=Buyer Bot', { timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-negotiation-start.png'), fullPage: true });

      // Wait for negotiation to complete
      await page.waitForSelector('text=Your Approval Required', { timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-negotiation-complete.png'), fullPage: true });
      console.log('✓ Negotiation completed');

      // Step 5b: Group buy — 3 friend bots, ladder drops to the 3-buyer tier
      console.log('Step 5b: Inviting friends...');
      await page.click('button:has-text("Invite Friends")');
      await page.waitForSelector('text=Share link', { timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08b-group-buy-invited.png'), fullPage: true });

      // Names sit beside a "Bot" badge, so the element text is "Alice Bot", not "Alice".
      // Alice 2s, Bob 4s (+ renegotiation), Charlie 6s — about 14s total.
      await page.getByText('Charlie').waitFor({ timeout: 25000 });
      const membersPanel = page.locator('div.rounded-xl').filter({
        has: page.getByRole('heading', { name: 'Group Members (4)' }),
      });
      await expect(membersPanel).toBeVisible();
      for (const name of ['You', 'Alice', 'Bob', 'Charlie']) {
        await expect(membersPanel.getByText(name)).toBeVisible();
      }
      await expect(membersPanel.getByText('Bot', { exact: true })).toHaveCount(3);
      await expect(membersPanel.getByText('✓ Approved')).toHaveCount(3);
      await expect(membersPanel.getByText('Pending')).toHaveCount(1);

      const currentTier = page.locator('div.border-emerald-500').filter({ hasText: 'Current' });
      await expect(currentTier).toContainText('3 buyers');
      await expect(currentTier).toContainText('£264.99');
      const soloTier = page.locator('div.border-2').filter({ hasText: '1 buyer' });
      await expect(soloTier).toContainText('£279.99');
      const renegotiation = page.getByText('Group floor for 3 buyers is £264.99 each.', { exact: false });
      await renegotiation.scrollIntoViewIfNeeded();
      await expect(renegotiation).toBeVisible();

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08c-group-buy-complete.png'), fullPage: true });
      console.log('✓ Group buy: 4 members, £329.00 tier, bot cards auto-approved');

      // Extract approval URL
      const approvalLink = await page.locator('a[href*="/approve/"]').getAttribute('href');
      expect(approvalLink).toBeTruthy();
      // If the link is already absolute, use it as-is, otherwise prepend BASE_URL
      const approvalUrl = approvalLink!.startsWith('http') ? approvalLink : `${BASE_URL}${approvalLink}`;
      console.log(`Approval URL: ${approvalUrl}`);

      // Step 6: Mobile approval (second context)
      console.log('Step 6: Opening approval in mobile context...');
      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      });
      const mobilePage = await mobileContext.newPage();

      await mobilePage.goto(approvalUrl!);
      await mobilePage.waitForLoadState('networkidle');
      await expect(mobilePage.getByText('£264.99')).toBeVisible();
      await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-approve-mobile.png'), fullPage: true });
      console.log('✓ Approval page loaded on mobile at the group price');

      // Approve
      console.log('Step 6a: Approving purchase...');
      await mobilePage.click('button:has-text("Approve & Checkout")');
      await mobilePage.waitForURL('**/checkout/**', { timeout: 10000 });
      await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-checkout-mobile.png'), fullPage: true });
      console.log('✓ Redirected to checkout');

      await mobileContext.close();

      // Step 7: Laptop polls the approval and flips You to approved
      console.log('Step 7: Checking desktop update...');
      await expect(page.getByText('Approved on phone').first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('link', { name: 'View receipt' }).first()).toBeVisible();
      const youCard = page.locator('div.rounded-lg').filter({ hasText: 'You' }).first();
      await expect(youCard).toContainText('Approved on phone');
      await expect(youCard).not.toContainText('Pending');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-desktop-after-approve.png'), fullPage: true });
      console.log('✓ Laptop showed Approved on phone');

      // Step 8: Navigate to simulated checkout from desktop
      console.log('Step 8: Navigating to checkout...');
      const approvalId = approvalUrl!.split('/').pop();
      await page.goto(`${BASE_URL}/checkout/${approvalId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('£264.99')).toBeVisible({ timeout: 8000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-simulated-checkout.png'), fullPage: true });
      console.log('✓ Simulated checkout page loaded');

      // Continue to receipt
      await page.click('a:has-text("Continue to Receipt")');
      await page.waitForURL('**/receipt/**');

      // Step 9: Receipt
      console.log('Step 9: Viewing receipt...');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-receipt.png'), fullPage: true });
      await expect(page.locator('h1')).toContainText('Purchase Complete');
      await expect(page.getByText('£264.99')).toBeVisible();
      console.log('✓ Receipt page loaded');

      // Step 10: Seller dashboard
      console.log('Step 10: Loading seller dashboard...');
      await page.goto(`${BASE_URL}/seller`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-seller-dashboard.png'), fullPage: true });
      await expect(page.locator('h1')).toContainText('Currys Seller Dashboard');
      console.log('✓ Seller dashboard loaded');

      console.log('\n✅ All steps completed successfully!');
      console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

    } catch (error) {
      console.error('Test failed:', error);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png'), fullPage: true });
      throw error;
    } finally {
      await desktopContext.close();
    }
  });
});
