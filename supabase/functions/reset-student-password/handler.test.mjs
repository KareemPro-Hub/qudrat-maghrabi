import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('./handler.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { createResetHandler } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const callerId = '11111111-1111-4111-8111-111111111111'
const studentId = '22222222-2222-4222-8222-222222222222'
const password = 'Synthetic-test-password-42'
function fixture(options = {}) {
  const calls = []
  const existing = { id: studentId, profile: { role: 'student', is_active: true }, enrollments: ['course-1'], subscriptions: ['subscription-1'], progress: ['lesson-1'], password: 'old' }
  const dependencies = {
    async getUser(token) { calls.push(['auth', token]); return options.invalidSession ? null : { id: callerId } },
    async getProfile(id) {
      calls.push(['profile', id])
      if (options.lookupThrows) throw new Error(password)
      if (id === callerId) return { role: options.role ?? 'admin', is_active: options.active ?? true }
      return options.missingStudent ? null : { role: options.targetRole ?? 'student', is_active: true }
    },
    async updatePassword(id, value) {
      calls.push(['update', id])
      if (options.updateThrows) throw new Error(password)
      if (options.updateFails) return { success: false, weakPassword: options.weakPassword }
      existing.password = value
      return { success: true }
    },
  }
  return { handler: createResetHandler(() => dependencies), calls, existing }
}
function request(body = { student_id: studentId, password }, overrides = {}) {
  return new Request('https://example.test/reset-student-password', { method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...overrides })
}
async function expectRejected(options, body, status) {
  const f = fixture(options)
  const response = await f.handler(request(body))
  assert.equal(response.status, status)
  assert.equal(f.calls.some(call => call[0] === 'update'), Boolean(options.updateFails))
  assert.equal(f.existing.password, 'old')
  assert.equal((await response.text()).includes(password), false)
}
test('preflight and unsupported methods never authenticate or mutate', async () => {
  const f = fixture()
  assert.equal((await f.handler(new Request('https://example.test', { method: 'OPTIONS' }))).status, 200)
  assert.equal((await f.handler(new Request('https://example.test'))).status, 405)
  assert.deepEqual(f.calls, [])
})
test('missing authorization does not access privileged dependencies', async () => {
  const f = fixture()
  assert.equal((await f.handler(request(undefined, { headers: {} }))).status, 401)
  assert.deepEqual(f.calls, [])
})
test('invalid session denied', () => expectRejected({ invalidSession: true }, undefined, 401))
for (const role of ['student', 'parent', 'teacher', 'content_manager', 'quiz_manager']) {
  test(`${role} cannot reset a student password`, () => expectRejected({ role }, undefined, 403))
}
test('inactive admin denied', () => expectRejected({ active: false }, undefined, 403))
test('malformed JSON rejected', async () => {
  const f = fixture()
  assert.equal((await f.handler(request(undefined, { body: '{' }))).status, 400)
  assert.equal(f.calls.some(call => call[0] === 'update'), false)
})
test('invalid ID and invalid password types/lengths denied', async () => {
  for (const body of [null, {}, { student_id: 'bad', password }, { student_id: studentId, password: 12345678 }, { student_id: studentId, password: 'short' }, { student_id: studentId, password: 'x'.repeat(129) }]) await expectRejected({}, body, 400)
})
test('self reset denied', () => expectRejected({}, { student_id: callerId, password }, 403))
test('missing student denied', () => expectRejected({ missingStudent: true }, undefined, 404))
test('cannot reset administrator or other staff targets', async () => {
  for (const targetRole of ['admin', 'student_manager', 'teacher', 'parent']) await expectRejected({ targetRole }, undefined, 403)
})
test('upstream refusal is not reported as success', () => expectRejected({ updateFails: true }, undefined, 502))
test('weak passwords return actionable safe error', () => expectRejected({ updateFails: true, weakPassword: true }, undefined, 400))
test('upstream errors do not reveal credentials', async () => {
  await expectRejected({ lookupThrows: true }, undefined, 500)
  const f = fixture({ updateThrows: true })
  const response = await f.handler(request())
  assert.equal(response.status, 500)
  assert.equal((await response.text()).includes(password), false)
})
for (const role of ['admin', 'student_manager']) {
  test(`${role} changes only the same student's password and preserves related data`, async () => {
    const f = fixture({ role })
    const before = structuredClone(f.existing)
    const response = await f.handler(request({ student_id: studentId, password, email: 'ignored@example.test', role: 'admin', is_active: false }))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { success: true, student_id: studentId })
    assert.deepEqual(f.existing, { ...before, password })
    assert.deepEqual(f.calls.filter(call => call[0] === 'update'), [['update', studentId]])
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  })
}
