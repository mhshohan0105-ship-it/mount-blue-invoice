// Server-side session check used by every data action.
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function requireAuth() {
  const jar = await cookies();
  if (!(await verifySessionToken(jar.get(SESSION_COOKIE)?.value))) {
    throw new Error("Your login expired. Log in again.");
  }
}
