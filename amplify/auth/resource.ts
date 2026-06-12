import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  // Enable unauthenticated guest identities for the public AI chat widget.
  // The Identity Pool's unauthenticated role is granted AppSync access via
  // allow.guest() on the public data routes.
});
