import { RDSDataService } from "@aws-sdk/client-rds-data";

const rds = new RDSDataService({ region: process.env.AWS_REGION });

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
}

export const handler = async (event: any) => {
  try {
    console.log("Fetching property data from RDS...");

    const result = await rds.executeStatement({
      resourceArn: process.env.DB_RESOURCE_ARN!,
      secretArn: process.env.DB_SECRET_ARN!,
      database: "aws_chase_pays_cash",
      sql: `
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
        LIMIT 100
      `,
    });

    const properties: PropertyRecord[] = result.records?.map((record: any) => ({
      sold_year: record[0]?.longValue,
      property_id: record[1]?.longValue,
      property_address: record[2]?.stringValue,
      closed_date_dt: record[3]?.stringValue,
      status: record[4]?.stringValue,
      sold_amount_num: record[5]?.doubleValue,
      purchase_price_num: record[6]?.doubleValue,
      rehab_amount_num: record[7]?.doubleValue,
      gross_profit_num: record[8]?.doubleValue,
      days_on_market_num: record[9]?.longValue,
      lead_source: record[10]?.stringValue,
      agent: record[11]?.stringValue,
    })) || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: properties,
        count: properties.length,
      }),
    };
  } catch (error) {
    console.error("RDS Query Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data from RDS",
      }),
    };
  }
};
