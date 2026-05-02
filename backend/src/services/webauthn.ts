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

const expectedOrigin = 'https://localhost:3000'
const expectedRPID = 'localhost'

export type RegistrationOptionsInput = {
    rpName: string,
    rpID: string,
    userName: string,
    excludeCredentials:[],
}

type VerifyRegistrationInput = {
  registrationResponse: RegistrationResponseJSON
  expectedChallenge: string
}

export const webAuthnService = {
    async generateRegistrationOptions(sessionId: string, input: RegistrationOptionsInput) {
        const options = await generateRegistrationOptions({
            rpName: input.rpName,
            rpID: input.rpID,
            userName: input.userName,
            timeout: 300000,
            excludeCredentials: input.excludeCredentials ?? [],
        })

        await challengeRepository.upsert({
            sessionId,
            challenge: options.challenge,
            purpose: 'registration',
        })

        return options;
    },

    async verifyRegistrationResponse({ registrationResponse, expectedChallenge }: VerifyRegistrationInput) {
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

        const base64Publickey =
            isoBase64URL.fromBuffer(credential.publicKey)

        const synced = (credentialDeviceType === 'multiDevice');

        const { user } = 
        return {
            credentialId: credential.id,
            
        }
    }
}

