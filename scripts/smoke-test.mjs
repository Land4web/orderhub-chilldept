import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  // Login pagina
  await page.goto('http://localhost:3000/login')
  const loginTitle = await page.textContent('h1')
  console.log('✓ Login pagina:', loginTitle)

  // Inloggen
  await page.fill('input[type=email]', 'maarten@chill-dept.nl')
  await page.fill('input[type=password]', 'admin123')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  console.log('✓ Inloggen gelukt →', page.url())

  // Dashboard — wacht op data
  await page.waitForTimeout(3000)
  const dashH1 = await page.textContent('h1')
  console.log('✓ Dashboard geladen:', dashH1)

  // Screenshot dashboard
  await page.screenshot({ path: '/tmp/dashboard.png' })

  // Orders pagina
  await page.goto('http://localhost:3000/orders')
  await page.waitForTimeout(3000)
  const ordersSubtitle = await page.textContent('p.text-base')
  console.log('✓ Orders pagina:', ordersSubtitle?.trim())
  await page.screenshot({ path: '/tmp/orders.png' })

  // Order detail — met notitie
  await page.goto('http://localhost:3000/orders/ORD-2024-003')
  await page.waitForTimeout(3000)
  const detailH1 = await page.locator('h1').first().textContent()
  console.log('✓ Order detail:', detailH1?.trim())
  await page.screenshot({ path: '/tmp/order-detail.png' })

  // Status wijzigen via dropdown
  await page.selectOption('select', 'shipped')
  await page.waitForTimeout(1500)
  console.log('✓ Status gewijzigd naar: shipped')

  // Fulfillment pagina
  await page.goto('http://localhost:3000/fulfillment')
  await page.waitForTimeout(2000)
  const fullH1 = await page.textContent('h1')
  console.log('✓ Fulfillment:', fullH1?.trim())

  // Producten pagina
  await page.goto('http://localhost:3000/producten')
  await page.waitForTimeout(2000)
  const prodH1 = await page.textContent('h1')
  console.log('✓ Producten:', prodH1?.trim())
  await page.screenshot({ path: '/tmp/producten.png' })

  // Rapportages
  await page.goto('http://localhost:3000/rapportages')
  await page.waitForTimeout(2000)
  const rapH1 = await page.textContent('h1')
  console.log('✓ Rapportages:', rapH1?.trim())

  // Synchronisatie
  await page.goto('http://localhost:3000/synchronisatie')
  await page.waitForTimeout(2000)
  const syncH1 = await page.textContent('h1')
  console.log('✓ Synchronisatie:', syncH1?.trim())

  console.log('\n✓ Alle paginas werken.')
} catch (e) {
  console.error('FOUT:', e.message)
  await page.screenshot({ path: '/tmp/error.png' })
  process.exit(1)
} finally {
  await browser.close()
}
