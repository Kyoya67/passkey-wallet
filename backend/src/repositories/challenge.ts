export type ChallengePurpose = 'registration' | 'authentication'

export type ChallengeRecord = {
  sessionId: string
  challenge: string
  purpose: ChallengePurpose
  createdAt: Date
}

const challenges = new Map<string, ChallengeRecord>()

export const challengeRepository = {
  async upsert(input: {
    sessionId: string
    challenge: string
    purpose: ChallengePurpose
  }) {
    const record: ChallengeRecord = {
      sessionId: input.sessionId,
      challenge: input.challenge,
      purpose: input.purpose,
      createdAt: new Date(),
    }

    challenges.set(input.sessionId, record)
    return record
  },

  async findBySessionId(sessionId: string) {
    return challenges.get(sessionId) ?? null
  },

  async clearAll() {
    challenges.clear()
  },
}
