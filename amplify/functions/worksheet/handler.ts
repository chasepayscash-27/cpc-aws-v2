import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import * as mysql from "mysql2/promise";

declare const process: { env: Record<string, string | undefined> };

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
      database: process.env.DB_NAME!,
      port: Number(process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });
  }
  return pool;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS worksheet_fields (
    project_uuid VARCHAR(255) NOT NULL,
    field_name   VARCHAR(100) NOT NULL,
    field_value  TEXT,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (project_uuid, field_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  await getPool().execute(CREATE_TABLE_SQL);
  tableEnsured = true;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
    "Content-Type": "application/json",
  };

  const method = event.requestContext?.http?.method ?? "GET";

  if (method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    await ensureTable();

    if (method === "GET") {
      const projectId =
        event.queryStringParameters?.projectId ??
        event.pathParameters?.projectId ??
        "";

      if (!projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "projectId is required" }),
        };
      }

      const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
        "SELECT field_name, field_value FROM worksheet_fields WHERE project_uuid = ?",
        [projectId]
      );

      const fields: Record<string, string> = {};
      for (const row of rows) {
        fields[row.field_name as string] = row.field_value as string ?? "";
      }

      return { statusCode: 200, headers, body: JSON.stringify({ fields }) };
    }

    if (method === "POST") {
      let body: { projectId?: string; fields?: Record<string, string> } = {};
      try {
        const raw = event.body
          ? event.isBase64Encoded
            ? Buffer.from(event.body, "base64").toString("utf-8")
            : event.body
          : "{}";
        body = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        body = {};
      }

      const { projectId, fields } = body;

      if (!projectId || !fields || typeof fields !== "object") {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "projectId and fields are required" }),
        };
      }

      const entries = Object.entries(fields);
      if (entries.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ saved: 0 }) };
      }

      const db = getPool();
      for (const [fieldName, fieldValue] of entries) {
        await db.execute(
          `INSERT INTO worksheet_fields (project_uuid, field_name, field_value)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE field_value = VALUES(field_value), updated_at = CURRENT_TIMESTAMP`,
          [projectId, fieldName, fieldValue ?? ""]
        );
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ saved: entries.length }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: msg }),
    };
  }
};
