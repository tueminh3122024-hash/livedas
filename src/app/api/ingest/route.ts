import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      product_id,
      seller_id,
      source_type,
      source_name,
      price_min,
      price_max,
      price_avg,
      volume_kg,
      region,
      confidence,
      raw_text
    } = body;

    if (!product_id || !price_avg) {
      return NextResponse.json({ error: 'Missing product_id or price_avg' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // 1. Thêm bản ghi mới vào price_entries
    const { data: entry, error: insertError } = await supabase
      .from('price_entries')
      .insert({
        product_id,
        seller_id: seller_id || null,
        source_type: source_type || 'manual',
        source_name: source_name || 'AI Crawler',
        price_min: price_min || null,
        price_max: price_max || null,
        price_avg: parseInt(String(price_avg), 10),
        volume_kg: volume_kg ? parseInt(String(volume_kg), 10) : null,
        region: region || null,
        confidence: confidence ? parseFloat(String(confidence)) : 0.80,
        raw_text: raw_text || null,
        processed: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting price entry:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Tính toán lại giá trung bình tổng hợp hiện tại cho sản phẩm này
    // Lấy 20 báo giá gần nhất của sản phẩm trong vòng 7 ngày
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentEntries, error: fetchError } = await supabase
      .from('price_entries')
      .select('price_avg, price_min, price_max, volume_kg')
      .eq('product_id', product_id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError || !recentEntries || recentEntries.length === 0) {
      // Nếu không lấy được lịch sử, cập nhật trực tiếp từ giá trị truyền vào
      await supabase
        .from('current_prices')
        .upsert({
          product_id,
          price_avg: parseInt(String(price_avg), 10),
          price_min: price_min || null,
          price_max: price_max || null,
          updated_at: new Date().toISOString()
        });
    } else {
      let sumPrice = 0;
      let minPrice = recentEntries[0].price_avg;
      let maxPrice = recentEntries[0].price_avg;
      let totalVol = 0;
      let activeSellersSet = new Set<string>();

      // Đếm số lượng seller hoạt động
      recentEntries.forEach(ent => {
        sumPrice += ent.price_avg;
        if (ent.price_min) minPrice = Math.min(minPrice, ent.price_min);
        if (ent.price_max) maxPrice = Math.max(maxPrice, ent.price_max);
        totalVol += ent.volume_kg || 0;
      });

      const calculatedAvg = Math.round(sumPrice / recentEntries.length);

      // Cập nhật bảng current_prices
      const { error: upsertError } = await supabase
        .from('current_prices')
        .upsert({
          product_id,
          price_avg: calculatedAvg,
          price_min: minPrice,
          price_max: maxPrice,
          price_recommended: Math.round(calculatedAvg * 0.98),
          total_volume_kg: totalVol,
          source_count: recentEntries.length,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error updating current_prices:', upsertError);
      }
    }

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('API /api/ingest crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
