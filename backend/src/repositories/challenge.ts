import { createClient, type RedisClientType } from 'redis'

export type ChallengePurpose = 'registration' | 'authentication'

export type ChallengeRecord = {
  sessionId: string
  userId: string
  challenge: string
  purpose: ChallengePurpose
  createdAt: Date
}

const TTL_SECONDS = 300
const KEY_PREFIX = 'webauthn:challenge:'

const memoryStore = new Map<string, { record: ChallengeRecord; expiresAt: number }>()
let redisClient: RedisClientType | null = null

function isRedisEnabled() {
  return !!process.env.REDIS_URL
}

function getKey(sessionId: string, purpose: ChallengePurpose) {
  return `${KEY_PREFIX}${purpose}:${sessionId}`
}

function getRedisClient() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not set')
  }

  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL })
    redisClient.on('error', (error) => {
      console.error('Redis Client Error', error)
    })
    void redisClient.connect()
  }

  return redisClient
}

async function getFromMemory(key: string): Promise<ChallengeRecord | null> {
  const entry = memoryStore.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }

  return entry.record
}

export const challengeRepository = {
  async upsert(input: {
    sessionId: string
    userId: string
    challenge: string
    purpose: ChallengePurpose
  }): Promise<ChallengeRecord | null> {
    const record: ChallengeRecord = {
      sessionId: input.sessionId,
      userId: input.userId,
      challenge: input.challenge,
      purpose: input.purpose,
      createdAt: new Date(),
    }

    const key = getKey(input.sessionId, input.purpose)

    if (!isRedisEnabled()) {
      memoryStore.set(key, {
        record,
        expiresAt: Date.now() + TTL_SECONDS * 1000,
      })
      return record
    }

    const client = getRedisClient()
    await client.set(key, JSON.stringify(record), { EX: TTL_SECONDS })
    return record
  },

  async findBySessionId(
    sessionId: string,
    purpose: ChallengePurpose = 'registration'
  ): Promise<ChallengeRecord | null> {
    const key = getKey(sessionId, purpose)

    if (!isRedisEnabled()) {
      return getFromMemory(key)
    }

    const client = getRedisClient()
    const value = await client.get(key)
    if (!value) return null
    return JSON.parse(value) as ChallengeRecord
  },

  async deleteBySessionId(sessionId: string, purpose: ChallengePurpose) {
    const key = getKey(sessionId, purpose)

    if (!isRedisEnabled()) {
      memoryStore.delete(key)
      return
    }

    const client = getRedisClient()
    await client.del(key)
  },

  async clearAll() {
    if (!isRedisEnabled()) {
      memoryStore.clear()
      return
    }

    const client = getRedisClient()
    const keys = await client.keys(`${KEY_PREFIX}*`)
    if (keys.length > 0) {
      await client.del(keys)
    }
  },
}
