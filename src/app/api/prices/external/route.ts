import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const localPrice = parseInt(searchParams.get('local_price') || '0', 10);

    if (!productId || localPrice === 0) {
      return NextResponse.json({ error: 'Missing product_id or local_price' }, { status: 400 });
    }

    // Giả lập kết nối với sàn giao dịch lớn bên ngoài (ví dụ: Chợ nông sản Cần Thơ, giá sỉ xuất khẩu)
    const mockExternalIndexPrice = Math.round(localPrice * (0.93 + Math.random() * 0.12)); // lệch ±7%
    const difference = mockExternalIndexPrice - localPrice;
    const differencePercent = parseFloat(((difference / localPrice) * 100).toFixed(2));

    return NextResponse.json({
      success: true,
      productId,
      localPrice,
      externalSource: 'Tổng cục Thống kê Nông nghiệp & Thủy sản Việt Nam',
      externalIndexPrice: mockExternalIndexPrice,
      priceDifference: difference,
      priceDifferencePercent: differencePercent,
      recommendedAction: differencePercent > 5 ? 'BUY' : differencePercent < -5 ? 'SELL' : 'HOLD',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
