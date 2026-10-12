// Tokens are issued by this deployment itself (convex/auth.ts).
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
