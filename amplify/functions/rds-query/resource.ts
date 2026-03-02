import { defineFunction, secret } from "@aws-amplify/backend";

export const rdsQuery = defineFunction((scope) => {
  const fn = scope.createFunction({
    name: "rds-query",
    entry: "./handler.ts",
    environment: {
      DB_HOST: secret("DB_HOST"),
      DB_USER: secret("DB_USER"),
      DB_PASS: secret("DB_PASS"),
      DB_NAME: secret("DB_NAME"),
      DB_PORT: secret("DB_PORT"),
    },
  });

  // 👇 create a public Function URL
  fn.addFunctionUrl({
    authType: "NONE",
  });

  return fn;
});