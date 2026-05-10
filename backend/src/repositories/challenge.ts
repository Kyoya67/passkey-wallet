import { createClient, type RedisClientType } from 'redis'

export type ChallengePurpose = 'registration' | 'authentication'

export type RegistrationChallengeRecord = {
  sessionId: string
  challenge: string
  userId: string
  userName: string
  createdAt?: Date
}

export type AuthenticationChallengeRecord = {
  sessionId: string
  challenge: string
  createdAt?: Date
}

export type ChallengeRecord =
  | RegistrationChallengeRecord
  | AuthenticationChallengeRecord

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
  async upsertRegistration(
    { sessionId, userId, userName, challenge }: Omit<RegistrationChallengeRecord, 'createdAt'>
  ): Promise<RegistrationChallengeRecord | null> {
    const record: RegistrationChallengeRecord = {
      sessionId,
      userId,
      userName,
      challenge,
      createdAt: new Date(),
    }

    const key = getKey(sessionId, 'registration')

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

  async upsertAuthentication(
    { sessionId, challenge }: Omit<AuthenticationChallengeRecord, 'createdAt'>
  ): Promise<AuthenticationChallengeRecord | null> {
    const record: AuthenticationChallengeRecord = {
      sessionId,
      challenge,
      createdAt: new Date(),
    }

    const key = getKey(sessionId, 'authentication')

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

  async findRegistrationBySessionId(
    sessionId: string
  ): Promise<RegistrationChallengeRecord | null> {
    const key = getKey(sessionId, 'registration')

    if (!isRedisEnabled()) {
      return (await getFromMemory(key)) as RegistrationChallengeRecord | null
    }

    const client = getRedisClient()
    const value = await client.get(key)
    if (!value) return null
    return JSON.parse(value) as RegistrationChallengeRecord
  },

  async findAuthenticationBySessionId(
    sessionId: string
  ): Promise<AuthenticationChallengeRecord | null> {
    const key = getKey(sessionId, 'authentication')

    if (!isRedisEnabled()) {
      return (await getFromMemory(key)) as AuthenticationChallengeRecord | null
    }

    const client = getRedisClient()
    const value = await client.get(key)
    if (!value) return null
    return JSON.parse(value) as AuthenticationChallengeRecord
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
