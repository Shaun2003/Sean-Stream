import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/import/apple-music
 * Import songs from an Apple Music playlist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistId, appleMusicUrl } = body;

    if (!playlistId || !appleMusicUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Apple Music import requires MusicKit authentication. For now, provide a helpful message
    return NextResponse.json({
      success: false,
      count: 0,
      message: 'Apple Music import requires API configuration. Please use YouTube playlists instead.',
      error: 'Apple Music API authentication required'
    }, { status: 400 });
  } catch (error) {
    console.error('Apple Music import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
