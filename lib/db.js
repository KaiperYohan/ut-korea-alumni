import { Pool } from 'pg'

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING,
    ssl: { rejectUnauthorized: false },
})

// Retries the query up to 3 times with exponential backoff.
// This handles Neon's cold-start delay (free plan autosuspends after 5 min).
export async function sql(strings, ...values) {
    const text = strings.reduce((prev, curr, i) => prev + '$' + i + curr)
    const maxRetries = 3
    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
                  const { rows } = await pool.query(text, values)
                  return { rows }
          } catch (err) {
                  lastError = err
                  const isConnectionError =
                            err.code === 'ECONNREFUSED' ||
                            err.code === 'ECONNRESET' ||
                            err.code === '57P03' ||
                            err.message?.includes('terminating') ||
                            err.message?.includes('connection') ||
                            err.message?.includes('timeout')
                  if (!isConnectionError || attempt === maxRetries) throw err
                  const delay = attempt * 1000
                  console.warn(`DB connection attempt ${attempt} failed, retrying in ${delay}ms...`)
                  await new Promise((r) => setTimeout(r, delay))
          }
    }
    throw lastError
}
