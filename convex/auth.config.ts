export default {
  providers: [
    {
      domain:
        process.env.CLERK_FRONTEND_API_URL ||
        process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
