import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "cpcVoiceMemos",
  access: (allow) => ({
    "sales-meetings/voice-memos/*": [
      allow.guest.to(["read", "write"]),
      allow.authenticated.to(["read", "write"]),
    ],
  }),
});
