import type { QueryResultRow } from 'pg'
import { pool } from '../db.js'

export type UserRecord = {
    userId: string
    userName: string
}

type UserRow = QueryResultRow & UserRecord

export const usersRepository = {
    async create(input: UserRecord) {
        const result = await pool.query<UserRow>(
            `
                INSERT INTO users (
                    user_id,
                    user_name
                )
                VALUES ($1, $2)
                RETURNING
                    user_id AS "userId",
                    user_name AS "userName",
                    created_at AS "createdAt"
            `,
            [input.userId, input.userName]
        )

        if (!result.rows[0]) {
            throw new Error('failed to insert user')
        }
    },

    async findById(userId: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRow>(
      `
        SELECT
          user_id AS "userId",
          user_name AS "userName",
          created_at AS "createdAt"
        FROM users
        WHERE user_id = $1
      `,
      [userId]
    )

    return result.rows[0] ?? null
  },

  async findByUserName(userName: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRow>(
      `
        SELECT
          user_id AS "userId",
          user_name AS "userName",
          created_at AS "createdAt"
        FROM users
        WHERE user_name = $1
      `,
      [userName]
    )

    return result.rows[0] ?? null
  },
}