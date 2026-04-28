import { createMiddleware } from "hono/factory"
import { getCookie, setCookie } from 'hono/cookie'
import { randomUUID } from 'node:crypto'
import type { Env } from '../types/env.js'

export const sessionMiddleware = createMiddleware<Env>(async (c, next) => {
    let sessionId = getCookie(c, 'session_id')

    if (!sessionId) {
        sessionId = randomUUID()

        setCookie(c, 'session_id', sessionId, {
            httpOnly: true,
            sameSite: 'Lax',
            path: '/',
            secure: false,
        })
    }

    c.set('sessionId', sessionId)
    await next()
})