import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "UNASSIGNED",
        input: true,
      },
    },
  },

  plugins: [
    {
      id: "first-user-bootstrap",
      hooks: {
        before: [
          {
            matcher: (ctx) => ctx.path === "/sign-up/email",
            handler: createAuthMiddleware(async (ctx) => {
              // Count existing users to determine role for the new registrant
              const userCount = await prisma.user.count();
              const role = userCount === 0 ? "SUPER_OPERATOR" : "UNASSIGNED";

              // Inject the role into the request body so BetterAuth writes it
              // when creating the user record.
              return {
                context: {
                  body: {
                    ...(ctx.body as Record<string, unknown>),
                    role,
                  },
                },
              };
            }),
          },
        ],
      },
    },
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
