import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { video_id, title, artist, thumbnail, position_seconds, duration_seconds } =
    await request.json();

  try {
    const { error } = await supabase.from('playback_history').insert({
        user_id: user.id,
      video_id,
      title,
      artist,
      thumbnail,
      position_seconds,
      duration_seconds,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Playback history updated',
    });
  } catch (error) {
    console.error('Error in playback history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const { data, error } = await supabase
      .from('playback_history')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching playback history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
