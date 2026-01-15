/**
 * SRM AUTH BOOTSTRAP - OPTIMIZED COOKIE MINTER
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Persistent browser (launched once, reused)
 * - New context per login (fast)
 * - Optimized wait strategies (no full page loads)
 * - Minimal Chromium flags
 * - Strict timeout control
 * - Serialized logins (queue)
 * 
 * PURPOSE: Mint Zoho IAM cookies via browser ONLY
 * RUNTIME: First login ~12-15s, Subsequent ~5-7s
 * OUTPUT: Raw cookies as JSON
 * 
 * STRICT RULES:
 * - NO scraping
 * - NO persistence
 * - NO frontend involvement
 * - Browser stays alive (contexts close)
 */

import { chromium } from 'playwright';

const SRM_SIGNIN_URL = 'https://academia.srmist.edu.in/accounts/p/10002227248/signin?hide_fp=true&orgtype=40&service_language=en';

// GLOBAL STATE: Persistent browser instance
let browserInstance = null;
let browserLaunchPromise = null;
let loginQueue = [];
let isProcessingLogin = false;

// OPTIMIZED CHROMIUM LAUNCH ARGS
const CHROMIUM_ARGS = [
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-translate',
  '--disable-features=site-per-process',
  '--no-sandbox'
];

// TIMEOUTS
const GLOBAL_TIMEOUT = 30000; // 30s
const STEP_TIMEOUT = 7000;    // 7s per step

/**
 * Launch or get existing browser instance
 * @returns {Promise<Browser>}
 */
async function getBrowser() {
  if (browserInstance) {
    return browserInstance;
  }
  
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }
  
  browserLaunchPromise = chromium.launch({
    headless: true,
    args: CHROMIUM_ARGS
  }).then(browser => {
    browserInstance = browser;
    browserLaunchPromise = null;
    
    // Handle browser crash
    browser.on('disconnected', () => {
      browserInstance = null;
      browserLaunchPromise = null;
    });
    
    console.error('[Auth Bootstrap] Browser launched (persistent)');
    return browser;
  });
  
  return browserLaunchPromise;
}

/**
 * Wait for authentication completion using fastest reliable signal
 * @param {Page} page - Playwright page
 * @param {BrowserContext} context - Browser context
 * @returns {Promise<boolean>} - true if authenticated
 */
async function waitForAuthCompletion(page, context) {
  const startTime = Date.now();
  let lastCookieCount = 0;
  let stableCookieCount = 0;
  
  while (Date.now() - startTime < STEP_TIMEOUT) {
    // Check cookies (fastest signal)
    const cookies = await context.cookies();
    const cookieCount = cookies.length;
    
    // Check for IAM cookies (required)
    const hasIamCookie = cookies.some(c => 
      c.name === 'iamcsr' || 
      c.name.startsWith('_iamadt_') || 
      c.name.startsWith('__Secure-iamsdt_')
    );
    
    // Check for session cookies (JSESSIONID, _z_identity)
    const hasSessionCookie = cookies.some(c => 
      c.name === 'JSESSIONID' || 
      c.name === '_z_identity' ||
      c.name.startsWith('zalb_')
    );
    
    // Wait for cookie count to stabilize (all cookies set)
    if (cookieCount === lastCookieCount) {
      stableCookieCount++;
    } else {
      stableCookieCount = 0;
      lastCookieCount = cookieCount;
    }
    
    // Success criteria: IAM cookie + session cookie + stable count (all cookies loaded)
    if (hasIamCookie && hasSessionCookie && stableCookieCount >= 3) {
      console.error(`[Auth Bootstrap] Auth detected via cookie (${cookieCount} cookies, stable)`);
      return true;
    }
    
    // Check URL (fast signal)
    const url = page.url();
    if (url.includes('/portal/academia-academic-services') || 
        (url.includes('/srmist.edu.in/') && !url.includes('signin') && !url.includes('login'))) {
      // URL changed, but wait a bit for all cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      console.error('[Auth Bootstrap] Auth detected via URL redirect');
      return true;
    }
    
    // Check for login error indicators
    const content = await page.content().catch(() => '');
    if (content.includes('incorrect') || content.includes('invalid') || 
        content.includes('wrong password') || content.includes('authentication failed')) {
      throw new Error('Login failed. Please check your credentials.');
    }
    
    // Small delay before next check
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Final check: if we have IAM cookies, consider it success
  const finalCookies = await context.cookies();
  const hasIamCookie = finalCookies.some(c => 
    c.name === 'iamcsr' || 
    c.name.startsWith('_iamadt_') || 
    c.name.startsWith('__Secure-iamsdt_')
  );
  
  if (hasIamCookie) {
    console.error(`[Auth Bootstrap] Auth confirmed (timeout reached, but IAM cookie present)`);
    return true;
  }
  
  return false;
}

/**
 * Process login queue (serialized)
 */
async function processLoginQueue() {
  if (isProcessingLogin || loginQueue.length === 0) {
    return;
  }
  
  isProcessingLogin = true;
  const { email, password, resolve, reject } = loginQueue.shift();
  
  try {
    const result = await performLogin(email, password);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    isProcessingLogin = false;
    // Process next in queue
    if (loginQueue.length > 0) {
      setImmediate(() => processLoginQueue());
    }
  }
}

/**
 * Perform actual login (internal)
 * @param {string} email - SRM email
 * @param {string} password - SRM password
 * @returns {Promise<{success: boolean, cookies?: Array, error?: string}>}
 */
async function performLogin(email, password) {
  const browser = await getBrowser();
  let context = null;
  
  try {
    console.error(`[Auth Bootstrap] Starting login for ${email.substring(0, 3)}***`);
    
    // Create NEW context (fast, isolated)
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Navigate (no full page load wait)
    console.error(`[Auth Bootstrap] Navigating to signin page...`);
    await page.goto(SRM_SIGNIN_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: STEP_TIMEOUT 
    });
    
    // Minimal wait for Zoho JS initialization
    await page.waitForTimeout(1000);
    
    // STEP 1: Find and fill email
    const emailSelectors = [
      'input[id="login_id"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[name="LOGIN_ID"]'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.waitForSelector(selector, { timeout: 5000 });
        if (emailInput) {
          console.error(`[Auth Bootstrap] Found email input: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!emailInput) {
      throw new Error('Could not find email input field');
    }
    
    await emailInput.fill(email);
    
    // STEP 2: Click Next
    const nextButtonSelectors = [
      'button:has-text("Next")',
      'button[type="submit"]',
      'button[id="nextbtn"]'
    ];
    
    let nextButton = null;
    for (const selector of nextButtonSelectors) {
      try {
        nextButton = await page.$(selector);
        if (nextButton) {
          console.error(`[Auth Bootstrap] Found Next button: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (nextButton) {
      await nextButton.click();
    } else {
      await emailInput.press('Enter');
    }
    
    // STEP 3: Wait for password field (targeted wait)
    console.error(`[Auth Bootstrap] Waiting for password field...`);
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[name="PASSWORD"]'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.waitForSelector(selector, { timeout: STEP_TIMEOUT });
        if (passwordInput) {
          console.error(`[Auth Bootstrap] Found password input: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!passwordInput) {
      throw new Error('Could not find password input field');
    }
    
    // STEP 4: Fill password and sign in
    await passwordInput.fill(password);
    
    const signInSelectors = [
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button[type="submit"]',
      'button[id="signin"]'
    ];
    
    let signInButton = null;
    for (const selector of signInSelectors) {
      try {
        signInButton = await page.$(selector);
        if (signInButton) {
          console.error(`[Auth Bootstrap] Found Sign In button: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (signInButton) {
      // Click and wait for navigation (if it happens)
      await Promise.all([
        page.waitForURL('**/srmist.edu.in/**', { timeout: 5000 }).catch(() => {}),
        signInButton.click()
      ]).catch(() => {});
    } else {
      await passwordInput.press('Enter');
      // Wait a bit for navigation
      await page.waitForURL('**/srmist.edu.in/**', { timeout: 5000 }).catch(() => {});
    }
    
    // STEP 5: Wait for auth completion (optimized)
    console.error(`[Auth Bootstrap] Waiting for authentication...`);
    const authSuccess = await waitForAuthCompletion(page, context);
    
    if (!authSuccess) {
      // Final validation
      const cookies = await context.cookies();
      const hasIamCookie = cookies.some(c => 
        c.name === 'iamcsr' || 
        c.name.startsWith('_iamadt_') || 
        c.name.startsWith('__Secure-iamsdt_')
      );
      
      if (!hasIamCookie) {
        throw new Error('Authentication timeout - no IAM cookies detected');
      }
    }
    
    // Wait for page to stabilize and all cookies to be set
    // Secure domain cookies (__Secure-iamsdt, _iamadt, _iambdt) may be set asynchronously
    // Wait for cookie count to reach expected minimum (at least 5-8 cookies)
    let cookieCount = 0;
    let stableCount = 0;
    const maxWait = 3000; // Max 3s additional wait
    const startWait = Date.now();
    
    while (Date.now() - startWait < maxWait) {
      const cookies = await context.cookies();
      const currentCount = cookies.length;
      
      if (currentCount === cookieCount) {
        stableCount++;
        // If we have at least 5 cookies and count is stable, we're done
        if (currentCount >= 5 && stableCount >= 2) {
          break;
        }
      } else {
        cookieCount = currentCount;
        stableCount = 0;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // EXTRACT COOKIES
    const cookies = await context.cookies();
    
    if (!cookies || cookies.length === 0) {
      throw new Error('Login appeared successful but no cookies were captured');
    }
    
    console.error(`[Auth Bootstrap] ✓ Success - Extracted ${cookies.length} cookie(s)`);
    console.error(`[Auth Bootstrap] Cookies: ${cookies.map(c => c.name).join(', ')}`);
    
    return {
      success: true,
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires ? new Date(c.expires * 1000).toISOString() : null,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite || 'Lax',
      })),
    };
    
  } catch (error) {
    console.error(`[Auth Bootstrap] Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Bootstrap failed',
    };
  } finally {
    // Close context ONLY (browser stays alive)
    if (context) {
      await context.close().catch(() => {});
      console.error('[Auth Bootstrap] Context closed');
    }
  }
}

/**
 * Bootstrap SRM login and extract Zoho IAM cookies (public API)
 * @param {string} email - SRM email
 * @param {string} password - SRM password (SECURITY: Never stored/logged)
 * @returns {Promise<{success: boolean, cookies?: Array, error?: string}>}
 */
export async function bootstrapLogin(email, password) {
  return new Promise((resolve, reject) => {
    // Add to queue (serialized)
    loginQueue.push({ email, password, resolve, reject });
    
    // Process queue
    processLoginQueue();
    
    // Global timeout
    setTimeout(() => {
      const index = loginQueue.findIndex(item => item.email === email);
      if (index !== -1) {
        loginQueue.splice(index, 1);
        reject(new Error('Login timeout (30s)'));
      }
    }, GLOBAL_TIMEOUT);
  });
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.error('[Auth Bootstrap] SIGTERM received, closing browser...');
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.error('[Auth Bootstrap] SIGINT received, closing browser...');
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
  process.exit(0);
});

// CLI mode - Output JSON only for Go to parse
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1].endsWith('login.js');

if (isMainModule) {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error('Usage: node login.js <email> <password>');
    process.exit(1);
  }
  
  bootstrapLogin(email, password).then(result => {
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.log(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }));
    process.exit(1);
  });
}
