import { emailOTP, jwt } from 'better-auth/plugins';
import { codeLifetimeSeconds } from './email.ts';

export const authPlugins = (
  deliverCode: (email: string, code: string) => Promise<void>,
  audience: string,
) => [
  emailOTP({
    storeOTP: 'hashed',
    expiresIn: codeLifetimeSeconds,
    async sendVerificationOTP({ email, otp, type }) {
      if (type !== 'sign-in') throw new Error('Sign-in codes only.');
      await deliverCode(email, otp);
    },
  }),
  jwt({
    jwt: {
      audience,
      expirationTime: '5m',
      definePayload: () => ({}),
    },
  }),
];
