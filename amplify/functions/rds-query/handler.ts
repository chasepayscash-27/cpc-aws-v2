import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import * as mysql from "mysql2/promise";

declare const process: any;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
  };

  // HttpApi preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Parse body safely (HttpApi can send base64 + string)
  let body: any = {};
  try {
    const raw =
      event.body
        ? (event.isBase64Encoded
            ? Buffer.from(event.body, "base64").toString("utf-8")
            : event.body)
        : "{}";
    body = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    body = {};
  }

  const sql: string = body.sql ?? "SELECT 1 AS ok";
  const params: any[] = body.params ?? [];

  try {
    const conn: any = await mysql.createConnection({
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
      database: process.env.DB_NAME!,
      port: Number(process.env.DB_PORT || 3306),
    });

    const [rows] = await conn.execute(sql, params);
    await conn.end();

    return { statusCode: 200, headers, body: JSON.stringify(rows) };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || String(err) }),
    };
  }
};