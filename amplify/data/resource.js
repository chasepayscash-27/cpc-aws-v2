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

    // ─── Property Stage Overrides ──────────────────────────────────────────────
    // Interim solution: allows team members to drag-and-drop properties to a
    // different pipeline stage on the website without touching Flipper Force.
    // The effective stage for display is:
    //   overriddenStage (if present) › otherwise the Flipper Force stage from CSV.
    // Remove this model once Flipper Force is fully deprecated and the app owns
    // stage data end-to-end.

    PropertyStageOverride: a
        .model({
            // Stable identifier — maps to project_uuid in projects_v2.csv
            propertyId: a.string().required(),
            // One of the ACTIVE_STAGE_ORDER values defined in PipelineTracker.tsx
            overriddenStage: a.string().required(),
            // Original Flipper Force stage value kept for audit / rollback reference
            flipperForceStage: a.string(),
            // Who made the change (Cognito sub or display name when available)
            updatedBy: a.string(),
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
