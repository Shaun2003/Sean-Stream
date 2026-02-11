
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Trash2, Edit, Send, Loader2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { likePost, sharePost, deletePost, editPost, addComment, getComments, type SimpleUser, type Comment } from '@/app/post-actions';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from './ui/textarea';

export type User = {
  name: string;
  avatarUrl: string;
  handle: string;
};

export type Post = {
  id: string;
  user: User;
  userId: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  likes: number;
  comments: number;
  shares: number;
};

type PostCardProps = {
  post: Post;
};

export function PostCard({ post: initialPost }: PostCardProps) {
  const { toast } = useToast();
  const currentUser = auth.currentUser;
  
  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [shareCount, setShareCount] = useState(post.shares);
  const [commentCount, setCommentCount] = useState(post.comments);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);

  const isOwner = currentUser?.uid === post.userId;

  useEffect(() => {
    // A simple way to check if the current user has liked this post would be to
    // store liked posts in localStorage or fetch from a 'likes' collection.
    // For simplicity, we are not implementing this persistence here.
  }, [currentUser, post.id]);

  const handleLike = async () => {
    if (!currentUser) {
      toast({ title: "Please log in", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }

    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikeCount(likeCount + (newLikedState ? 1 : -1));
      
      const liker: SimpleUser = {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
      }

      await likePost(post.id, newLikedState, liker);
    } catch (error) {
      setIsLiked(!isLiked);
      setLikeCount(likeCount);
      toast({ title: 'Error', description: 'Failed to like post. Please try again.', variant: 'destructive' });
    }
  };

  const toggleComments = async () => {
    const toggledShow = !showComments;
    setShowComments(toggledShow);
    if (toggledShow && comments.length === 0) {
      setIsCommentsLoading(true);
      try {
        const fetchedComments = await getComments(post.id);
        setComments(fetchedComments);
      } catch (error) {
        toast({ title: "Error", description: "Could not fetch comments.", variant: "destructive" });
      } finally {
        setIsCommentsLoading(false);
      }
    }
  };
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    setIsCommenting(true);
    try {
        const commenter: SimpleUser = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
        };
        await addComment(post.id, newComment, commenter);
        // Optimistically add comment to UI
        const newCommentData: Comment = {
            id: Date.now().toString(),
            text: newComment,
            userId: currentUser.uid,
            user: { name: currentUser.displayName, avatarUrl: currentUser.photoURL },
            timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
        };
        setComments([...comments, newCommentData]);
        setCommentCount(prev => prev + 1);
        setNewComment('');
    } catch (error) {
        toast({ title: "Error", description: "Could not add comment.", variant: "destructive" });
    } finally {
        setIsCommenting(false);
    }
  };

  const handleShare = async () => {
    try {
      setShareCount(shareCount + 1);
      await sharePost(post.id);
      toast({ title: 'Post Shared!', description: 'The post has been shared successfully.' });
    } catch (error) {
      setShareCount(shareCount);
      toast({ title: 'Error', description: 'Failed to share post. Please try again.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    try {
        await deletePost(post.id, currentUser.uid);
        toast({ title: "Post Deleted", description: "The post has been removed." });
        // Optionally, you might want to hide the post from the UI
        // For now, we just show a toast.
    } catch(error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleEdit = async () => {
      if (!currentUser || !editedContent.trim()) return;
      try {
          await editPost(post.id, editedContent, currentUser.uid);
          setPost({ ...post, content: editedContent });
          setIsEditing(false);
          toast({ title: "Post Updated", description: "Your post has been successfully updated." });
      } catch(error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
      }
  }
  
  const formattedTimestamp = post.timestamp
    ? formatDistanceToNow(new Date(post.timestamp.seconds * 1000), { addSuffix: true })
    : 'just now';


  return (
    <>
      <Card className="overflow-hidden" id={`post-${post.id}`}>
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <Avatar>
            <AvatarImage src={post.user.avatarUrl} alt={post.user.name} data-ai-hint="person" />
            <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{post.user.name}</p>
            <p className="text-sm text-muted-foreground">
              {post.user.handle} &middot; {formattedTimestamp}
            </p>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                            <span className="text-red-500">Delete</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your post.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-2">
          {post.content && <p className="whitespace-pre-wrap">{post.content}</p>}
           {post.linkUrl && (
            <div className="mt-2 rounded-md border bg-muted p-3">
                 <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                    <Link2 className="h-4 w-4" />
                    <span>Shared Link</span>
                </p>
                <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                    {post.linkUrl}
                </a>
            </div>
           )}
        </CardContent>
        {post.imageUrl && (
          <div className="relative w-full aspect-video mt-2">
            <Image
              src={post.imageUrl}
              alt="Post image"
              fill
              className="object-cover"
              data-ai-hint="social media post"
            />
          </div>
        )}
        <CardFooter className="flex justify-between p-2">
          <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground" onClick={handleLike}>
            <ThumbsUp className={cn('h-5 w-5', isLiked && 'text-primary fill-primary')} />
            <span>{likeCount}</span>
            <span className="hidden sm:inline">Likes</span>
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground" onClick={toggleComments}>
            <MessageCircle className="h-5 w-5" />
            <span>{commentCount}</span>
            <span className="hidden sm:inline">Comments</span>
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
            <span>{shareCount}</span>
            <span className="hidden sm:inline">Shares</span>
          </Button>
        </CardFooter>
        {showComments && (
            <div className="p-4 border-t">
                {isCommentsLoading ? (
                    <div className="flex justify-center items-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.user.avatarUrl ?? undefined} alt={comment.user.name ?? ''} data-ai-hint="person" />
                                    <AvatarFallback>{comment.user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-muted p-3 rounded-lg">
                                    <p className="font-semibold text-sm">{comment.user.name}</p>
                                    <p className="text-sm">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                         {comments.length === 0 && <p className="text-sm text-muted-foreground text-center">No comments yet.</p>}
                    </div>
                )}
                <form className="flex items-center gap-2 mt-4" onSubmit={handleAddComment}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser?.photoURL ?? undefined} alt={currentUser?.displayName ?? ''} data-ai-hint="person" />
                        <AvatarFallback>{currentUser?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Input 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder="Write a comment..." 
                        className="flex-1"
                        disabled={isCommenting}
                    />
                    <Button type="submit" size="icon" disabled={isCommenting}>
                        {isCommenting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        )}
      </Card>
      
      <AlertDialog open={isEditing} onOpenChange={setIsEditing}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Edit Post</AlertDialogTitle>
                <AlertDialogDescription>Make changes to your post. Click save when you're done.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[120px] my-4"
            />
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEditedContent(post.content)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEdit}>Save Changes</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
