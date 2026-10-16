import { sql, withTransaction } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseTossStatement } from '@/lib/tossStatement'
import { importDeposits } from '@/lib/depositImport'

// Upload a Toss 모임통장 거래내역서 PDF. 50,000원 deposits from general members in
// the open dues year are recorded as dues; the rest are queued for review.
// ?dryRun=1 shows what would happen without writing anything.
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  let file
  try {
    file = (await request.formData()).get('file')
  } catch {
    return Response.json({ error: 'Send the statement as a file upload.' }, { status: 400 })
  }
  if (!file || typeof file.arrayBuffer !== 'function') return Response.json({ error: 'No file provided.' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'File too large (max 10 MB).' }, { status: 400 })

  let parsed
  try {
    parsed = await parseTossStatement(Buffer.from(await file.arrayBuffer()))
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  try {
    const { rows: members } = await sql`
      SELECT id, name, name_ko, graduation_year, membership_level, status, is_approved FROM members`
    const args = { transactions: parsed.transactions, members, importedBy: parseInt(session.user.id) || null, dryRun }
    // One transaction: an error part way through leaves nothing half-recorded.
    const summary = dryRun ? await importDeposits(sql, args) : await withTransaction(tx => importDeposits(tx, args))
    return Response.json({ dryRun, account: parsed.account, transactions: parsed.transactions.length, ...summary })
  } catch (error) {
    console.error('Deposit import error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
