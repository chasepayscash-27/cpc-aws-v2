import { a, defineData } from "@aws-amplify/backend";

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
        .authorization((allow) => [allow.authenticated("identityPool")]),

    ChatMessage: a
        .model({
            roomId: a.id().required(),
            room: a.belongsTo("ChatRoom", "roomId"),
            authorId: a.string().required(),
            authorName: a.string().required(),
            content: a.string().required(),
        })
        .authorization((allow) => [allow.authenticated("identityPool")]),

    // ─── Property Workflow ───────────────────────────────────────────────────────

    Property: a
        .model({
            name: a.string(),
            propertyTasks: a.hasMany("PropertyTask", "propertyId"),
        })
        .authorization((allow) => [
            allow.authenticated("identityPool"),
            allow.guest(),
            allow.publicApiKey(),
        ]),

    WorkflowTask: a
        .model({
            stage: a.string().required(),
            owner: a.string(),
            responsibilities: a.string(),
            notes: a.string(),
            order: a.integer().required(),
            isDefault: a.boolean().required(),
        })
        .authorization((allow) => [
            allow.authenticated("identityPool"),
            allow.guest(),
            allow.publicApiKey(),
        ]),

    PropertyTask: a
        .model({
            propertyId: a.id().required(),
            property: a.belongsTo("Property", "propertyId"),
            stage: a.string().required(),
            owner: a.string(),
            responsibilities: a.string(),
            notes: a.string(),
            order: a.integer().required(),
            isComplete: a.boolean().default(false),
            completedAt: a.datetime(),
            completedBy: a.string(),
            assigneeId: a.string(),
        })
        .authorization((allow) => [
            allow.authenticated("identityPool"),
            allow.guest(),
            allow.publicApiKey(),
        ]),
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
