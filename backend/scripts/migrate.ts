import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.resolve(__dirname, '../migrations')

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function getAppliedMigrations() {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  )
  return new Set(result.rows.map((row) => row.filename))
}

async function main() {
  await ensureMigrationsTable()

  const appliedMigrations = await getAppliedMigrations()
  const filenames = (await readdir(migrationsDir))
    .filter((filename) => filename.endsWith('.sql'))
    .sort()

  for (const filename of filenames) {
    if (appliedMigrations.has(filename)) {
      continue
    }

    const filePath = path.join(migrationsDir, filename)
    const sql = await readFile(filePath, 'utf8')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename]
      )
      await client.query('COMMIT')
      console.log(`applied ${filename}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

main()
  .then(async () => {
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
