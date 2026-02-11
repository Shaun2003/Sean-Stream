
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ArtistsPage() {
  const supabase = await createClient();
  const { data: artists } = await supabase.from('artists').select('id, name');

  return (
    <div>
      <h1>All Artists</h1>
      <ul>
        {artists?.map((artist) => (
          <li key={artist.id}>
            <Link href={`/artists/${artist.id}`}>{artist.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
