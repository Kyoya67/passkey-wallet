import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import type { CredentialRecord } from '../repositories/credential.js'

import { isoBase64URL } from '@simplewebauthn/server/helpers'

import { challengeRepository } from '../repositories/challenge.js'
import { credentialRepository } from '../repositories/credential.js' 
import { usersRepository } from '../repositories/users.js'

const expectedOrigin = 'http://localhost:5173'
const expectedRPID = 'localhost'

type RegistrationOptionsInput = {
    rpName: string,
    rpID: string,
    userName: string,
    excludeCredentials:[],
}

type SignInOptionsInput = {
  rpID: string
  allowCredentials: Array<{ id: string }>
  timeout: number
}


export const webAuthnService = {
    async generateRegistrationOptions( sessionId: string, { rpName, rpID, userName, excludeCredentials }: RegistrationOptionsInput ) {
        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userName,
            timeout: 300000,
            excludeCredentials: excludeCredentials ?? [],
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'required',
                authenticatorAttachment: 'platform',
            },
            preferredAuthenticatorType: 'localDevice',
        })

        await challengeRepository.upsertRegistration({
            sessionId,
            userId: options.user.id,
            userName,
            challenge: options.challenge,
        })

        return options;
    },

    async verifyRegistrationResponse( sessionId: string, registrationResponse: RegistrationResponseJSON ) {
        const record = await challengeRepository.findRegistrationBySessionId(sessionId);

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
                userId,
                publicKey: base64PublicKey,
                aaguid,
                deviceType: credentialDeviceType,
                synced,
                registeredAt: new Date(),
                lastUsedAt: null,
            })

        } catch (error) {
            throw new Error(
                error instanceof Error ? `registration save failed: ${error.message}` : 'registration save failed'
            )
        } finally {
            await challengeRepository.deleteBySessionId(sessionId, 'registration')
        }
    },

    async generateAuthenticationOptions( sessionId: string, { rpID, allowCredentials, timeout }: SignInOptionsInput) {
        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials,
            timeout,
        })

        await challengeRepository.upsertAuthentication({
            sessionId,
            challenge: options.challenge,
        })
        
        return options;
    },

    async verifyAuthenticationResponse( sessionId: string, authenticationResponse: AuthenticationResponseJSON ) {
        const record = await challengeRepository.findAuthenticationBySessionId(sessionId);

        if (!record) {
            throw new Error('challenge not found')
        }

        const { challenge: expectedChallenge } = record;

        try {
            const credentialFromDB: CredentialRecord | null=
                await credentialRepository.findByCredentialId(authenticationResponse.id)
            if (!credentialFromDB) {
                throw new Error(
                    'Matching credential not found on the server.'
                )
            }

            const verification = await verifyAuthenticationResponse({
                response: authenticationResponse,
                expectedChallenge,
                expectedOrigin,
                expectedRPID,
                credential: {
                    id: credentialFromDB.credentialId,
                    publicKey: isoBase64URL.toBuffer(credentialFromDB.publicKey),
                    counter: credentialFromDB.counter,
                },
                requireUserVerification: true
            })

            const { verified, authenticationInfo } = verification

            if (!verified || !authenticationInfo) {
                throw new Error('User verification failed.')
            }

            const { userVerified, newCounter } = authenticationInfo
            if (!userVerified) {
                throw new Error('User verification failed.')
            }

            await credentialRepository.update(credentialFromDB.credentialId, newCounter);
        } catch (error) {
            throw new Error(
                error instanceof Error ? `authentication failed: ${error.message}` : 'authentication failed'
            )
        } finally {
            await challengeRepository.deleteBySessionId(sessionId, 'authentication')
        }
    }
}
