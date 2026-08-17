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

// Runs `run` against a single pinned connection inside BEGIN/COMMIT, rolling
// back if it throws. Use for multi-statement work that must not be left
// half-applied, such as clearing a set of rows and re-importing them.
// No retry wrapper here: a retry mid-transaction would replay statements the
// aborted transaction had already run.
export async function withTransaction(run) {
    const client = await pool.connect()
    const tx = (strings, ...values) => {
          const text = strings.reduce((prev, curr, i) => prev + '$' + i + curr)
          return client.query(text, values)
    }
    try {
          await client.query('BEGIN')
          const result = await run(tx)
          await client.query('COMMIT')
          return result
    } catch (err) {
          try {
                  await client.query('ROLLBACK')
          } catch (rollbackErr) {
                  console.error('Rollback failed:', rollbackErr)
          }
          throw err
    } finally {
          client.release()
    }
}
