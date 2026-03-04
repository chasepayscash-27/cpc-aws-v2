import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'your-database-host',
    user: 'your-username',
    password: 'your-password',
    database: 'your-database-name'
});

export const handler = async (event) => {
    const { propertyId } = JSON.parse(event.body);
    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [propertyId]);
    return {
        statusCode: 200,
        body: JSON.stringify(rows),
    };
};