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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
