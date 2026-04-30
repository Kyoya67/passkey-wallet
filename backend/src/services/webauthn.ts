import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

import { challengeRepository } from '../repositories/challenge.js'

export type RegistrationOptionsInput = {
    rpName: string,
    rpID: string,
    userName: string,
    excludeCredentials:[],
}

export const webAuthnService = {
    async createRegistrationOptions(sessionId: string, input: RegistrationOptionsInput) {
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
}

