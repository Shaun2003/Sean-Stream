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

  const { action, track } = await request.json();

  try {
    if (action === 'add') {
      const { error } = await supabase.from('bookmarked_tracks').insert({
        user_id: user.id,
        ...track,
      });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Track bookmarked',
      });
    }

    if (action === 'remove') {
      const { error } = await supabase
        .from('bookmarked_tracks')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', track.video_id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Bookmark removed',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in bookmarked tracks API:', error);
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

  try {
    const { data, error } = await supabase
      .from('bookmarked_tracks')
      .select('*')
      .eq('user_id', user.id)
      .order('bookmarked_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching bookmarked tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
