import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";

defineBackend({
  auth,
  data,
  rdsQuery,
});