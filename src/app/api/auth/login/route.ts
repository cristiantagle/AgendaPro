import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateUser,
  buildCookieConfig,
  signSession,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const payload = await request.json();

  const { email, password } = loginSchema.parse(payload);

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 },
    );
  }

  const token = signSession({
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
  });

  response.cookies.set(buildCookieConfig(token));

  return response;
}
