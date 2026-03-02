import type { APIGatewayProxyHandler } from "aws-lambda";
import * as mysql from "mysql2/promise";

declare const process: any;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const sql: string = body.sql ?? "SELECT 1 AS ok";
  const params: any[] = body.params ?? [];

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 3306),
    });

    const [rows] = await conn.query(sql, params);
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