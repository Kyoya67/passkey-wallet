import { Hono } from 'hono'

export const webauthnRouter = new Hono()

webauthnRouter.get('/registerRequest', (c) => {
  return c.json({ message: 'register request' })
})

webauthnRouter.post('/registerResponse', async (c) => {
  return c.json({ message: 'register response' })
})

webauthnRouter.get('/loginRequest', (c) => {
  return c.json({ message: 'login request' })
})

webauthnRouter.post('/loginResponse', async (c) => {
  return c.json({ message: 'login response' })
})
