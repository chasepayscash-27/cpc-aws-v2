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
            propertyId: a.id(),
            property: a.belongsTo("Property", "propertyId"),
            stage: a.string().required(),
            owner: a.string(),
            responsibilities: a.string(),
            notes: a.string(),
            order: a.integer().required(),
            workflowType: a.string(),
            subWorkflowType: a.string(),
            isComplete: a.boolean().default(false),
            completedAt: a.datetime(),
            completedBy: a.string(),
            assigneeId: a.string(),
            alertRecipientId: a.string(),
            taskNote: a.string(),
            taskNoteCreatedAt: a.datetime(),
            createdById: a.string(),
        })
        .authorization((allow) => [
            allow.authenticated("identityPool"),
            allow.guest(),
            allow.publicApiKey(),
        ]),

    PropertyAlertPreference: a
        .model({
            propertyId: a.id().required(),
            alertsEnabled: a.boolean().default(true),
        })
        .authorization((allow) => [
            allow.authenticated("identityPool"),
            allow.guest(),
            allow.publicApiKey(),
        ]),

    WorkflowAlertEvent: a
        .model({
            propertyId: a.id().required(),
            taskId: a.id().required(),
            taskStage: a.string().required(),
            recipientId: a.string().required(),
            recipientEmail: a.email().required(),
            recipientPhone: a.phone().required(),
            channels: a.string().required(),
            status: a.string().required(),
            attemptCount: a.integer().default(0),
            lastAttemptAt: a.datetime(),
            sentAt: a.datetime(),
            errorDetails: a.string(),
            triggeredAt: a.datetime().required(),
            triggeredBy: a.string(),
        })
        .authorization((allow) => [
            allow.authenticated("identityPool"),
            allow.guest(),
            allow.publicApiKey(),
        ]),

    // ─── Active Listing Notes ─────────────────────────────────────────────────────

    ActiveListingNote: a
        .model({
            content: a.string().required(),
            propertyAddress: a.string(),
            authorName: a.string(),
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
