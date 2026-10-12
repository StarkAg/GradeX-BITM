import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Serves the public keys Convex checks sign-in tokens against.
auth.addHttpRoutes(http);

export default http;
