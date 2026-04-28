import { Hono } from 'hono'
import { sessionMiddleware } from './middleware/session.js'
import { pool } from './db.js'
import { webauthnRouter } from './routes/webauthn.js'
import type { Env } from './types/env.js'

export const app = new Hono<Env>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health/db', async (c) => {
  const result = await pool.query('SELECT 1 AS ok')
  return c.json({ ok: result.rows[0].ok === 1 })
})

app.use('/webauthn/*', sessionMiddleware)
app.route('/webauthn', webauthnRouter)
