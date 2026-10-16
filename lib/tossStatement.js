// Reads a Toss Bank 거래내역서 (transaction history) PDF into transactions.
//
// Each row of the statement is "거래일자 구분 거래금액 거래후잔액 거래내용", e.g.
//   2026-10-03 11:34:56  입금  50,000  34,954,600  김진홍 연회비
// pdf.js returns positioned text fragments rather than lines, so fragments are
// grouped into rows by their vertical position, then read left to right.
//
// The statement carries a running balance, which makes the parse checkable: every
// row's balance must equal the next older row's balance plus its own amount. A
// file that does not reconcile is rejected rather than half-imported, so a layout
// change on Toss's side fails loudly instead of recording the wrong deposits.

import { getDocumentProxy } from 'unpdf'

const ROW = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (\S+) (-?[\d,]+) (-?[\d,]+) ?(.*)$/
const toNumber = s => Number(String(s).replace(/,/g, ''))

async function pdfLines(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const lines = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { items } = await page.getTextContent()
    const rows = new Map()
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue
      const y = Math.round(it.transform[5])
      const x = it.transform[4]
      // Fragments of one row can differ in baseline by a point or two.
      const key = [...rows.keys()].find(k => Math.abs(k - y) <= 2) ?? y
      if (!rows.has(key)) rows.set(key, [])
      rows.get(key).push({ x, str: it.str })
    }
    ;[...rows.entries()]
      .sort((a, b) => b[0] - a[0]) // top of the page first
      .forEach(([, frags]) => lines.push(frags.sort((a, b) => a.x - b.x).map(f => f.str.trim()).join(' ').replace(/\s+/g, ' ').trim()))
  }
  return lines
}

export async function parseTossStatement(buffer) {
  const lines = await pdfLines(buffer)
  const header = lines.join('\n')
  if (!/토스뱅크|toss ?bank/i.test(header) || !/거래내역서/.test(header)) {
    throw new Error('This does not look like a Toss Bank 거래내역서 PDF.')
  }
  const account = header.match(/계좌번호\s*([\d-]+)/)?.[1] || null

  const rows = lines.map(l => l.match(ROW)).filter(Boolean).map(m => ({
    date: m[1],
    time: m[2],
    occurredAt: new Date(`${m[1]}T${m[2]}+09:00`).toISOString(),
    kind: m[3],
    amount: toNumber(m[4]),
    balanceAfter: toNumber(m[5]),
    memo: m[6].trim(),
  }))
  if (!rows.length) throw new Error('No transactions found in the statement.')

  // Newest first in the statement: each row's balance = older row's + its amount.
  let breaks = 0
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i + 1].balanceAfter + rows[i].amount !== rows[i].balanceAfter) breaks++
  }
  if (breaks) {
    throw new Error(`The statement did not reconcile (${breaks} balance mismatches), so it was not imported. Toss may have changed the layout.`)
  }
  return { account, transactions: rows }
}

// Identity of one bank transaction, stable across re-uploads. The balance after
// the transaction is part of it, so two identical deposits — same person, amount
// and minute — still count as two.
export function depositFingerprint(t) {
  return `${t.occurredAt}|${t.amount}|${t.balanceAfter}|${t.memo}`
}
