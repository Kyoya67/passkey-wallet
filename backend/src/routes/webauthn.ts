import { Hono } from 'hono'
import type { Env } from '../types/env.js'
import { webAuthnService } from '../services/webauthn.js'

export const webauthnRouter = new Hono<Env>()

const rpName = 'passkey-wallet'
const rpID = 'localhost'

webauthnRouter.get('/registerRequest', async (c) => {
  const sessionId = c.get('sessionId')
  if (!sessionId) {
    return c.json({ error: 'Session not found' }, 400)
  }

  const userName = c.req.query('userName') ?? 'guest'

  const options = await webAuthnService.createRegistrationOptions(sessionId, {
    rpName,
    rpID,
    userName,
    excludeCredentials: [],
  })

  return c.json(options)
})

webauthnRouter.post('/registerResponse', async (c) => {
  return c.json({ message: 'not implemented yet' }, 501)
})
