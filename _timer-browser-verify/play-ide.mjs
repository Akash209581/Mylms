import { chromium } from 'playwright'

const WEB = 'http://localhost:3002'
const API = 'http://localhost:3003'
const STUDENT = { email: 'student@eduverse.com', password: 'Student@123' }

async function loginUi(page, context) {
  const seeded = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: WEB },
    body: JSON.stringify(STUDENT),
  })
  const data = await seeded.json()
  if (!seeded.ok) throw new Error(`API login failed ${JSON.stringify(data)}`)
  await context.addCookies([{
    name: 'access_token',
    value: data.access_token,
    url: 'http://localhost:3003/',
    httpOnly: true,
    sameSite: 'Lax',
  }])
  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((user) => localStorage.setItem('user', JSON.stringify(user)), data.user)
  await page.goto(`${WEB}/dashboard/student`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((user) => localStorage.setItem('user', JSON.stringify(user)), data.user)
  return data.user
}

async function measure(page, name, url) {
  const start = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(400)
  const nav = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0]
    if (!t) return null
    return {
      ttfb: Math.round(t.responseStart),
      dcl: Math.round(t.domContentLoadedEventEnd),
      load: Math.round(t.loadEventEnd),
    }
  })
  return { name, wallMs: Date.now() - start, ...nav }
}

async function setMonaco(page, value) {
  await page.waitForFunction(() => window.monaco?.editor?.getModels?.()?.length > 0, null, { timeout: 30000 })
  await page.evaluate((code) => {
    window.monaco.editor.getModels()[0].setValue(code)
  }, value)
}

const results = []
const compilerCalls = []
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('response', async (res) => {
  if (!res.url().includes('/compiler/run')) return
  let body = ''
  try { body = await res.text() } catch {}
  compilerCalls.push({ status: res.status(), body: body.slice(0, 300) })
})

try {
  const loginTiming = await measure(page, 'login', `${WEB}/login`)
  results.push(['login-measure', 'PASS', loginTiming])

  await loginUi(page, context)

  const dashTiming = await measure(page, 'dashboard', `${WEB}/dashboard/student`)
  const dashShell = await page.locator('[data-student-shell]').count()
  const dashMain = await page.locator('#student-main').count()
  results.push(['dashboard-shell', dashShell && dashMain ? 'PASS' : 'FAIL', { ...dashTiming, dashShell, dashMain }])

  const examsTiming = await measure(page, 'exams', `${WEB}/dashboard/student/exams`)
  const examsHeading = await page.getByRole('heading').first().isVisible().catch(() => false)
  results.push(['exams-shell', examsHeading ? 'PASS' : 'FAIL', { ...examsTiming, examsHeading }])

  await page.evaluate(() => {
    Object.keys(localStorage).filter((k) => k.startsWith('student_ide_')).forEach((k) => localStorage.removeItem(k))
  })
  const ideTiming = await measure(page, 'ide', `${WEB}/dashboard/student/ide`)
  const monacoVisible = await page.locator('.monaco-editor').waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
  await page.waitForTimeout(600)
  const editorBox = monacoVisible ? await page.locator('.monaco-editor').first().boundingBox() : null
  const editorOk = !!(editorBox && editorBox.height > 180)
  results.push(['editor-visible', editorOk ? 'PASS' : 'FAIL', { ...ideTiming, monacoVisible, height: editorBox?.height, width: editorBox?.width }])

  await page.getByRole('button', { name: 'Input' }).click()
  await page.locator('textarea[placeholder="21"]').fill('21')
  if (monacoVisible) {
    await setMonaco(page, 'n = int(input())\nprint(n * 2)\n')
    await page.waitForTimeout(400)
  }
  await page.getByRole('button', { name: /^Run/ }).click()
  await page.waitForFunction(() => /Stdout[\s\S]*42|42/.test(document.body.innerText) && /Finished|Stdout/i.test(document.body.innerText), null, { timeout: 45000 })
  results.push(['python-stdin', 'PASS', '21 -> 42'])

  if (monacoVisible) {
    await setMonaco(page, 'print(\n')
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /^Run/ }).click()
    await page.waitForFunction(
      () => /Compilation error|Runtime error|SyntaxError|invalid syntax|was never closed/i.test(document.body.innerText),
      null,
      { timeout: 45000 },
    )
    results.push(['compile-error', 'PASS', 'visible'])
  } else {
    results.push(['compile-error', 'FAIL', 'monaco not ready'])
  }

  const blur = await page.evaluate(() => {
    const sidebar = document.querySelector('[class*="sidebar"], [data-student-shell] aside')
    if (!sidebar) return 'n/a'
    return getComputedStyle(sidebar).backdropFilter
  })
  results.push(['sidebar-blur', blur === 'none' || blur === 'n/a' ? 'PASS' : 'FAIL', blur])
} catch (err) {
  const snippet = await page.locator('body').innerText().catch(() => '')
  results.push(['fatal', 'FAIL', `${err.message} | compiler=${JSON.stringify(compilerCalls)} | ui=${snippet.slice(0, 400)}`])
} finally {
  await browser.close()
}

for (const [name, status, detail] of results) {
  console.log(`${status}\t${name}\t${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
}
if (results.some(([, status]) => status === 'FAIL')) process.exit(1)
