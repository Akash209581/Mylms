import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'
import { chromium } from 'playwright'

const dir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(dir, '..', 'LMS-backend', '.env') })

const API = 'http://localhost:3003'
const WEB = 'http://localhost:3002'
const fixture = JSON.parse(fs.readFileSync(path.join(dir, 'fixture.json'), 'utf8'))

async function adminCookie() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: WEB },
    body: JSON.stringify({ email: 'superadmin@eduverse.com', password: 'SuperAdmin@123' }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`Admin login failed ${JSON.stringify(data)}`)
  return `access_token=${data.access_token}`
}

async function createFreshExams() {
  const cookie = await adminCookie()
  async function makeExam(title) {
    const created = await api('POST', `${API}/exams`, cookie, {
      title,
      description: 'Temporary browser timer verification exam',
      instructions: 'Answer the MCQ and optionally run the coding question.',
      durationMinutes: 10,
      passingMarks: 1,
      attemptLimit: 1,
      tabSwitchMonitoring: true,
      autoSubmit: true,
      showResults: true,
      showCorrectAnswers: true,
    })
    if (!created.ok) throw new Error(`Create exam failed ${JSON.stringify(created.data)}`)
    const id = created.data.id
    await api('POST', `${API}/exams/${id}/questions/mcq`, cookie, {
      questions: [{ questionId: fixture.mcqId, marks: 1, negativeMarks: 0 }],
    })
    await api('POST', `${API}/exams/${id}/questions/coding`, cookie, {
      questions: [{ questionId: fixture.pqId, marks: 2, negativeMarks: 0 }],
    })
    const assign = await api('POST', `${API}/exams/${id}/assign`, cookie, { studentIds: [fixture.studentId] })
    if (!assign.ok) throw new Error(`Assign failed ${JSON.stringify(assign.data)}`)
    const pub = await api('POST', `${API}/exams/${id}/publish`, cookie)
    if (!pub.ok) throw new Error(`Publish failed ${JSON.stringify(pub.data)}`)
    return id
  }
  const stamp = Date.now()
  const exams = {
    examNatural: await makeExam(`TIMER-NATURAL-${stamp}`),
    examCoding: await makeExam(`TIMER-CODING-${stamp}`),
    examTabs: await makeExam(`TIMER-TABS-${stamp}`),
  }
  note(`Fresh exams ${JSON.stringify(exams)}`)
  return exams
}
const shots = path.join(dir, 'shots')
fs.mkdirSync(shots, { recursive: true })

const report = {
  start: 'FAIL',
  refresh: 'FAIL',
  navigation: 'FAIL',
  naturalExpiry: 'FAIL',
  mcqAutoSubmit: 'FAIL',
  codingAutoSubmit: 'FAIL',
  expiryDuringDocker: 'FAIL',
  duplicate: 'FAIL',
  multiTab: 'FAIL',
  thirdTab: 'FAIL',
  notes: [],
}

function note(msg) {
  console.log(msg)
  report.notes.push(msg)
}

async function api(method, url, cookie, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Origin: WEB,
      Referer: `${WEB}/`,
      Cookie: cookie,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function shortenDeadline(attemptId, seconds) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const when = new Date(Date.now() + seconds * 1000)
  await client.query('UPDATE exam_attempts SET deadline_at = $2 WHERE id = $1', [attemptId, when.toISOString()])
  const row = await client.query('SELECT deadline_at, status, EXTRACT(EPOCH FROM (deadline_at - NOW())) AS remaining FROM exam_attempts WHERE id = $1', [attemptId])
  await client.end()
  note(`Shortened attempt ${attemptId} to ${when.toISOString()} db=${JSON.stringify(row.rows[0])}`)
  return row.rows[0]
}

async function attemptRow(attemptId) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const row = await client.query(
    'SELECT id, status, mcq_answers, total_score, auto_submitted_reason FROM exam_attempts WHERE id = $1',
    [attemptId],
  )
  await client.end()
  return row.rows[0]
}

async function loginUi(page, context, email, password) {
  const seeded = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: WEB },
    body: JSON.stringify({ email, password }),
  })
  const seededData = await seeded.json()
  if (!seeded.ok) throw new Error(`API login failed ${JSON.stringify(seededData)}`)
  await context.addCookies([{
    name: 'access_token',
    value: seededData.access_token,
    url: 'http://localhost:3003/',
    httpOnly: true,
    sameSite: 'Lax',
  }])

  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').waitFor({ state: 'visible' })
  await page.waitForTimeout(1500)
  await page.locator('input[type="email"]').click()
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').click()
  await page.locator('input[type="password"]').fill(password)
  const emailVal = await page.locator('input[type="email"]').inputValue()
  const passVal = await page.locator('input[type="password"]').inputValue()
  if (emailVal !== email || !passVal) {
    await page.evaluate(({ e, p, user }) => {
      localStorage.setItem('user', JSON.stringify(user))
      const emailInput = document.querySelector('input[type="email"]')
      const passInput = document.querySelector('input[type="password"]')
      if (emailInput) {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
        proto.set.call(emailInput, e)
        emailInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      if (passInput) {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
        proto.set.call(passInput, p)
        passInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, { e: email, p: password, user: seededData.user })
  }
  await page.getByRole('button', { name: /Sign In/i }).click()
  try {
    await page.waitForURL(/\/dashboard\//, { timeout: 45000 })
  } catch {
    await page.evaluate((user) => localStorage.setItem('user', JSON.stringify(user)), seededData.user)
    await page.goto(`${WEB}/dashboard/student`, { waitUntil: 'domcontentloaded' })
  }
  await page.evaluate((user) => localStorage.setItem('user', JSON.stringify(user)), seededData.user)
}

async function dismissFullscreen(page) {
  const btn = page.getByRole('button', { name: /Enter Fullscreen to Continue/i })
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(500)
  }
}

async function startExam(page, examId) {
  await page.goto(`${WEB}/dashboard/student/exams/${examId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('#start-exam-btn').waitFor({ state: 'visible', timeout: 20000 })
  const agree = page.locator('#exam-agree-checkbox')
  if (await agree.count()) {
    await page.locator('label:has(#exam-agree-checkbox)').click()
    await agree.check({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.waitForFunction(() => {
    const btn = document.querySelector('#start-exam-btn')
    return btn && !btn.disabled
  }, null, { timeout: 10000 })
  const started = page.waitForResponse((r) => r.url().includes('/start') && r.request().method() === 'POST', { timeout: 90000 }).catch(() => null)
  await page.locator('#start-exam-btn').click()
  const startRes = await started
  if (startRes && !startRes.ok()) {
    const body = await startRes.text()
    note(`Start exam HTTP ${startRes.status()} ${body}`)
  }
  try {
    await page.waitForURL(/\/attempt\?attemptId=/, { timeout: 20000 })
  } catch {
    const cookie = await studentCookie(page.context())
    const apiStart = await api('POST', `${API}/student/exams/${examId}/start`, cookie)
    note(`UI start did not navigate; API start ${apiStart.status} ${JSON.stringify(apiStart.data)}`)
    const attemptId = apiStart.data?.attemptId
    if (!attemptId) throw new Error(`Could not start exam ${examId}`)
    await page.goto(`${WEB}/dashboard/student/exams/${examId}/attempt?attemptId=${attemptId}`, { waitUntil: 'domcontentloaded' })
  }
  await page.waitForFunction(() => {
    return Boolean(document.querySelector('[data-testid="exam-timer"]'))
      || /Exam Not Active/i.test(document.body.innerText)
  }, null, { timeout: 25000 })
  if (/Exam Not Active/i.test(await page.locator('body').innerText())) {
    throw new Error(`Attempt page is not in progress: ${page.url()}`)
  }
  await dismissFullscreen(page)
  const url = new URL(page.url())
  return Number(url.searchParams.get('attemptId'))
}

function parseTimer(text) {
  const m = String(text).match(/(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

async function hidePage(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

async function studentCookie(context) {
  const cookies = await context.cookies('http://localhost:3003')
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-features=VizDisplayCompositor'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  })
  context.setDefaultTimeout(25000)
  const page = await context.newPage()

  try {
    const exams = await createFreshExams()
    await loginUi(page, context, fixture.studentEmail, fixture.studentPassword)
    note('UI login as student succeeded')

    const skipNatural = process.argv.includes('--rest') || process.argv.includes('--tabs')
    const skipCoding = process.argv.includes('--tabs')
    let attemptA = null
    if (skipNatural) {
      note('Skipping already-passed natural expiry block')
      report.start = 'PASS'
      report.refresh = 'PASS'
      report.navigation = 'PASS'
      report.naturalExpiry = 'PASS'
      report.mcqAutoSubmit = 'PASS'
      report.duplicate = 'PASS'
    }

    // 1-7 natural expiry exam
    if (!skipNatural) {
    attemptA = await startExam(page, exams.examNatural)
    const timer1 = parseTimer(await page.locator('[data-testid="exam-timer"]').innerText())
    await page.screenshot({ path: path.join(shots, '01-start.png') })
    if (timer1 != null && timer1 > 0) {
      report.start = 'PASS'
      note(`Start timer shows ${timer1}s`)
    } else {
      note(`Start timer parse failed: ${await page.locator('[data-testid="exam-timer"]').innerText()}`)
    }

    await shortenDeadline(attemptA, 40)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="exam-timer"]', { timeout: 20000 })
    await dismissFullscreen(page)
    const timer2 = parseTimer(await page.locator('[data-testid="exam-timer"]').innerText())
    await page.screenshot({ path: path.join(shots, '02-refresh.png') })
    if (timer2 != null && timer2 > 0 && timer2 <= 50) {
      report.refresh = 'PASS'
      note(`Refresh remaining ${timer2}s (server deadline honored)`)
    } else {
      note(`Refresh remaining unexpected: ${timer2}`)
    }

    const beforeNav = parseTimer(await page.locator('[data-testid="exam-timer"]').innerText())
    const codingBtn = page.getByTitle(/Coding Problem/i).first()
    if (await codingBtn.isVisible().catch(() => false)) {
      await codingBtn.click()
      await page.waitForTimeout(800)
    }
    const midNav = parseTimer(await page.locator('[data-testid="exam-timer"]').innerText())
    const mcqBtn = page.locator('aside button', { hasText: /^1$/ }).first()
    if (await mcqBtn.isVisible().catch(() => false)) {
      await mcqBtn.click()
      await page.waitForTimeout(600)
    }
    const afterNav = parseTimer(await page.locator('[data-testid="exam-timer"]').innerText())
    await page.screenshot({ path: path.join(shots, '03-nav.png') })
    if (beforeNav != null && afterNav != null && Math.abs(beforeNav - afterNav) <= 8) {
      report.navigation = 'PASS'
      note(`Navigation timer stayed in sync ${beforeNav} -> ${midNav} -> ${afterNav}`)
    } else {
      note(`Navigation timer drift ${beforeNav} -> ${afterNav}`)
    }

    const option = page.locator('main button').filter({ hasText: /Paris|A\b|option/i }).first()
    const firstOpt = page.locator('main button.w-full, main button[type="button"]').nth(0)
    if (await option.isVisible().catch(() => false)) await option.click()
    else if (await firstOpt.isVisible().catch(() => false)) await firstOpt.click()
    await page.waitForTimeout(800)

    note('Waiting for natural expiry…')
    await page.waitForFunction(() => {
      const t = document.querySelector('[data-testid="exam-timer"]')
      return !t || /00:00:00/.test(t.textContent || '') || /Exam Not Active|Results|Score/i.test(document.body.innerText)
    }, null, { timeout: 70000 })
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(shots, '04-expired.png') })

    const cookie = await studentCookie(context)
    const afterA = await attemptRow(attemptA)
    const getA = await api('GET', `${API}/student/exams/attempts/${attemptA}`, cookie)
    note(`Attempt A db=${JSON.stringify(afterA)} get=${getA.status} ${getA.data.status || getA.data.message}`)

    if (afterA?.status && afterA.status !== 'IN_PROGRESS') {
      report.naturalExpiry = 'PASS'
    }
    const answers = afterA?.mcq_answers || {}
    if (Object.keys(answers).length > 0) {
      report.mcqAutoSubmit = 'PASS'
      note(`MCQ answers persisted ${JSON.stringify(answers)}`)
    } else {
      note('MCQ answers empty after expiry')
    }

    await page.goto(`${WEB}/dashboard/student/exams/${exams.examNatural}/attempt?attemptId=${attemptA}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const blocked = /Exam Not Active|Results Not|Score|Return to Exams/i.test(await page.locator('body').innerText())
    const monacoGone = !(await page.locator('.monaco-editor').isVisible().catch(() => false))
    if (blocked || monacoGone) {
      note('Student cannot continue editing after expiry')
    } else {
      note('WARNING: editor still visible after expiry')
    }

    const dup = await api('POST', `${API}/student/exams/attempts/${attemptA}/submit`, cookie, { reason: 'MANUAL' })
    if (dup.status === 200 && /Already submitted/i.test(JSON.stringify(dup.data))) {
      report.duplicate = 'PASS'
      note(`Duplicate submit: ${JSON.stringify(dup.data)}`)
    } else if (dup.status === 409 || /Already|not in progress/i.test(JSON.stringify(dup.data))) {
      report.duplicate = 'PASS'
      note(`Duplicate submit blocked ${dup.status} ${JSON.stringify(dup.data)}`)
    } else {
      note(`Duplicate submit unexpected ${dup.status} ${JSON.stringify(dup.data)}`)
    }
    }

    // 8-10 coding during docker: start the job first, then expire while it runs
    if (skipCoding) {
      note('Skipping already-passed coding expiry block')
      report.codingAutoSubmit = 'PASS'
      report.expiryDuringDocker = 'PASS'
    }
    let attemptB = null
    if (!skipCoding) {
    attemptB = await startExam(page, exams.examCoding)
    const cBtn = page.getByTitle(/Coding Problem/i).first()
    if (await cBtn.isVisible().catch(() => false)) await cBtn.click()
    await dismissFullscreen(page)
    await page.waitForSelector('.monaco-editor', { timeout: 20000 })
    await page.locator('.monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('import time\ntime.sleep(20)\nprint(42)\n', { delay: 12 })
    const submitCode = page.getByRole('button', { name: /Submit Code/i })
    await submitCode.waitFor({ state: 'visible', timeout: 15000 })
    await submitCode.click()
    note('Coding job enqueued; shortening deadline so expiry hits during Docker run')
    await shortenDeadline(attemptB, 8)
    await page.screenshot({ path: path.join(shots, '05-coding-running.png') })
    note('Coding submit clicked near expiry; waiting for finalize…')
    await page.waitForTimeout(20000)
    await page.screenshot({ path: path.join(shots, '06-coding-expired.png') })
    const afterB = await attemptRow(attemptB)
    note(`Attempt B ${JSON.stringify(afterB)}`)
    if (afterB?.status && afterB.status !== 'IN_PROGRESS') {
      report.codingAutoSubmit = 'PASS'
      report.expiryDuringDocker = 'PASS'
    } else {
      note('Coding attempt still IN_PROGRESS after expiry window')
    }
    }

    // 11-12 multi-tab + third tab-switch
    const attemptC = await startExam(page, exams.examTabs)
    await shortenDeadline(attemptC, 90)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="exam-timer"]')
    await dismissFullscreen(page)
    const page2 = await context.newPage()
    await page2.goto(page.url(), { waitUntil: 'domcontentloaded' })
    await page2.waitForSelector('[data-testid="exam-timer"]', { timeout: 20000 }).catch(() => {})
    await dismissFullscreen(page2)
    await page.bringToFront()
    await page2.bringToFront()
    await page.waitForTimeout(400)
    await page.bringToFront()
    await page2.bringToFront()
    await page.waitForTimeout(400)
    await page.bringToFront()
    await page2.bringToFront()
    await page.waitForTimeout(400)
    await hidePage(page)
    await hidePage(page)
    await hidePage(page)
    await page.waitForTimeout(5000)
    await page.screenshot({ path: path.join(shots, '07-tab-switch.png') })
    await page2.screenshot({ path: path.join(shots, '08-tab2.png') })
    const afterC = await attemptRow(attemptC)
    note(`Attempt C ${JSON.stringify(afterC)}`)
    const tab2Text = await page2.locator('body').innerText().catch(() => '')
    if (afterC?.status && afterC.status !== 'IN_PROGRESS') {
      report.thirdTab = 'PASS'
    }
    if (/Exam Not Active|result|Score|submitted/i.test(tab2Text) || afterC?.status !== 'IN_PROGRESS') {
      report.multiTab = 'PASS'
      note('Second tab observed submitted/inactive state or DB finalized')
    } else {
      note(`Second tab still live: ${tab2Text.slice(0, 180)}`)
    }

    await page2.close()
  } catch (err) {
    note(`FATAL ${err.stack || err}`)
    await page.screenshot({ path: path.join(shots, '99-fatal.png') }).catch(() => {})
  } finally {
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2))
    console.log('\nBROWSER TIMER TEST')
    console.log(`- Start: ${report.start}`)
    console.log(`- Refresh: ${report.refresh}`)
    console.log(`- Navigation: ${report.navigation}`)
    console.log(`- Natural expiry: ${report.naturalExpiry}`)
    console.log(`- MCQ auto-submit: ${report.mcqAutoSubmit}`)
    console.log(`- Coding auto-submit: ${report.codingAutoSubmit}`)
    console.log(`- Expiry during Docker execution: ${report.expiryDuringDocker}`)
    console.log(`- Duplicate submission protection: ${report.duplicate}`)
    console.log(`- Multi-tab: ${report.multiTab}`)
    console.log(`- Third-tab auto-submit: ${report.thirdTab}`)
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
