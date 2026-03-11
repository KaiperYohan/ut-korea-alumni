import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false },
})

export async function sql(strings, ...values) {
  const text = strings.reduce((prev, curr, i) => prev + '$' + i + curr)
  const { rows } = await pool.query(text, values)
  return { rows }
}
