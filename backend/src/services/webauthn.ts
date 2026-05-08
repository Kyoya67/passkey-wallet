import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import type { CredentialDeviceType } from '@simplewebauthn/server'
import type { WebAuthnCredential } from '@simplewebauthn/server'

import { isoBase64URL } from '@simplewebauthn/server/helpers'

import { challengeRepository } from '../repositories/challenge.js'
import { credentialRepository } from '../repositories/credential.js'
import { usersRepository } from '../repositories/users.js'

const expectedOrigin = 'http://localhost:5173'
const expectedRPID = 'localhost'

export type RegistrationOptionsInput = {
    rpName: string,
    rpID: string,
    userName: string,
    excludeCredentials:[],
}

type VerifyRegistrationInput = {
  sessionId: string
  registrationResponse: RegistrationResponseJSON
}

export const webAuthnService = {
    async generateRegistrationOptions(sessionId: string, input: RegistrationOptionsInput) {
        const options = await generateRegistrationOptions({
            rpName: input.rpName,
            rpID: input.rpID,
            userName: input.userName,
            timeout: 300000,
            excludeCredentials: input.excludeCredentials ?? [],
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'required',
                authenticatorAttachment: 'platform',
            },
            preferredAuthenticatorType: 'localDevice'
        })

        await challengeRepository.upsert({
            sessionId,
            userId: options.user.id,
            userName: input.userName,
            challenge: options.challenge,
            purpose: 'registration',
        })

        return options;
    },

    async verifyRegistrationResponse({ sessionId, registrationResponse }: VerifyRegistrationInput) {
        const record = await challengeRepository.findBySessionId(sessionId, 'registration');

        if (!record) {
            throw new Error('challenge not found')
        }

        const { challenge: expectedChallenge, userId, userName } = record;

        const verification = await verifyRegistrationResponse({
            response: registrationResponse,
            expectedChallenge,
            expectedOrigin,
            expectedRPID,
            requireUserPresence: true,
            requireUserVerification: true,
        })

        if (!verification.verified || !verification.registrationInfo) {
            throw new Error('User verification failed.')
        }

        const { 
            credential, 
            userVerified,
            aaguid, 
            credentialDeviceType 
        }: {
            credential: WebAuthnCredential
            userVerified: boolean
            aaguid: string
            credentialDeviceType: CredentialDeviceType
        } = verification.registrationInfo

        const base64PublicKey =
            isoBase64URL.fromBuffer(credential.publicKey)

        const synced = (credentialDeviceType === 'multiDevice');

        if (!userVerified) {
            throw new Error('User verification failed.')
        }

        try {
            await usersRepository.create({
                userId,
                userName,
            })

            await credentialRepository.create({
                credentialId: credential.id,
                publicKey: base64PublicKey,
                aaguid,
                deviceType: credentialDeviceType,
                synced,
                registeredAt: new Date(),
                lastUsedAt: null,
                userId,
            })

            await challengeRepository.deleteBySessionId(sessionId, 'registration')
        } catch (error) {
            throw new Error(
            error instanceof Error ? `registration save failed: ${error.message}` : 'registration save failed'
            )
        }
    }
}
