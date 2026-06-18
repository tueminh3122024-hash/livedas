import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@127.0.0.1:54342/postgres';

    const isLocal =
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('localhost');

    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false }
    });

    // Thiết lập client_encoding UTF8 để xử lý tiếng Việt chính xác
    pool.on('connect', (client) => {
      client.query("SET client_encoding = 'UTF8'")
        .catch(err => console.error('Error setting client encoding to UTF8', err));
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
    });
  }
  return pool;
}

/** Chạy truy vấn SQL trả về danh sách dòng */
export async function nq<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

/** Chạy truy vấn SQL trả về 1 dòng duy nhất hoặc null */
export async function nq1<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await nq<T>(sql, params);
  return rows[0] || null;
}

/** Chạy truy vấn đếm số lượng dòng */
export async function nqCount(sql: string, params?: any[]): Promise<number> {
  const row = await nq1(sql, params);
  if (!row) return 0;
  // Trả về count hoặc cnt
  const val = Object.values(row)[0];
  return parseInt(String(val), 10) || 0;
}

/** Chạy truy vấn an toàn (bọc try-catch, không crash app) */
export async function nqSafe<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    return await nq<T>(sql, params);
  } catch (error) {
    console.error(`Database query failed: ${sql}`, error);
    return [];
  }
}
