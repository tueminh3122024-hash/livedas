import { createSupabaseAdmin } from '@/lib/supabase-server';
import { generateMockCurrentPrice, generateMockPriceEntry } from '@/lib/mock-prices';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createSupabaseAdmin();

    // 1. Lấy danh sách sản phẩm và người bán
    const { data: products } = await supabase.from('products').select('id');
    const { data: sellers } = await supabase.from('sellers').select('id');

    if (!products || products.length === 0 || !sellers || sellers.length === 0) {
      return NextResponse.json({
        error: 'Chưa có dữ liệu sản phẩm hoặc người bán sỉ trong database. Hãy chạy seed migration trước.'
      }, { status: 400 });
    }

    // 2. Xóa các báo giá cũ để làm sạch dữ liệu demo
    await supabase.from('price_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    let entriesCreated = 0;

    // 3. Với mỗi sản phẩm, tạo 5 báo giá lịch sử (trong vòng 24 giờ qua) + giá hiện tại
    for (const prod of products) {
      const activeSellerCount = Math.floor(1 + Math.random() * 3); // 1 đến 3 người bán cho sản phẩm này
      const shuffledSellers = [...sellers].sort(() => 0.5 - Math.random());
      const chosenSellers = shuffledSellers.slice(0, activeSellerCount);

      // Tạo lịch sử báo giá
      for (let i = 0; i < 5; i++) {
        const seller = chosenSellers[i % chosenSellers.length];
        const entry = generateMockPriceEntry(prod.id, seller.id);
        
        // Giả lập thời gian trong quá khứ
        const entryTime = new Date();
        entryTime.setHours(entryTime.getHours() - (i * 4 + Math.random() * 2)); // 4 tiếng trước mỗi bước

        await supabase.from('price_entries').insert({
          ...entry,
          created_at: entryTime.toISOString()
        });
        entriesCreated++;
      }

      // Tạo giá hiện tại
      const currentPrice = generateMockCurrentPrice(prod.id, activeSellerCount);
      await supabase.from('current_prices').upsert(currentPrice);
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo thành công dữ liệu giá giả lập cho ${products.length} sản phẩm`,
      entries_count: entriesCreated
    });
  } catch (error: any) {
    console.error('API /api/mock/generate crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
