import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sign-in lives here, in Convex, with email and password.
 *
 * It replaced Clerk in October 2026: Clerk ended every session after exactly
 * seven days, so students were signed out every week. A session now lasts a
 * year and is only ended by signing out, by a year without opening the app,
 * or by deleting the account.
 *
 * Errors meant for the student are ConvexErrors: anything else is replaced
 * with "Server Error" before it reaches a production client.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
          throw new ConvexError("Enter a valid email address.");
        }
        return { email };
      },
      validatePasswordRequirements(password) {
        if (!password || password.length < 8) {
          throw new ConvexError("Use a password of at least 8 characters.");
        }
        if (password.length > 200) {
          throw new ConvexError("That password is too long.");
        }
      },
    }),
  ],
  session: {
    totalDurationMs: 365 * DAY_MS,
    inactiveDurationMs: 365 * DAY_MS,
  },
});
