'use client';

import { useState, useEffect, useRef } from 'react';
import { type User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { getFriends, type UserProfile } from '@/app/friends/actions';
import { sendMessage, getOrCreateConversation, type Message, editMessage, deleteMessage } from '@/app/messages/actions';
import { clientUploadImage } from '@/lib/client-uploads';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Loader2,
  MessageSquare,
  Paperclip,
  X,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';

type DisplayConversation = {
  id: string;
  otherParticipant: UserProfile;
  lastMessage: string | null;
  lastMessageTimestamp: { seconds: number; nanoseconds: number; } | null;
  online?: boolean;
};

type ChatLayoutProps = {
  currentUser: User;
  currentUserProfile: UserProfile;
};

export function ChatLayout({ currentUser, currentUserProfile }: ChatLayoutProps) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<DisplayConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DisplayConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  
  // Edit/Delete State
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedText, setEditedText] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    getFriends(currentUser.uid).then(friends => {
      setFriends(friends);
      setLoading(false);
    });
  }, [currentUser]);

  useEffect(() => {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convosPromises = snapshot.docs.map(async (docData) => {
        const convo = { id: docData.id, ...docData.data() } as Omit<Conversation, 'participantProfiles'>;
        const otherParticipantId = convo.participants.find(p => p !== currentUser.uid);
        
        if (otherParticipantId) {
          const userDocRef = doc(db, 'users', otherParticipantId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            return {
              id: convo.id,
              otherParticipant: userDoc.data() as UserProfile,
              lastMessage: convo.lastMessage,
              lastMessageTimestamp: convo.lastMessageTimestamp,
            } as DisplayConversation;
          }
        }
        return null;
      });

      const resolvedConvos = (await Promise.all(convosPromises)).filter(c => c !== null) as DisplayConversation[];
      
      resolvedConvos.sort((a, b) => {
          if (!a.lastMessageTimestamp) return 1;
          if (!b.lastMessageTimestamp) return -1;
          return b.lastMessageTimestamp.seconds - a.lastMessageTimestamp.seconds;
      });

      setConversations(resolvedConvos);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedConversation) return;

    const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSelectConversation = async (friend: UserProfile) => {
    if (selectedConversation?.otherParticipant.uid === friend.uid) return;
    setIsConversationLoading(true);
    setMessages([]);
    try {
        const conversationId = await getOrCreateConversation(currentUser.uid, friend.uid);
        const conversationDocRef = doc(db, 'conversations', conversationId);
        const convoSnapshot = await getDoc(conversationDocRef);
        if(convoSnapshot.exists()) {
           setSelectedConversation({
             id: conversationId,
             otherParticipant: friend,
             lastMessage: convoSnapshot.data().lastMessage,
             lastMessageTimestamp: convoSnapshot.data().lastMessageTimestamp,
           });
        }
    } catch (error) {
        console.error("Error selecting conversation:", error);
    } finally {
        setIsConversationLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || (!newMessage.trim() && !imagePreview)) return;

    setIsSending(true);
    try {
      let imageUrl: string | undefined;
      if (imagePreview) {
        imageUrl = await clientUploadImage(imagePreview, currentUser.uid, 'chat');
      }

      await sendMessage(selectedConversation.id, currentUser.uid, { text: newMessage, imageUrl }, currentUserProfile);
      setNewMessage('');
      setImagePreview(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const startEditing = (message: Message) => {
      setEditingMessage(message);
      setEditedText(message.text || "");
  }

  const handleEditMessage = async () => {
      if (!editingMessage || !selectedConversation) return;

      try {
          await editMessage(selectedConversation.id, editingMessage.id, editedText, currentUser.uid);
          setEditingMessage(null);
          setEditedText("");
          toast({ title: "Success", description: "Message updated." });
      } catch (error) {
          toast({ title: "Error", description: "Failed to edit message.", variant: "destructive" });
      }
  }

  const handleDeleteMessage = async () => {
    if (!deletingMessageId || !selectedConversation) return;
    try {
        await deleteMessage(selectedConversation.id, deletingMessageId, currentUser.uid);
        setDeletingMessageId(null);
        toast({ title: "Success", description: "Message deleted." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete message.", variant: "destructive" });
    }
  };


  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  const filteredConversations = conversations.filter(convo =>
    convo.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <div className="h-full w-full flex border-t">
      <aside className={cn(
          "w-full md:w-80 border-r flex flex-col transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          selectedConversation ? "-translate-x-full" : "translate-x-0"
      )}>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search friends..." 
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 && <p className="p-2 text-xs font-semibold text-muted-foreground">Active Conversations</p>}
          {filteredConversations.map((convo) => (
            <div
              key={convo.id}
              onClick={() => handleSelectConversation(convo.otherParticipant)}
              className={cn(
                'flex items-center gap-3 p-3 cursor-pointer hover:bg-muted',
                selectedConversation?.id === convo.id && 'bg-muted'
              )}
            >
              <Avatar className="relative h-12 w-12">
                <AvatarImage src={convo.otherParticipant.avatarUrl} alt={convo.otherParticipant.name} data-ai-hint="person" />
                <AvatarFallback>{convo.otherParticipant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="font-semibold">{convo.otherParticipant.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {convo.lastMessage}
                </p>
              </div>
            </div>
          ))}
           {filteredFriends.length > 0 && <p className="p-2 text-xs font-semibold text-muted-foreground border-t">Friends</p>}
           {filteredFriends.map((friend) => (
             !conversations.some(c => c.otherParticipant.uid === friend.uid) &&
                <div
                key={friend.uid}
                onClick={() => handleSelectConversation(friend)}
                className='flex items-center gap-3 p-3 cursor-pointer hover:bg-muted'
                >
                <Avatar className="relative h-12 w-12">
                    <AvatarImage src={friend.avatarUrl} alt={friend.name} data-ai-hint="person" />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                    <p className="font-semibold">{friend.name}</p>
                    <p className="text-sm text-muted-foreground truncate">Click to start a conversation</p>
                </div>
                </div>
           ))}
        </div>
      </aside>

      <section className={cn(
          "absolute top-0 left-0 h-full w-full md:relative flex flex-col transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          selectedConversation ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedConversation ? (
          <>
            <header className="p-4 border-b flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                 <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
                    <ArrowLeft className="h-5 w-5" />
                 </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.otherParticipant.avatarUrl} alt={selectedConversation.otherParticipant.name} data-ai-hint="person" />
                  <AvatarFallback>{selectedConversation.otherParticipant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedConversation.otherParticipant.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon"><Phone /></Button>
                <Button variant="ghost" size="icon"><Video /></Button>
                <Button variant="ghost" size="icon"><MoreVertical /></Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-background">
              {isConversationLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-end gap-2 group',
                    msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'
                  )}
                >
                    {msg.senderId === currentUser?.uid && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {msg.text && (
                                <DropdownMenuItem onClick={() => startEditing(msg)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setDeletingMessageId(msg.id)} className="text-red-500">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  {msg.senderId !== currentUser?.uid && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={selectedConversation.otherParticipant.avatarUrl} alt={selectedConversation.otherParticipant.name} data-ai-hint="person" />
                      <AvatarFallback>{selectedConversation.otherParticipant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-3 py-2 md:px-4',
                      msg.senderId === currentUser?.uid
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                  >
                    {msg.imageUrl && <Image src={msg.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md mb-2 h-auto" data-ai-hint="photo message" />}
                    {msg.text && <p className="break-words">{msg.text}</p>}
                  </div>
                </div>
              ))}
               <div ref={messagesEndRef} />
            </div>

            <footer className="p-2 md:p-4 border-t bg-card">
              <form className="flex items-center gap-2 md:gap-4" onSubmit={handleSendMessage}>
                {imagePreview && (
                    <div className="relative p-2">
                        <Image src={imagePreview} alt="Preview" width={48} height={48} className="rounded-md" />
                        <Button variant="destructive" size="icon" className="absolute -top-1 -right-1 h-5 w-5 rounded-full" onClick={() => setImagePreview(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}
                <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageChange} />
                <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isSending}>
                    <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending || (!newMessage.trim() && !imagePreview)}>
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-background">
            <MessageSquare size={64} className="mb-4" />
            <h2 className="text-xl font-semibold">Select a conversation</h2>
            <p>Start a new chat by selecting a friend from the list on the left.</p>
          </div>
        )}
      </section>
    </div>
    {/* Edit Dialog */}
     <Dialog open={!!editingMessage} onOpenChange={(isOpen) => !isOpen && setEditingMessage(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Message</DialogTitle>
            </DialogHeader>
            <Textarea 
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="my-4"
            />
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleEditMessage}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
     </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={!!deletingMessageId} onOpenChange={(isOpen) => !isOpen && setDeletingMessageId(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
            </DialogHeader>
            <p>This will permanently delete your message.</p>
            <DialogFooter>
                 <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={handleDeleteMessage}>Delete</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
