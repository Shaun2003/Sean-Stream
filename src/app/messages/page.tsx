'use client';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getDoc, doc } from 'firebase/firestore';
import { type UserProfile } from '@/app/friends/actions';
import { ChatLayout } from '@/components/chat-layout';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { LoadingAnimation } from '@/components/loading-animation';

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        }
        setLoading(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, router, db]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-hidden relative">
        {user && profile ? (
          <ChatLayout currentUser={user} currentUserProfile={profile} />
        ) : (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>
        )}
      </main>
    </div>
  );
}
