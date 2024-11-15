import prisma from "../db/client";

interface AuthUserInfo {
  email: string;
  fullName: string;
  givenName: string;
  familyName: string;
  authId: string;
  pictureUrl: string;
}

interface GoogleUserInfo {
  email: string;
  family_name: string;
  given_name: string;
  id: string;
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
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get user info. ${response.status} "${response.statusText}": ${await response.text()}`
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
  };
}

export async function verifyToken(
  token: string,
  provider: string
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
  provider: string
) {
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
      },
    });
  }

  return user;
}
