import { decideDeposit } from '@/lib/depositMatch'
import { depositFingerprint } from '@/lib/tossStatement'

// Applies a parsed Toss statement to the database through `db` (a sql tag, or a
// transaction from withTransaction). Every deposit worth acting on is stored once
// in bank_deposits, keyed by its fingerprint, so uploading the same or an
// overlapping statement again never records a payment twice. Deposits that pass
// the rules in lib/depositMatch are recorded as dues; the rest wait for review.
//
// `dryRun` reports what would happen and writes nothing.
export async function importDeposits(db, { transactions, members, importedBy, now = new Date(), dryRun = false }) {
  const { rows: ledger } = await db`SELECT member_id, dues_year FROM dues_payments`
  const paid = new Set(ledger.map(r => `${r.member_id}|${r.dues_year}`))

  const summary = { considered: 0, recorded: 0, review: 0, alreadyImported: 0, ignored: 0, noAccount: 0, items: [] }
  // Oldest first, the order the money arrived, so a member's first 50,000원
  // counts as their dues and a later one on the same night goes to review.
  for (const tx of [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    const d = decideDeposit(tx, members, paid, now)
    if (d.action === 'ignore') { summary.ignored++; continue }
    summary.considered++

    const fp = depositFingerprint(tx)
    if (!dryRun) {
      const { rows: seen } = await db`SELECT id FROM bank_deposits WHERE fingerprint = ${fp}`
      if (seen.length) { summary.alreadyImported++; continue }
    }

    const item = {
      at: `${tx.date} ${tx.time}`, memo: tx.memo, amount: tx.amount, duesYear: d.duesYear,
      action: d.action, reason: d.reason,
      member: d.member ? { id: d.member.id, name: d.member.name, name_ko: d.member.name_ko } : null,
    }
    summary.items.push(item)
    if (d.noAccount) summary.noAccount++

    if (dryRun) {
      if (d.action === 'auto') { paid.add(`${d.member.id}|${d.duesYear}`); summary.recorded++ } else summary.review++
      continue
    }

    const { rows: [dep] } = await db`
      INSERT INTO bank_deposits (fingerprint, occurred_at, amount, balance_after, memo, dues_year, status,
                                 reason, suggested_member_id, no_account, imported_by)
      VALUES (${fp}, ${tx.occurredAt}, ${tx.amount}, ${tx.balanceAfter}, ${tx.memo}, ${d.duesYear},
              ${d.action === 'auto' ? 'auto_recorded' : 'pending_review'}, ${d.reason},
              ${d.member ? d.member.id : null}, ${!!d.noAccount}, ${importedBy || null})
      RETURNING id`

    if (d.action === 'auto') {
      const { rows: [pay] } = await db`
        INSERT INTO dues_payments (member_id, dues_year, amount, paid_at, method, note, recorded_by)
        VALUES (${d.member.id}, ${d.duesYear}, ${tx.amount}, ${tx.date}, 'bank transfer (auto)',
                ${`토스 모임통장 자동: ${tx.memo} / ${tx.date} ${tx.time}`}, ${importedBy || null})
        RETURNING id`
      await db`UPDATE bank_deposits SET member_id = ${d.member.id}, payment_id = ${pay.id} WHERE id = ${dep.id}`
      paid.add(`${d.member.id}|${d.duesYear}`)
      summary.recorded++
    } else {
      summary.review++
    }
  }
  return summary
}
