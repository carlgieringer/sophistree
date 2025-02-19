import prismaPromise from "../db/client";
import { createPseudonym } from "./pseudonyms";

interface AuthUserInfo {
  email: string;
  fullName: string;
  givenName: string;
  familyName: string;
  authId: string;
  pictureUrl: string;
  isVerifiedEmail: boolean;
}

// I couldn't find where this was well-documented. But here are is what I found:
// https://googleapis.dev/ruby/google-api-client/latest/Google/Apis/Oauth2V2/Userinfo.html
// https://googleapis.dev/nodejs/googleapis/latest/oauth2/classes/Resource$Userinfo.html
interface GoogleUserInfo {
  email: string;
  family_name: string;
  given_name: string;
  id: string;
  hd: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

async function verifyGoogleToken(token: string): Promise<AuthUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get user info. ${response.status} "${response.statusText}": ${await response.text()}`,
    );
  }

  const userInfo = (await response.json()) as GoogleUserInfo;
  return {
    email: userInfo.email,
    fullName: userInfo.name,
    givenName: userInfo.given_name,
    familyName: userInfo.family_name,
    authId: userInfo.id,
    pictureUrl: userInfo.picture,
    isVerifiedEmail: userInfo.verified_email,
  };
}

export async function verifyToken(
  token: string,
  provider: string,
): Promise<AuthUserInfo> {
  switch (provider) {
    case "google":
      return verifyGoogleToken(token);
    default:
      throw new Error("Invalid provider");
  }
}

export async function getOrCreateUser(
  authUserInfo: AuthUserInfo,
  provider: string,
) {
  const prisma = await prismaPromise;
  let user = await prisma.user.findFirst({
    where: {
      authExternalId: authUserInfo.authId,
      authProvider: provider,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        authExternalId: authUserInfo.authId,
        authProvider: provider,
        email: authUserInfo.email,
        name: authUserInfo.fullName,
        pseudonym: "initial-pseudonym",
        pictureUrl: authUserInfo.pictureUrl,
        isVerifiedEmail: authUserInfo.isVerifiedEmail,
      },
    });
    const pseudonym = createPseudonym(user.id);
    await prisma.user.update({
      where: {
        authExternalId_authProvider: {
          authExternalId: authUserInfo.authId,
          authProvider: provider,
        },
      },
      data: {
        pseudonym,
      },
    });
  } else {
    const pseudonym = createPseudonym(user.id);
    await prisma.user.update({
      where: {
        authExternalId_authProvider: {
          authExternalId: authUserInfo.authId,
          authProvider: provider,
        },
      },
      data: {
        email: authUserInfo.email,
        name: authUserInfo.fullName,
        pseudonym,
        pictureUrl: authUserInfo.pictureUrl,
        isVerifiedEmail: authUserInfo.isVerifiedEmail,
      },
    });
  }

  return user;
}
