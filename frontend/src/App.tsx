import { useState } from 'react'
import './App.css'

type RegistrationOptions = {
  challenge: string
  rp: { name: string; id: string }
  user: {
    id: string
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{ alg: number; type: 'public-key' }>
  timeout?: number
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise'
  excludeCredentials?: Array<{ id: string; type: 'public-key' }>
}

type RegistrationResponse = {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    attestationObject: string
  }
}

type AuthenticationOptions = {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: Array<{ id: string; type: 'public-key' }>
  userVerification?: 'required' | 'preferred' | 'discouraged'
}

type AuthenticationResponse = {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle?: string | null
  }
}

function App() {
  const [userName, setUserName] = useState('alice')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  )
  const [message, setMessage] = useState('')

  const registerPasskey = async () => {
    setStatus('loading')
    setMessage('')

    try {
      const request = await fetch(
        `/webauthn/registerRequest?userName=${encodeURIComponent(userName)}`,
        {
          credentials: 'include',
        }
      )

      if (!request.ok) {
        throw new Error('registerRequest failed')
      }

      const options = (await request.json()) as RegistrationOptions
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: base64UrlToBuffer(options.challenge),
          user: {
            ...options.user,
            id: base64UrlToBuffer(options.user.id),
          },
          excludeCredentials: (options.excludeCredentials ?? []).map((cred) => ({
            ...cred,
            id: base64UrlToBuffer(cred.id),
            type: 'public-key' as const,
          })),
        },
      })

      if (!credential) {
        throw new Error('credential not created')
      }

      const response = credential as PublicKeyCredential
      const attestation = response.response as AuthenticatorAttestationResponse

      const payload: RegistrationResponse = {
        id: response.id,
        rawId: bufferToBase64Url(new Uint8Array(response.rawId)),
        type: response.type,
        response: {
          clientDataJSON: bufferToBase64Url(new Uint8Array(attestation.clientDataJSON)),
          attestationObject: bufferToBase64Url(
            new Uint8Array(attestation.attestationObject)
          ),
        },
      }

      const verify = await fetch('/webauthn/registerResponse', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!verify.ok) {
        throw new Error('registerResponse failed')
      }

      setStatus('success')
      setMessage(`registered as ${userName}`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'unknown error')
    }
  }

  const loginPasskey = async () => {
    setStatus('loading')
    setMessage('')

    try {
      const request = await fetch(
        `/webauthn/authenticateRequest?userName=${encodeURIComponent(userName)}`,
        {
          credentials: 'include',
        }
      )

      if (!request.ok) {
        throw new Error('authenticateRequest failed')
      }

      const options = (await request.json()) as AuthenticationOptions
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: base64UrlToBuffer(options.challenge),
          allowCredentials: (options.allowCredentials ?? []).map((cred) => ({
            ...cred,
            id: base64UrlToBuffer(cred.id),
            type: 'public-key' as const,
          })),
        },
      })

      if (!credential) {
        throw new Error('credential not created')
      }

      const response = credential as PublicKeyCredential
      const assertion = response.response as AuthenticatorAssertionResponse

      const payload: AuthenticationResponse = {
        id: response.id,
        rawId: bufferToBase64Url(new Uint8Array(response.rawId)),
        type: response.type,
        response: {
          clientDataJSON: bufferToBase64Url(new Uint8Array(assertion.clientDataJSON)),
          authenticatorData: bufferToBase64Url(
            new Uint8Array(assertion.authenticatorData)
          ),
          signature: bufferToBase64Url(new Uint8Array(assertion.signature)),
          userHandle: assertion.userHandle
            ? bufferToBase64Url(new Uint8Array(assertion.userHandle))
            : null,
        },
      }

      const verify = await fetch('/webauthn/authenticateResponse', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!verify.ok) {
        throw new Error('authenticateResponse failed')
      }

      setStatus('success')
      setMessage(`logged in as ${userName}`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'unknown error')
    }
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Passkey Wallet</p>
        <h1>Register a passkey</h1>
        <p className="description">
          User name is up to you. This value will be sent to the backend when
          registration starts.
        </p>

        <label className="field">
          <span>User name</span>
          <input
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="alice"
            autoComplete="username"
          />
        </label>

        <div className="buttonGroup">
          <button
            type="button"
            className="primary"
            onClick={registerPasskey}
            disabled={status === 'loading' || userName.trim() === ''}
          >
            {status === 'loading' ? 'Registering...' : 'Register passkey'}
          </button>

          <button
            type="button"
            className="primary secondary"
            onClick={loginPasskey}
            disabled={status === 'loading' || userName.trim() === ''}
          >
            {status === 'loading' ? 'Signing in...' : 'Login with passkey'}
          </button>
        </div>

        <p className={`status status-${status}`}>Status: {status}</p>
        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  )
}

function base64UrlToBuffer(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function bufferToBase64Url(value: Uint8Array) {
  let binary = ''

  for (const byte of value) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export default App
