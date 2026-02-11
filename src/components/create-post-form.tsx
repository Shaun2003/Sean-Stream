'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User } from 'firebase/auth';
import Image from 'next/image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, Link2, Sparkles, Loader2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getSummary } from '@/app/actions';
import { createPost, type SimpleUser } from '@/app/post-actions';
import { clientUploadImage } from '@/lib/client-uploads';
import { cn } from '@/lib/utils';

const postSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty.').or(z.literal('')),
  image: z.any().optional(),
  link: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
}).refine(data => !!data.content || !!data.image || !!data.link, {
    message: "Post must have content, an image, or a link.",
    path: ["content"],
});


type PostFormData = z.infer<typeof postSchema>;

type CreatePostFormProps = {
  user: User;
};

export function CreatePostForm({ user }: CreatePostFormProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: '', link: '' },
  });

  const contentValue = form.watch('content');
  const linkValue = form.watch('link');

  const handleSummarize = async () => {
    if (!contentValue || contentValue.trim().length < 50) {
      toast({
        title: 'Content too short',
        description: 'Please enter at least 50 characters to summarize.',
        variant: 'destructive',
      });
      return;
    }
    setIsSummarizing(true);
    const result = await getSummary(contentValue);
    if (result.summary) {
      setSummary(result.summary);
      setShowSummaryDialog(true);
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsSummarizing(false);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    form.setValue("image", null);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  }

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const linkUrl = (e.currentTarget as HTMLFormElement).linkUrl.value;
    try {
        z.string().url().parse(linkUrl);
        form.setValue('link', linkUrl);
        setIsLinkDialogOpen(false);
    } catch (error) {
        form.setError('link', { type: 'manual', message: 'Please enter a valid URL.' });
    }
  };

  const clearLink = () => {
      form.setValue('link', '');
  }

  const onSubmit = async (data: PostFormData) => {
    setIsPosting(true);
    try {
      let imageUrl: string | undefined = undefined;
      if (data.image) {
        imageUrl = await clientUploadImage(data.image, user.uid, 'post');
      }
      
      const simpleUser: SimpleUser = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      await createPost({ content: data.content, imageUrl, linkUrl: data.link }, simpleUser);
      
      toast({
        title: 'Post Created!',
        description: 'Your post has been successfully shared.',
      });
      form.reset();
      clearImage();
      clearLink();

    } catch (error: any) {
       toast({
        title: 'Error creating post',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="p-4">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarImage src={user.photoURL ?? 'https://placehold.co/40x40.png'} alt={user.displayName ?? 'User'} data-ai-hint="person" />
                <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
              </Avatar>
              <Textarea
                {...form.register('content')}
                placeholder="What's on your mind?"
                className="min-h-[80px] w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              />
            </div>
             {imagePreview && (
              <div className="relative mt-4 ml-14">
                <Image
                  src={imagePreview}
                  alt="Image preview"
                  width={500}
                  height={300}
                  className="rounded-lg object-cover w-full h-auto"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
             {linkValue && (
                <div className="relative mt-2 ml-14 rounded-md border bg-muted p-3 pr-10">
                    <p className="text-sm text-muted-foreground">Link attached:</p>
                    <a href={linkValue} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                        {linkValue}
                    </a>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8"
                        onClick={clearLink}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {form.formState.errors.content && (
                 <p className="text-sm text-destructive mt-2 ml-14">{form.formState.errors.content.message}</p>
            )}
          </CardHeader>
          <CardFooter className="flex justify-between p-4 border-t">
            <div className="flex gap-2">
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => imageInputRef.current?.click()}
                title="Add photo"
              >
                <ImageIcon className={cn("h-5 w-5 text-green-500", imagePreview && "text-primary")}/>
              </Button>
               <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" title="Attach link">
                      <Link2 className={cn("h-5 w-5 text-blue-500", linkValue && "text-primary")} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Attach a link</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddLink}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="linkUrl" className="text-right">URL</Label>
                                <Input id="linkUrl" name="linkUrl" placeholder="https://example.com" className="col-span-3" defaultValue={linkValue} />
                            </div>
                            {form.formState.errors.link && <p className="text-sm text-destructive col-span-4 text-center">{form.formState.errors.link.message}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Link</Button>
                        </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleSummarize}
                disabled={isSummarizing}
                title="Summarize with AI"
              >
                {isSummarizing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                ) : (
                  <Sparkles className="h-5 w-5 text-purple-500" />
                )}
                <span className="sr-only">Summarize</span>
              </Button>
            </div>
            <Button type="submit" disabled={isPosting}>
              {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post
            </Button>
          </CardFooter>
        </form>
      </Card>
      <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generated Summary</AlertDialogTitle>
            <AlertDialogDescription>{summary}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                form.setValue('content', summary);
                setShowSummaryDialog(false);
              }}
            >
              Use Summary
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
