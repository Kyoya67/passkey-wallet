import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import 'dotenv/config'

import { pool } from './db.js'
import { webauthnRouter } from './routes/webauthn.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health/db', async (c) => {
  const result = await pool.query('SELECT 1 AS ok')
  return c.json({ ok: result.rows[0].ok === 1})
})

app.route('/webauthn', webauthnRouter)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
