import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { app } from '../src/app.js'
import { challengeRepository } from '../src/repositories/challenge.js'

function extractSessionId(setCookieHeader: string | null) {
  assert.ok(setCookieHeader, 'expected Set-Cookie header to be present')

  const match = setCookieHeader.match(/session_id=([^;]+)/)
  assert.ok(match, 'expected session_id cookie to be present')

  return match[1]
}

beforeEach(async () => {
  await challengeRepository.clearAll()
})

test('registerRequest sets session cookie and stores challenge', async () => {
  const response = await app.request('/webauthn/registerRequest?userName=alice')

  assert.equal(response.status, 200)

  const setCookie = response.headers.get('set-cookie')
  const sessionId = extractSessionId(setCookie)

  const body = await response.json() as {
    challenge: string
    user: { id: string; name: string; displayName: string }
  }
  assert.equal(typeof body.challenge, 'string')
  assert.equal(typeof body.user.id, 'string')
  assert.equal(body.user.name, 'alice')
  assert.equal(body.user.displayName, '')
  assert.notEqual(body.user.id, '')
  console.log('userId', body.user.id)

  const record = await challengeRepository.findBySessionId(sessionId)
  assert.ok(record)
  assert.equal(record?.sessionId, sessionId)
  assert.equal(record?.challenge, body.challenge)
  assert.equal(record?.purpose, 'registration')
})

test('registerRequest reuses existing session cookie', async () => {
  const firstResponse = await app.request('/webauthn/registerRequest')
  const sessionId = extractSessionId(firstResponse.headers.get('set-cookie'))

  const secondResponse = await app.request('/webauthn/registerRequest', {
    headers: {
      cookie: `session_id=${sessionId}`,
    },
  })

  assert.equal(secondResponse.status, 200)
  assert.equal(secondResponse.headers.get('set-cookie'), null)
})
