import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq1, nq } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;
    const depositAmount = parseInt(amount, 10);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive integer' }, { status: 400 });
    }

    // 1. Tạo bản ghi payment_request với mã tạm thời, sau đó cập nhật theo ID serial
    const tempInsert = await nq1(
      `INSERT INTO payment_requests (user_id, amount, code, status)
       VALUES (
         $1,
         $2,
         -- Tránh lỗi VARCHAR(30): code temp cũng phải <= 30 ký tự
         'LVDD-TEMP-' || substr(md5(random()::text), 1, 20),
         'pending'
       )
       RETURNING id`,
      [user.id, depositAmount]
    );

    const requestId = tempInsert.id;
    const code = `LVDD${requestId}`;

    // Cập nhật lại mã code chuẩn: LVDD + ID
    const updatedRequest = await nq1(
      `UPDATE payment_requests
       SET code = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, amount, code, status, created_at`,
      [code, requestId]
    );

    // 2. Tạo link VietQR động
    // Định dạng QR: https://img.vietqr.io/image/<BANK>-<STK>-compact2.png?amount=<TIEN>&addInfo=<NOIDUNG>&accountName=<TEN>
    const bankId = 'MB'; // MB Bank
    const accountNumber = '0904774258';
    const accountName = encodeURIComponent('NGUYEN DUC DUY');
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${depositAmount}&addInfo=${code}&accountName=${accountName}`;

    return NextResponse.json({
      success: true,
      request: {
        id: updatedRequest.id,
        amount: parseInt(updatedRequest.amount, 10),
        code: updatedRequest.code,
        status: updatedRequest.status,
        created_at: updatedRequest.created_at
      },
      qrUrl,
      bankInfo: {
        bankName: 'Ngân hàng Quân Đội (MB Bank)',
        accountName: 'NGUYEN DUC DUY',
        accountNumber: '0904774258'
      }
    });

  } catch (error: any) {
    console.error('POST /api/payment/request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
