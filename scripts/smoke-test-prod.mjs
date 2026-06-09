import { chromium } from 'playwright'

const BASE = 'https://orderhub-chilldept.vercel.app'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  // Login pagina
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  const loginTitle = await page.textContent('h1')
  console.log('✓ Login pagina:', loginTitle)
  await page.screenshot({ path: '/tmp/prod-login.png' })

  // Inloggen
  await page.fill('input[type=email]', 'maarten@chill-dept.nl')
  await page.fill('input[type=password]', 'admin123')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  console.log('✓ Inloggen gelukt →', page.url())

  // Dashboard
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const dashH1 = await page.textContent('h1')
  console.log('✓ Dashboard:', dashH1)
  await page.screenshot({ path: '/tmp/prod-dashboard.png' })

  // Orders
  await page.goto(`${BASE}/orders`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const subtitle = await page.textContent('p.text-base')
  console.log('✓ Orders:', subtitle?.trim())
  await page.screenshot({ path: '/tmp/prod-orders.png' })

  // Order detail
  await page.goto(`${BASE}/orders/ORD-2024-001`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const detailH1 = await page.locator('h1').first().textContent()
  console.log('✓ Order detail:', detailH1?.trim())
  await page.screenshot({ path: '/tmp/prod-order-detail.png' })

  console.log('\n✓ Productie deployment werkt.')
} catch (e) {
  console.error('FOUT:', e.message)
  await page.screenshot({ path: '/tmp/prod-error.png' })
  process.exit(1)
} finally {
  await browser.close()
}
