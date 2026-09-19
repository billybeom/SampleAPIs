// Apollo Server v4 + Express — Tours GraphQL API (api4-graphql)
// POST /graphql  — GraphQL endpoint
// GET  /graphql  — Apollo Sandbox (dev) / disabled (prod)
// GET  /health   — Health check

"use strict";

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const { Query }    = require("./resolvers/queries");
const { Mutation } = require("./resolvers/mutations");
const typeResolvers = require("./resolvers/types");

// ── Schema ───────────────────────────────────────────────────────────────────

const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema", "schema.graphql"),
  "utf8"
);

// ── Resolvers ─────────────────────────────────────────────────────────────────

const resolvers = {
  Query,
  Mutation,
  // Type resolvers & custom scalars
  Cruise:       typeResolvers.Cruise,
  Customer:     typeResolvers.Customer,
  Booking:      typeResolvers.Booking,
  BookedRoom:   typeResolvers.BookedRoom,
  Date:         typeResolvers.Date,
  DateTime:     typeResolvers.DateTime,
  EmailAddress: typeResolvers.EmailAddress,
};

// ── Server Bootstrap ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "4000", 10);

async function start() {
  const app = express();
  const httpServer = http.createServer(app);

  // Apollo Server v4
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    // Introspection always enabled so Apollo Sandbox works
    introspection: true,
  });

  await server.start();

  // Middleware
  app.use(morgan("combined"));

  // Health check (no auth needed)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "tours-graphql-api", version: "1.0.0" });
  });

  // GraphQL endpoint
  app.use(
    "/graphql",
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        // Pass headers through so API Connect can inject auth context later
        headers: req.headers,
      }),
    })
  );

  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`🚀 Tours GraphQL API ready at http://localhost:${PORT}/graphql`);
  console.log(`❤️  Health check at       http://localhost:${PORT}/health`);
  console.log(`📖 Apollo Sandbox:         http://localhost:${PORT}/graphql`);
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
