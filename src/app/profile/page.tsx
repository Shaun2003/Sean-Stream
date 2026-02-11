
'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';


import { auth, db } from '@/lib/firebase';
import { Header } from '@/components/header';
import { PostCard, type Post } from '@/components/post-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Edit, UserPlus, Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { createStory, SimpleUser } from '@/app/post-actions';
import { clientUploadImage } from '@/lib/client-uploads';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sendFriendRequest } from '@/app/friends/actions';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/loading-animation';

type UserProfile = {
  uid: string;
  name: string;
  email: string | null;
  avatarUrl: string;
  coverPhotoUrl: string;
  bio: string;
  friends: number;
};

function ProfilePageContent() {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState<'avatar' | 'cover' | 'story' | false>(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const storyPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const profileUserId = searchParams.get('uid') || currentUser?.uid;
  const isOwnProfile = !searchParams.get('uid') || searchParams.get('uid') === currentUser?.uid;

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    const userDocRef = doc(db, 'users', userId);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setProfile(userDoc.data() as UserProfile);
      } else {
        toast({ title: "User not found", description: "This profile does not exist.", variant: 'destructive' });
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({ title: "Error", description: "Could not load user profile data.", variant: 'destructive' });
      setProfile(null);
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setCurrentUserProfile(userDoc.data() as UserProfile);
        }
      }
      
      if (!user && !searchParams.get('uid')) {
        router.push('/login');
      } else {
        const userIdToFetch = searchParams.get('uid') || user?.uid;
        if(userIdToFetch) {
            await fetchProfile(userIdToFetch);
        } else {
            setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router, fetchProfile, searchParams]);

  useEffect(() => {
    if (!profileUserId) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', profileUserId)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Post, 'id'>),
      }));

      postsData.sort((a, b) => {
          if (a.timestamp && b.timestamp) {
              return b.timestamp.seconds - a.timestamp.seconds;
          }
          return 0;
      });

      setUserPosts(postsData);
    }, (error) => {
        console.error("Error fetching user posts: ", error);
        toast({ title: "Error", description: "Could not fetch posts.", variant: 'destructive' });
    });

    return () => unsubscribe();
  }, [profileUserId, toast]);


  const handleEditProfile = () => setIsEditModalOpen(true);
  const handleAddToStory = () => storyPhotoInputRef.current?.click();

  const handleFileSelectAndUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: 'avatar' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setIsUploading(imageType);
      try {
        const downloadURL = await clientUploadImage(dataUrl, currentUser.uid, imageType);

        const userDocRef = doc(db, 'users', currentUser.uid);
        const fieldToUpdate = imageType === 'avatar' ? { avatarUrl: downloadURL } : { coverPhotoUrl: downloadURL };
        await updateDoc(userDocRef, fieldToUpdate);

        setProfile(prev => prev ? { ...prev, ...fieldToUpdate } : null);
        toast({ title: "Success", description: `${imageType === 'avatar' ? 'Profile picture' : 'Cover photo'} updated.` });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({ title: "Upload Failed", description: "Could not upload the image. Please try again.", variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const handleStoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setIsUploading('story');
        try {
            const imageUrl = await clientUploadImage(dataUrl, currentUser.uid, 'story');
            
            const simpleUser: SimpleUser = {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
            };

            await createStory({ imageUrl }, simpleUser);

            toast({ title: "Story Added!", description: "Your story has been posted for 24 hours." });
        } catch (error) {
            console.error("Error creating story:", error);
            toast({ title: "Story Creation Failed", description: "Could not create your story.", variant: "destructive" });
        } finally {
            setIsUploading(false);
            if (storyPhotoInputRef.current) {
                storyPhotoInputRef.current.value = "";
            }
        }
    };
  }

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !profile) return;
    const formData = new FormData(e.currentTarget);
    const newName = formData.get('name') as string;
    const newBio = formData.get('bio') as string;

    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { name: newName, bio: newBio });
      setProfile(prev => prev ? { ...prev, name: newName, bio: newBio } : null);
      setIsEditModalOpen(false);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
    }
  };

  const handleSendFriendRequest = async () => {
    if (!profile || !currentUser || !currentUserProfile) return;
    setIsSendingRequest(true);
    try {
      await sendFriendRequest(profile.uid, currentUser.uid, currentUserProfile);
      toast({
        title: "Friend Request Sent",
        description: `Your request to ${profile.name} has been sent.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request.",
        variant: "destructive",
      });
    } finally {
      setIsSendingRequest(false);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingAnimation />
      </div>
    );
  }

  if (!profile) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center bg-background text-center p-4">
                <div>
                    <p className="mb-4">User profile not found or could not be loaded.</p>
                    <Button onClick={() => profileUserId && fetchProfile(profileUserId)}>Retry</Button>
                </div>
            </main>
        </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <Tabs defaultValue="posts" className="w-full">
            <Card className="mt-0 md:mt-4 overflow-hidden shadow-none md:shadow-md border-0 md:border rounded-none md:rounded-lg">
              <div className="relative h-40 w-full md:h-64">
                {isUploading === 'cover' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-t-lg">
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                  </div>
                )}
                <Image
                  src={profile.coverPhotoUrl || "https://placehold.co/1000x400.png"}
                  alt="Cover photo"
                  className="object-cover"
                  layout="fill"
                  priority
                  data-ai-hint="landscape abstract"
                />
                 {isOwnProfile && (
                    <>
                        <input type="file" accept="image/*" ref={coverPhotoInputRef} onChange={(e) => handleFileSelectAndUpload(e, 'cover')} className="hidden" />
                        <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2 md:bottom-4 md:right-4 gap-2 z-10"
                        onClick={() => coverPhotoInputRef.current?.click()}
                        disabled={!!isUploading}
                        >
                        <Camera className="h-4 w-4" /> <span className="hidden sm:inline">Edit cover photo</span>
                        </Button>
                    </>
                 )}
              </div>
              <div className="bg-card px-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4">
                  <div className="relative -mt-12 md:-mt-20 ml-4 shrink-0">
                     {isOwnProfile && <input type="file" accept="image/*" ref={profilePhotoInputRef} onChange={(e) => handleFileSelectAndUpload(e, 'avatar')} className="hidden" />}
                    <Avatar className={cn("h-24 w-24 md:h-40 md:w-40 border-4 border-card", isOwnProfile && "cursor-pointer")} onClick={() => isOwnProfile && profilePhotoInputRef.current?.click()}>
                      <AvatarImage src={profile.avatarUrl} alt={profile.name} data-ai-hint="person" />
                      <AvatarFallback>{profile.name?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                     {isUploading === 'avatar' && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
                  </div>
                  <div className="mt-2 flex-1">
                    <h2 className="text-2xl font-bold md:text-3xl">{profile.name}</h2>
                    <p className="text-muted-foreground">{profile.friends} friends</p>
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                    {isOwnProfile ? (
                        <>
                            <input type="file" accept="image/*" ref={storyPhotoInputRef} onChange={handleStoryUpload} className="hidden" />
                            <Button className="gap-2 flex-1" onClick={handleAddToStory} disabled={isUploading === 'story'}>
                              {isUploading === 'story' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                               Add to story
                            </Button>
                            <Button variant="secondary" className="gap-2 flex-1" onClick={handleEditProfile}>
                            <Edit className="h-4 w-4" /> Edit profile
                            </Button>
                        </>
                    ) : (
                       <Button className="gap-2 w-full" onClick={handleSendFriendRequest} disabled={isSendingRequest}>
                          {isSendingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                           Add Friend
                        </Button>
                    )}
                  </div>
                </div>
                 <Separator className="my-4" />
                <TabsList className="w-full sm:w-auto grid grid-cols-2">
                    <TabsTrigger value="posts" className="flex-1 sm:flex-initial">Posts</TabsTrigger>
                    <TabsTrigger value="about" className="flex-1 sm:flex-initial">About</TabsTrigger>
                </TabsList>
              </div>
            </Card>

            <div className="container mx-auto max-w-5xl py-4 md:py-8">
                <TabsContent value="posts" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <Card>
                                <CardContent className="p-4">
                                <h3 className="font-bold">Intro</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {profile.bio || "No bio yet."}
                                </p>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <div className="space-y-6">
                                {userPosts.length > 0 ? (
                                userPosts.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))
                                ) : (
                                <Card>
                                    <CardContent className="p-6 text-center text-muted-foreground">
                                    This user hasn't posted anything yet.
                                    </CardContent>
                                </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="about" className="mt-0">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-bold text-lg">About {profile.name}</h3>
                            <div>
                                <h4 className="font-semibold">Bio</h4>
                                <p className="text-muted-foreground">{profile.bio || "No bio yet."}</p>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold">Contact</h4>
                                <p className="text-muted-foreground">{profile.email || "No email provided."}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" defaultValue={profile.name} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bio" className="text-right">Bio</Label>
                <Textarea id="bio" name="bio" defaultValue={profile.bio} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ProfilePage() {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><LoadingAnimation /></div>}>
        <ProfilePageContent />
      </Suspense>
    );
}
