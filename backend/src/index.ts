import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { pool } from './db.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health/db', async (c) => {
  const result = await pool.query('SELECT 1 AS ok')
  return c.json({ ok: result.rows[0].ok === 1})
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
