require("dotenv").config();
import express from "express";
import http from "http";
import logger from "morgan";

import { ApolloServer } from "apollo-server-express";
import { graphqlUploadExpress } from "graphql-upload";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";

import { typeDefs, resolvers } from "./schema";
import { getUser } from "./users/users.utils";

const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const apollo = new ApolloServer({
    schema,
    playground: true,
    context: async (ctx) => {
      if (ctx.req) {
        return {
          loggedInUser: await getUser(ctx.req.headers.token),
        };
      } else {
        const {
          connection: { context },
        } = ctx;
        return {
          loggedInUser: context.loggedInUser,
        };
      }
    },
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });

  await apollo.start();
  const app = express();
  app.use(logger("tiny"));
  app.use("/static", express.static("uploads"));
  app.use(graphqlUploadExpress());
  apollo.applyMiddleware({ app });

  const httpServer = http.createServer(app);

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      async onConnect(connectionParams, webSocket, context) {
        console.log("onConnect!");
        const { token } = connectionParams;
        if (!token) {
          throw new Error("토큰이 존재하지 않습니다.");
        }
        const loggedInUser = await getUser(token);
        return { loggedInUser };
      },
      onDisconnect(webSocket, context) {
        console.log("onDisconnect!");
      },
    },
    { server: httpServer, path: "/graphql" }
  );

  const PORT = process.env.PORT;
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(
    `🚀🚀🚀 Server ready at http://localhost:${PORT}${apollo.graphqlPath}`
  );
}
startServer();
