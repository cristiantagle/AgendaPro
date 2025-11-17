import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role, User } from "@prisma/client";

import { prisma } from "./prisma";

const SESSION_COOKIE = "asistencia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = {
  userId: string;
  role: Role;
  companyId?: string | null;
};

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.warn("JWT_SECRET is not defined. Sessions will not work correctly.");
}

export const buildCookieConfig = (token: string) => ({
  name: SESSION_COOKIE,
  value: token,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_TTL_SECONDS,
});

export function signSession(payload: SessionPayload) {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET env variable missing");
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: SESSION_TTL_SECONDS,
  });
}

export function decodeSession(token?: string | null): SessionPayload | null {
  if (!token || !jwtSecret) {
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(
  request?: NextRequest,
): Promise<SessionPayload | null> {
  if (request) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    return decodeSession(token);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decodeSession(token);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}

export function assertRole(
  session: SessionPayload | null,
  allowedRoles: Role[],
): asserts session is SessionPayload {
  if (!session || !allowedRoles.includes(session.role)) {
    const error = new Error("No autorizado");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

export function requireSession(session: SessionPayload | null) {
  if (!session) {
    const error = new Error("Sesión inválida");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return session;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
}
