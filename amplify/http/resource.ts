import { defineHttpApi } from "@aws-amplify/backend";
import { rdsQuery } from "../functions/rds-query/resource";

export const httpApi = defineHttpApi({
  routes: {
    "/query": rdsQuery,
  },
});