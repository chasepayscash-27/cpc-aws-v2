import { a, defineData } from "@aws-amplify/backend";
const schema = a.schema({
    Todo: a
        .model({
        content: a.string(),
    })
        .authorization((allow) => [allow.guest(), allow.publicApiKey()]),
});
export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: "identityPool",
        apiKeyAuthorizationMode: {
            expiresInDays: 365,
        },
    },
});
