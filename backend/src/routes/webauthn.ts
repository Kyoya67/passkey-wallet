import { Hono } from 'hono'
import type { Env } from '../types/env.js'
import { webAuthnService } from '../services/webauthn.js'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

export const webauthnRouter = new Hono<Env>()

const rpName = 'passkey-wallet'
const rpID = 'localhost'

webauthnRouter.get('/registerRequest', async (c) => {
  const sessionId = c.get('sessionId')
  if (!sessionId) {
    return c.json({ error: 'Session not found' }, 400)
  }

  const userName = c.req.query('userName') ?? 'guest'

  const options = await webAuthnService.generateRegistrationOptions(sessionId, {
    rpName,
    rpID,
    userName,
    excludeCredentials: [],
  })

  return c.json(options)
})

webauthnRouter.post('/registerResponse', async (c) => {
  const sessionId = c.get('sessionId')
  if (!sessionId) {
    return c.json({ error: 'Session not found' }, 400)
  }
  const registrationResponse = await c.req.json<RegistrationResponseJSON>();

  const result = await webAuthnService.verifyRegistrationResponse({
    sessionId,
    registrationResponse,
  })

  return c.json({ status: 'success', result })
})
