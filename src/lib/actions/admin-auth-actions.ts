"use server";

import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from "@/lib/admin-session";

export async function loginAdmin(
  pin: string,
): Promise<{ success: true } | { error: string }> {
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin) {
    return { error: "Admin PIN is not configured on the server." };
  }

  if (!pin || !timingSafeEqual(pin, expectedPin)) {
    return { error: "Incorrect PIN." };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
