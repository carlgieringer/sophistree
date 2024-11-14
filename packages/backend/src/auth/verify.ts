import { OAuth2Client } from 'google-auth-library';
import prisma from '../db/client';

const googleClient = new OAuth2Client();

interface VerifiedToken {
  sub: string;
  email: string;
  name?: string;
}

async function verifyGoogleToken(token: string): Promise<VerifiedToken> {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid token payload');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

export async function verifyToken(token: string, provider: string): Promise<VerifiedToken> {
  switch (provider) {
    case 'google':
      return verifyGoogleToken(token);
    default:
      throw new Error(`Unsupported auth provider: ${provider}`);
  }
}

export async function getOrCreateUser(tokenInfo: VerifiedToken, provider: string) {
  let user = await prisma.user.findFirst({
    where: {
      authExternalId: tokenInfo.sub,
      authProvider: provider,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        authExternalId: tokenInfo.sub,
        authProvider: provider,
        email: tokenInfo.email,
        name: tokenInfo.name,
      },
    });
  }

  return user;
}
