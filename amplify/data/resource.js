import { a, defineData } from "@aws-amplify/backend";
const schema = a.schema({
    Todo: a
        .model({
        content: a.string(),
    })
        .authorization((allow) => [allow.publicApiKey()]),
});
export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: "apiKey",
        apiKeyAuthorizationMode: {
            expiresInDays: 30,
        },
    },
});
