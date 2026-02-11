'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { type UserProfile, getFriends, respondToFriendRequest } from './actions';
import { LoadingAnimation } from '@/components/loading-animation';

type FriendRequest = UserProfile & { id: string };

export default function FriendsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [allFriends, setAllFriends] = useState<UserProfile[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  useEffect(() => {
    if (!user) return;

    // Fetch initial friends list
    getFriends(user.uid).then(setAllFriends);

    // Listen for incoming friend requests in real-time
    const requestsRef = collection(db, 'friendRequests');
    const q = query(requestsRef, where('to', '==', user.uid), where('status', '==', 'pending'));
    
    const unsubscribeRequests = onSnapshot(q, async (snapshot) => {
      const requestersIds = snapshot.docs.map(doc => doc.data().from);
      if (requestersIds.length > 0) {
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('uid', 'in', requestersIds));
        const usersSnapshot = await getDocs(usersQuery);
        const requestersProfiles = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

        const requests = snapshot.docs.map(doc => {
            const requester = requestersProfiles.find(p => p.uid === doc.data().from);
            return {
                id: doc.id,
                ...requester
            } as FriendRequest;
        });
        setFriendRequests(requests);
      } else {
        setFriendRequests([]);
      }
    });

    // Listen for changes in the user's friends list
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeFriends = onSnapshot(userDocRef, (doc) => {
        if(doc.exists()) {
            const friendIds = doc.data().friends || [];
            if(friendIds.length > 0) {
                getFriends(user.uid).then(setAllFriends);
            } else {
                setAllFriends([]);
            }
        }
    });

    return () => {
        unsubscribeRequests();
        unsubscribeFriends();
    };
  }, [user, db]);

  const handleRequestResponse = async (requestingUserId: string, action: 'accept' | 'decline') => {
    if (!user) return;
    setProcessingRequestId(requestingUserId);
    try {
      await respondToFriendRequest(requestingUserId, user.uid, action);
      toast({
        title: `Request ${action === 'accept' ? 'Accepted' : 'Declined'}`,
        description: action === 'accept' ? 'You are now friends.' : 'Request removed.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process the request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequestId(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container mx-auto max-w-4xl p-4 md:p-8">
          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Friend Requests</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {friendRequests.length > 0 ? (
                    friendRequests.map((request) => (
                    <Card key={request.uid} className="p-4">
                        <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={request.avatarUrl} alt={request.name} data-ai-hint="person" />
                            <AvatarFallback>{request.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold">{request.name}</p>
                            <div className="mt-2 flex gap-2">
                            <Button size="sm" className="flex-1" onClick={() => handleRequestResponse(request.uid, 'accept')} disabled={processingRequestId === request.uid}>
                                {processingRequestId === request.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Confirm
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRequestResponse(request.uid, 'decline')} disabled={processingRequestId === request.uid}>
                                Delete
                            </Button>
                            </div>
                        </div>
                        </div>
                    </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground">No new friend requests.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Friends</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {allFriends.length > 0 ? (
                    allFriends.map((friend) => (
                    <Card key={friend.uid} className="text-center">
                        <CardContent className="p-4">
                        <Avatar className="mx-auto h-20 w-20">
                            <AvatarImage src={friend.avatarUrl} alt={friend.name} data-ai-hint="person" />
                            <AvatarFallback>{friend.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="mt-2 font-semibold">{friend.name}</p>
                        </CardContent>
                    </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground">You don't have any friends yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
