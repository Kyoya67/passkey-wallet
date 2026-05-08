import type { QueryResultRow } from 'pg'
import { pool } from '../db.js'

export type CredentialRecord = {
  credentialId: string
  publicKey: string
  aaguid: string
  deviceType: string
  synced: boolean
  registeredAt: Date
  lastUsedAt: Date | null
  userId: string
}

type CredentialRow = QueryResultRow & CredentialRecord

export const credentialRepository = {
  async create(input: CredentialRecord): Promise<void> {
    await pool.query<CredentialRow>(
      `
        INSERT INTO credentials (
          credential_id,
          public_key,
          aaguid,
          device_type,
          synced,
          registered_at,
          last_used_at,
          user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          credential_id AS "credentialId",
          public_key AS "publicKey",
          aaguid,
          device_type AS "deviceType",
          synced,
          registered_at AS "registeredAt",
          last_used_at AS "lastUsedAt",
          user_id AS "userId"
      `,
      [
        input.credentialId,
        input.publicKey,
        input.aaguid,
        input.deviceType,
        input.synced,
        input.registeredAt,
        input.lastUsedAt,
        input.userId,
      ]
    )
  },
}
