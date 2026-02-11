import { NextResponse } from 'next/server';
import { handleRecordLike } from '@/lib/api/gamification';

export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Missing userId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await handleRecordLike(userId);
    return NextResponse.json(result);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to record like' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
