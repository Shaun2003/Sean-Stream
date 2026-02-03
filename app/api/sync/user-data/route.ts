import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      { data: likedTracks },
      { data: bookmarkedTracks },
      { data: playbackHistory },
      { data: searchHistory },
    ] = await Promise.all([
      supabase
        .from('liked_tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false }),
      supabase
        .from('bookmarked_tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('bookmarked_at', { ascending: false }),
      supabase
        .from('playback_history')
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(100),
      supabase
        .from('search_history')
        .select('query')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      liked_tracks: likedTracks || [],
      bookmarked_tracks: bookmarkedTracks || [],
      playback_history: playbackHistory || [],
      search_history: searchHistory?.map((item: any) => item.query) || [],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
