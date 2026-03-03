import { a, defineData } from "@aws-amplify/backend";

export const data = defineData({
  schema: a.schema({
    Todo: a
      .model({
        content: a.string(),
      })
      .authorization((allow) => [allow.publicApiKey()]),
  }),
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});