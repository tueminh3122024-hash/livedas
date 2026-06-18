import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    const supabase = await createSupabaseServer();

    // Tính mốc thời gian bắt đầu
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hours);

    // Lấy tất cả price_entries của sản phẩm này trong dải giờ yêu cầu
    const { data: entries, error } = await supabase
      .from('price_entries')
      .select('price_avg, price_min, price_max, volume_kg, created_at')
      .eq('product_id', productId)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Nếu không có dữ liệu sỉ thực tế, trả về một mảng rỗng
    if (!entries || entries.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Gom nhóm dữ liệu theo giờ hoặc ngày tùy thuộc vào khoảng thời gian truy vấn
    const groupInterval = hours > 48 ? 'day' : 'hour';
    const groupedData: Record<string, {
      timeLabel: string;
      price_avg: number;
      price_min: number;
      price_max: number;
      volume_kg: number;
      count: number;
    }> = {};

    entries.forEach(entry => {
      const date = new Date(entry.created_at);
      let key = '';
      let timeLabel = '';

      if (groupInterval === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        timeLabel = `${date.getDate()}/${date.getMonth() + 1}`;
      } else {
        key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
        timeLabel = `${date.getHours()}h`;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          timeLabel,
          price_avg: 0,
          price_min: entry.price_min || entry.price_avg,
          price_max: entry.price_max || entry.price_avg,
          volume_kg: 0,
          count: 0
        };
      }

      const item = groupedData[key];
      item.price_avg += entry.price_avg;
      item.price_min = Math.min(item.price_min, entry.price_min || entry.price_avg);
      item.price_max = Math.max(item.price_max, entry.price_max || entry.price_avg);
      item.volume_kg += entry.volume_kg || 0;
      item.count += 1;
    });

    // Tính trung bình cộng thực tế
    const history = Object.keys(groupedData).map(key => {
      const item = groupedData[key];
      return {
        time: item.timeLabel,
        price_avg: Math.round(item.price_avg / item.count),
        price_min: item.price_min,
        price_max: item.price_max,
        volume_kg: item.volume_kg
      };
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('API /api/prices/[productId]/history crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
