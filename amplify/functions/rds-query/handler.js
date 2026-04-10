import * as mysql from "mysql2/promise";

// Module-level pool: created once per Lambda execution context and reused
// across warm invocations, eliminating a new TCP + TLS + auth handshake on
// every request.  connectionLimit:1 is appropriate because a single Lambda
// instance handles one request at a time.
let pool = null;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT || 3306),
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0,
        });
    }
    return pool;
}

export const handler = async (event) => {
    const headers = {
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
    let body = {};
    try {
        const raw = event.body
            ? (event.isBase64Encoded
                ? Buffer.from(event.body, "base64").toString("utf-8")
                : event.body)
            : "{}";
        body = typeof raw === "string" ? JSON.parse(raw) : raw;
    }
    catch {
        body = {};
    }
    const sql = body.sql ?? "SELECT 1 AS ok";
    const params = body.params ?? [];
    try {
        const [rows] = await getPool().execute(sql, params);
        return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }
    catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err?.message || String(err) }),
        };
    }
};
