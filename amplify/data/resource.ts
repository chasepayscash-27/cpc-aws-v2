import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.guest(), allow.publicApiKey()]),

  // Conversation routes only support owner() auth in Amplify Gen 2.
  // The public chat widget can use generateRecipe with in-context history.
  chat: a
    .conversation({
      aiModel: {
        resourcePath: "amazon.titan-text-lite-v1",
      },
      systemPrompt: "You are a helpful assistant",
    })
    .authorization((allow) => allow.owner()),

  generateRecipe: a
    .generation({
      aiModel: {
        resourcePath: "amazon.titan-text-lite-v1",
      },
      systemPrompt:
        "You are an analytics assistant for a real estate investment business. " +
        "Analyze the provided metrics and return structured insights.",
    })
    .arguments({
      description: a.string(),
    })
    .returns(
      a.customType({
        name: a.string(),
        ingredients: a.string().array(),
        instructions: a.string(),
      })
    )
    .authorization((allow) => [allow.guest(), allow.publicApiKey()]),
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
