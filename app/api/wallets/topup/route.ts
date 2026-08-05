import { NextResponse } from 'next/server';
import { pool } from '../../../../api/db.js';

export async function POST(req: Request) {
  try {
    const { userId, amount, adminId, note } = await req.json();

    if (!userId || amount === undefined) {
      return NextResponse.json({ error: 'userId and amount are required' }, { status: 400 });
    }

    let tx: any = {
      id: `tx-${Date.now()}`,
      userId,
      amount: Number(amount),
      type: Number(amount) >= 0 ? 'CREDIT' : 'DEBIT',
      description: note || 'Admin Topup',
      date: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const walletRes = await client.query(
          `UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING current_balance;`,
          [Number(amount), userId]
        );
        const txType = Number(amount) >= 0 ? 'ADMIN_TOPUP' : 'DEBIT';
        const txRes = await client.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description)
           SELECT id, $1, $2, $3, $4 FROM wallets WHERE user_id = $1
           RETURNING id, user_id AS "userId", amount::float, transaction_type AS type, description, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date;`,
          [userId, Number(amount), txType, note || 'Admin Topup']
        );
        await client.query('COMMIT');
        if (txRes.rows.length > 0) tx = txRes.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    return NextResponse.json(tx);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Topup failed' }, { status: 500 });
  }
}
