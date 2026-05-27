import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.guest(), allow.publicApiKey()]),

  // ─── Team Chat ───────────────────────────────────────────────────────────────

  ChatRoom: a
    .model({
      name: a.string().required(),
      description: a.string(),
      messages: a.hasMany("ChatMessage", "roomId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  ChatMessage: a
    .model({
      roomId: a.id().required(),
      room: a.belongsTo("ChatRoom", "roomId"),
      authorId: a.string().required(),
      authorName: a.string().required(),
      content: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
