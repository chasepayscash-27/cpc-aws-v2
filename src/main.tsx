import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Amplify } from "aws-amplify";
import outputs from "../amplify/amplify_outputs.json";
import App from "./App";

// Allow environment-variable overrides for the AppSync endpoint and API key.
// Set VITE_APPSYNC_API_KEY (and optionally VITE_APPSYNC_URL) in the AWS Amplify
// Console → Environment variables to inject credentials without touching
// amplify_outputs.json.  Useful when the committed file's key becomes stale
// between backend deploys.
const amplifyConfig = {
  ...outputs,
  data: {
    ...outputs.data,
    ...(import.meta.env.VITE_APPSYNC_URL
      ? { url: import.meta.env.VITE_APPSYNC_URL }
      : {}),
    ...(import.meta.env.VITE_APPSYNC_API_KEY
      ? { api_key: import.meta.env.VITE_APPSYNC_API_KEY }
      : {}),
  },
};

Amplify.configure(amplifyConfig);

// Dev-only diagnostic: log whether guest Cognito credentials are obtained.
// Check the browser console on load to confirm the Identity Pool is issuing
// unauthenticated credentials before any AppSync request is made.
if (import.meta.env.DEV) {
  import("aws-amplify/auth").then(({ fetchAuthSession }) => {
    fetchAuthSession()
      .then((session) => {
        console.info("[main] Amplify guest session check:", {
          identityId: session.identityId ?? "(none — Identity Pool may not be configured)",
          hasCredentials: !!session.credentials,
          credentialsExpiration: session.credentials?.expiration ?? null,
        });
      })
      .catch((err) => {
        console.warn("[main] fetchAuthSession failed — guest credentials not available:", err);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
