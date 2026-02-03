import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/import/spotify
 * Import songs from a Spotify playlist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistId, spotifyUrl } = body;

    if (!playlistId || !spotifyUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Spotify import requires authentication. For now, provide a helpful message
    return NextResponse.json({
      success: false,
      count: 0,
      message: 'Spotify import requires API configuration. Please use YouTube playlists instead.',
      error: 'Spotify API authentication required'
    }, { status: 400 });
  } catch (error) {
    console.error('Spotify import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
