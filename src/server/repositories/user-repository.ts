import { prisma } from "@/server/db/client";

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { identities: true },
  });
}

export async function findUserByPrimaryEmail(email: string) {
  return prisma.user.findUnique({
    where: { primaryEmail: email },
  });
}

export async function findUserByUsernameNormalized(usernameNormalized: string) {
  return prisma.user.findUnique({
    where: { usernameNormalized },
  });
}

export async function findIdentity(provider: string, providerAccountId: string) {
  return prisma.identity.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId },
    },
    include: {
      user: true,
    },
  });
}

export async function findIdentityByEmail(normalizedEmail: string) {
  return prisma.identity.findFirst({
    where: { normalizedEmail },
    include: { user: true },
  });
}

export async function createUserWithIdentity(data: {
  email?: string;
  normalizedEmail?: string;
  provider: string;
  providerAccountId: string;
}) {
  return prisma.user.create({
    data: {
      primaryEmail: data.normalizedEmail,
      onboardingCompleted: false,
      identities: {
        create: {
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          email: data.email,
          normalizedEmail: data.normalizedEmail,
          emailVerified: new Date(),
        },
      },
    },
  });
}

export async function linkIdentityToUser(
  userId: string,
  data: {
    provider: string;
    providerAccountId: string;
    email?: string;
    normalizedEmail?: string;
  }
) {
  return prisma.identity.create({
    data: {
      userId,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      email: data.email,
      normalizedEmail: data.normalizedEmail,
      emailVerified: new Date(),
    },
  });
}

export async function updateUsername(userId: string, username: string, usernameNormalized: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      username,
      usernameNormalized,
      onboardingCompleted: true,
    },
  });
}
