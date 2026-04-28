import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

export type RegistrationOptionsInput = {
    rpName: string,
    rpID: string,
    userName: string,
    excludeCredentials?:[],
}

export const webAuthnService = {
    async createRegistrationOptions(input: RegistrationOptionsInput) {
        return generateRegistrationOptions({
            rpName: input.rpName,
            rpID: input.rpID,
            userName: input.userName,
            timeout: 300000,
            excludeCredentials: input.excludeCredentials ?? [],
        })
    },
}

