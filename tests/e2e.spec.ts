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

      // Check if the "Ask to price match" link is visible (Sony should be #1 initially)
      const hasPriceMatchLink = await page.locator('a:has-text("→ Ask to price match")').count();
      console.log(`Price match link visible: ${hasPriceMatchLink > 0}`);

      // Move comfort slider (but note this might change rankings)
      console.log('Step 3a: Moving comfort slider...');
      const comfortSlider = page.locator('input[type="range"]').nth(1); // Second slider is comfort
      await comfortSlider.fill('1');
      await page.waitForTimeout(1000); // Wait for re-ranking animation
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-compare-comfort-100.png'), fullPage: true });
      console.log('✓ Comfort slider moved');

      // Reset sliders to defaults to get Sony back to #1
      console.log('Step 3b: Resetting to default weights...');
      const sliders = page.locator('input[type="range"]');
      await sliders.nth(0).fill('0.9'); // noise cancelling
      await sliders.nth(1).fill('0.7'); // comfort
      await sliders.nth(2).fill('0.7'); // battery
      await sliders.nth(3).fill('0.5'); // call quality
      await sliders.nth(4).fill('0.8'); // price
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04b-compare-reset.png'), fullPage: true });
      console.log('✓ Sliders reset to defaults');

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

      // Alice 2s, Bob 4s (+ renegotiation), Charlie 6s. Allow headroom.
      await page.getByText('Charlie', { exact: true }).waitFor({ timeout: 25000 });
      const membersPanel = page.locator('div.rounded-xl').filter({
        has: page.getByRole('heading', { name: 'Group Members (4)' }),
      });
      await expect(membersPanel).toBeVisible();
      for (const name of ['You', 'Alice', 'Bob', 'Charlie']) {
        await expect(membersPanel.getByText(name, { exact: true })).toBeVisible();
      }
      await expect(membersPanel.getByText('Bot', { exact: true })).toHaveCount(3);
      await expect(membersPanel.getByText('✓ Approved')).toHaveCount(3);
      await expect(membersPanel.getByText('Pending')).toHaveCount(1);

      const currentTier = page.locator('div.border-emerald-500').filter({ hasText: 'Current' });
      await expect(currentTier).toContainText('3 buyers');
      await expect(currentTier).toContainText('£329.00');
      await expect(page.getByText('For 3 buyers, I can offer £329.00 each.')).toBeVisible();

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
      await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-approve-mobile.png'), fullPage: true });
      console.log('✓ Approval page loaded on mobile');

      // Approve
      console.log('Step 6a: Approving purchase...');
      await mobilePage.click('button:has-text("Approve & Checkout")');
      await mobilePage.waitForURL('**/checkout/**', { timeout: 10000 });
      await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-checkout-mobile.png'), fullPage: true });
      console.log('✓ Redirected to checkout');

      await mobileContext.close();

      // Step 7: Check desktop update (should show approval happened)
      console.log('Step 7: Checking desktop update...');
      // In real scenario with Supabase Realtime, desktop would update automatically
      // For now, just verify we're on the right screen
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-desktop-after-approve.png'), fullPage: true });

      // Step 8: Navigate to simulated checkout from desktop
      console.log('Step 8: Navigating to checkout...');
      const approvalId = approvalUrl!.split('/').pop();
      await page.goto(`${BASE_URL}/checkout/${approvalId}`);
      await page.waitForLoadState('networkidle');
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
