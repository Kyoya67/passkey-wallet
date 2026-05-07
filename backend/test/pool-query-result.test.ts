import 'dotenv/config'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { pool } from '../src/db.js'

test('pool.query result shape', async () => {
  const result = await pool.query<{ filename: string }>(
  `
  SELECT * FROM (
    VALUES
      ($1::text),
      ($2::text)
  ) AS t(filename)
  `,
  ['0001_create_user.sql', '0002_create_credential.sql']
)

console.log(result)

assert.equal(result.rowCount, 2)
assert.equal(result.rows[0].filename, '0001_create_user.sql')
assert.equal(result.rows[1].filename, '0002_create_credential.sql')
})
