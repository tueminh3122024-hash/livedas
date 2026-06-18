import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { callLogId, outcome, durationSeconds } = await request.json();

    if (!callLogId) {
      return NextResponse.json({ error: 'Missing callLogId' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // Lấy started_at để tính duration_seconds chính xác nếu không truyền lên
    const { data: currentLog, error: getErr } = await supabase
      .from('call_logs')
      .select('started_at')
      .eq('id', callLogId)
      .single();

    let finalDuration = durationSeconds;
    if (!finalDuration && currentLog?.started_at) {
      const started = new Date(currentLog.started_at).getTime();
      const now = Date.now();
      finalDuration = Math.max(0, Math.floor((now - started) / 1000));
    }

    const { error: updateErr } = await supabase
      .from('call_logs')
      .update({
        outcome: outcome || 'no_deal',
        ended_at: new Date().toISOString(),
        duration_seconds: finalDuration || 0,
      })
      .eq('id', callLogId);

    if (updateErr) {
      console.error('Error updating call log:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API /api/calls/update crash:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
