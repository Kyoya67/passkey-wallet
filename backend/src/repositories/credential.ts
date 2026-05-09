import type { QueryResultRow } from 'pg'
import { pool } from '../db.js'

export type CredentialRecord = {
  credentialId: string
  userId: string
  publicKey: string
  counter: number
  aaguid: string
  deviceType: string
  synced: boolean
  registeredAt: Date
  lastUsedAt: Date | null
}

type CredentialRow = QueryResultRow & CredentialRecord

export const credentialRepository = {
  async create(input: CredentialRecord): Promise<void> {
    await pool.query<CredentialRow>(
      `
        INSERT INTO credentials (
          credential_id,
          user_id,
          public_key,
          aaguid,
          device_type,
          synced,
          registered_at,
          last_used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        input.credentialId,
        input.userId,
        input.publicKey,
        input.aaguid,
        input.deviceType,
        input.synced,
        input.registeredAt,
        input.lastUsedAt,
      ]
    )
  },

  async findByCredentialId(credentialId: string): Promise<CredentialRecord | null> {
    const result = await pool.query<CredentialRecord>(
      `
        SELECT
          credential_id,
          user_id
          public_key,
          counter,
          aaguid,
          device_type,
          synced,
          registered_at,
          last_used_at,
        FROM credentials
        WHERE credential_id I= $1
      `,
      [credentialId]
    )

    return result.rows[0] ?? null
  },

  async update(credentialId: string, newCounterValue: number): Promise<void> {
    await pool.query(
      `
        UPDATE credentials
        SET counter = $2,
            last_used_at = $3
        WHERE credential_id = $1
      `,
      [credentialId, newCounterValue, new Date()]
    )
  }
}
