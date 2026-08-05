import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (process.env.DATABASE_URL) {
      let query = `
        SELECT 
          id,
          user_id AS "userId",
          user_name AS "userName",
          user_phone AS "userPhone",
          amount::float AS amount,
          payment_method AS "paymentMethod",
          transaction_id AS "transactionId",
          sender_number AS "senderNumber",
          status,
          to_char(requested_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "requestedAt",
          reviewed_by AS "reviewedBy",
          to_char(reviewed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "reviewedAt",
          rejection_reason AS "rejectionReason"
        FROM recharge_requests
      `;
      const params: any[] = [];
      if (userId) {
        params.push(userId);
        query += ` WHERE user_id = $1`;
      }
      query += ` ORDER BY requested_at DESC;`;

      const res = await pool.query(query, params);
      return NextResponse.json(res.rows);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch recharge requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userName, userPhone, amount, paymentMethod, transactionId, senderNumber } = body;

    let reqObj: any = {
      id: `req-${Date.now()}`,
      userId,
      userName: userName || 'Resident User',
      userPhone: userPhone || '',
      amount: Number(amount),
      paymentMethod,
      transactionId,
      senderNumber,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    if (process.env.DATABASE_URL) {
      const res = await pool.query(
        `INSERT INTO recharge_requests (user_id, user_name, user_phone, amount, payment_method, transaction_id, sender_number, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
         RETURNING id, user_id AS "userId", user_name AS "userName", user_phone AS "userPhone", amount::float, payment_method AS "paymentMethod", transaction_id AS "transactionId", sender_number AS "senderNumber", status, to_char(requested_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "requestedAt";`,
        [userId, userName, userPhone, Number(amount), paymentMethod, transactionId, senderNumber]
      );
      if (res.rows.length > 0) reqObj = res.rows[0];
    }

    return NextResponse.json(reqObj, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit recharge request' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { requestId, status, adminId, reason } = await req.json();

    if (!requestId || !status) {
      return NextResponse.json({ error: 'requestId and status are required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const reqRes = await client.query(
          `UPDATE recharge_requests 
           SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $3
           WHERE id = $4 RETURNING user_id, amount;`,
          [status, adminId, reason || null, requestId]
        );

        if (status === 'APPROVED' && reqRes.rows.length > 0) {
          const { user_id, amount } = reqRes.rows[0];
          await client.query(`UPDATE wallets SET current_balance = current_balance + $1 WHERE user_id = $2;`, [amount, user_id]);
          await client.query(
            `INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description)
             SELECT id, $1, $2, 'CREDIT', 'Recharge Request Approved' FROM wallets WHERE user_id = $1;`,
            [user_id, amount]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, requestId, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process recharge request' }, { status: 500 });
  }
}
