import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const API = 'http://localhost:3003'
const WEB = 'http://localhost:3002'
const ORIGIN = { Origin: WEB, Referer: `${WEB}/` }
const ADMIN = { email: 'superadmin@eduverse.com', password: 'SuperAdmin@123' }
const STUDENT = { email: 'student@eduverse.com', password: 'Student@123' }

const out = {}
const stamp = Date.now()

function cookieJar(setCookie) {
  if (!setCookie) return ''
  const list = Array.isArray(setCookie) ? setCookie : [setCookie]
  return list.map((c) => c.split(';')[0]).join('; ')
}

async function req(method, url, { body, cookie, extra = {} } = {}) {
  const headers = {
    ...ORIGIN,
    ...extra,
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (cookie) headers.Cookie = cookie
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { ok: res.ok, status: res.status, data, cookie: cookieJar(res.headers.getSetCookie?.() || res.headers.get('set-cookie')) }
}

async function login(creds) {
  const r = await req('POST', `${API}/auth/login`, { body: creds })
  if (!r.ok) throw new Error(`Login failed ${creds.email}: ${r.status} ${JSON.stringify(r.data)}`)
  return { cookie: r.cookie, user: r.data.user }
}

async function main() {
  const admin = await login(ADMIN)
  const student = await login(STUDENT)
  console.log('logged in', admin.user.email, student.user.email, 'studentId', student.user.id || student.user.sub)

  const users = await req('GET', `${API}/superadmin/users`, { cookie: admin.cookie })
  const studentUser = (users.data || []).find((u) => u.email === STUDENT.email)
  if (!studentUser) throw new Error('Student user not found')
  const studentId = studentUser.id
  console.log('student id', studentId)

  let mcqs = (await req('GET', `${API}/question-bank?type=MCQ&limit=5`, { cookie: admin.cookie })).data || []
  let pqs = (await req('GET', `${API}/question-bank?type=PQ&limit=5`, { cookie: admin.cookie })).data || []
  if (!Array.isArray(mcqs)) mcqs = mcqs.items || mcqs.data || []
  if (!Array.isArray(pqs)) pqs = pqs.items || pqs.data || []

  if (!mcqs.length) {
    const created = await req('POST', `${API}/question-bank`, {
      cookie: admin.cookie,
      body: {
        type: 'MCQ',
        topicNames: 'Browser Timer',
        difficulty: 'EASY',
        questionText: `Timer verify MCQ ${stamp}`,
        options: ['Paris', 'London', 'Rome', 'Madrid'],
        correctAnswer: 'A',
        status: 'APPROVED',
      },
    })
    if (!created.ok) throw new Error(`Create MCQ failed ${JSON.stringify(created.data)}`)
    mcqs = [created.data]
  }
  if (!pqs.length) {
    const created = await req('POST', `${API}/question-bank`, {
      cookie: admin.cookie,
      body: {
        type: 'PQ',
        topicNames: 'Browser Timer',
        difficulty: 'EASY',
        questionText: `Double the number ${stamp}`,
        problemStatement: 'Read an integer n and print n*2.',
        inputFormat: 'A single integer n',
        outputFormat: 'n multiplied by 2',
        constraints: '1 <= n <= 100',
        allowedLanguages: ['Python', 'C++', 'Java', 'C', 'JavaScript'],
        testCases: [
          { input: '21', output: '42', explanation: '21*2', isHidden: false },
          { input: '3', output: '6', isHidden: true },
        ],
        codeSnippet: JSON.stringify({
          Python: 'n = int(input())\nprint(n * 2)\n',
        }),
        status: 'APPROVED',
      },
    })
    if (!created.ok) throw new Error(`Create PQ failed ${JSON.stringify(created.data)}`)
    pqs = [created.data]
  }

  const mcqId = mcqs[0].id
  const pqId = pqs[0].id
  console.log('questions', { mcqId, pqId })

  async function makeExam(title) {
    const created = await req('POST', `${API}/exams`, {
      cookie: admin.cookie,
      body: {
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
        showExplanations: true,
        negativeMarking: false,
      },
    })
    if (!created.ok) throw new Error(`Create exam failed ${JSON.stringify(created.data)}`)
    const id = created.data.id
    const addA = await req('POST', `${API}/exams/${id}/questions/mcq`, {
      cookie: admin.cookie,
      body: { questions: [{ questionId: mcqId, marks: 1, negativeMarks: 0 }] },
    })
    const addB = await req('POST', `${API}/exams/${id}/questions/coding`, {
      cookie: admin.cookie,
      body: { questions: [{ questionId: pqId, marks: 2, negativeMarks: 0 }] },
    })
    if (!addA.ok || !addB.ok) throw new Error(`Add questions failed ${JSON.stringify(addA.data)} ${JSON.stringify(addB.data)}`)
    const assign = await req('POST', `${API}/exams/${id}/assign`, {
      cookie: admin.cookie,
      body: { studentIds: [studentId] },
    })
    if (!assign.ok) throw new Error(`Assign failed ${JSON.stringify(assign.data)}`)
    const pub = await req('POST', `${API}/exams/${id}/publish`, { cookie: admin.cookie })
    if (!pub.ok) throw new Error(`Publish failed ${JSON.stringify(pub.data)}`)
    return id
  }

  const examNatural = await makeExam(`TIMER-NATURAL-${stamp}`)
  const examCoding = await makeExam(`TIMER-CODING-${stamp}`)
  const examTabs = await makeExam(`TIMER-TABS-${stamp}`)

  const fixture = {
    examNatural, examCoding, examTabs, studentId, mcqId, pqId, stamp,
    studentEmail: STUDENT.email,
    studentPassword: STUDENT.password,
  }
  const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixture.json')
  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2))
  console.log('FIXTURE', fixture)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
