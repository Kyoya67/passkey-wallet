import { redis } from '../lib/redis.js'

export type ChallengePurpose = 'registration' | 'authentication'

export type ChallengeRecord = {
  sessionId: string
  challenge: string
  purpose: ChallengePurpose
  createdAt: Date
}

const TTL_SECONDS = 300

function keyOf(sessionId: string, purpose: ChallengePurpose) {
  return `webauthn:challenge:${purpose}:${sessionId}`
}

export const challengeRepository = {
  async upsert(input: {
    sessionId: string
    challenge: string
    purpose: ChallengePurpose
  }) : Promise<ChallengeRecord | null> {
    const record: ChallengeRecord = {
      sessionId: input.sessionId,
      challenge: input.challenge,
      purpose: input.purpose,
      createdAt: new Date(),
    }

    await redis.set(
      keyOf(input.sessionId, input.purpose),
      JSON.stringify(record),
      { EX: TTL_SECONDS }
    )
    return record
  },

  async findBySessionId(
    sessionId: string, 
    purpose: ChallengePurpose
  ) : Promise<ChallengeRecord | null> {
    const value = await redis.get(keyOf(sessionId, purpose))
    if (!value) return null
    return JSON.parse(value) as ChallengeRecord
  },

  async deleteBySessionId(sessionId: string, purpose: ChallengePurpose) {
    await redis.del(keyOf(sessionId, purpose))
  },
}
