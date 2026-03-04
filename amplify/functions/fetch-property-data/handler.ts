import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import * as mysql from "mysql2/promise";

declare const process: any;

interface PropertyRecord {
  sold_year: number;
  property_id: number;
  property_address: string;
  closed_date_dt: string;
  status: string;
  sold_amount_num: number;
  purchase_price_num: number;
  rehab_amount_num: number;
  gross_profit_num: number;
  days_on_market_num: number;
  lead_source: string;
  agent: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    "Content-Type": "application/json",
  };

  // HttpApi preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Parse body safely
  let body: any = {};
  try {
    const raw =
      event.body
        ? event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf-8")
          : event.body
        : "{}";
    body = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    body = {};
  }

  const limit = body.limit ?? 100;

  let conn: any = null;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
      database: process.env.DB_NAME!,
      port: Number(process.env.DB_PORT || 3306),
    });

    const sql = `
      SELECT 
        sold_year,
        property_id,
        property_address,
        closed_date_dt,
        status,
        sold_amount_num,
        purchase_price_num,
        rehab_amount_num,
        gross_profit_num,
        days_on_market_num,
        lead_source,
        agent
      FROM sold_all_clean
      WHERE status = 'SOLD'
      ORDER BY closed_date_dt DESC
      LIMIT ?
    `;

    const [rows] = await conn.execute(sql, [limit]);

    const properties: PropertyRecord[] = (rows as any[]).map((row: any) => ({
      sold_year: row.sold_year,
      property_id: row.property_id,
      property_address: row.property_address,
      closed_date_dt: row.closed_date_dt,
      status: row.status,
      sold_amount_num: row.sold_amount_num,
      purchase_price_num: row.purchase_price_num,
      rehab_amount_num: row.rehab_amount_num,
      gross_profit_num: row.gross_profit_num,
      days_on_market_num: row.days_on_market_num,
      lead_source: row.lead_source,
      agent: row.agent,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: properties,
        count: properties.length,
      }),
    };
  } catch (err: any) {
    console.error("RDS Query Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err?.message || "Failed to fetch data from RDS",
      }),
    };
  } finally {
    if (conn) {
      await conn.end();
    }
  }
};
