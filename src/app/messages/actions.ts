'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  addDoc,
  orderBy,
  limit,
  startAfter,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';

// Re-using UserProfile from friends/actions to avoid duplication
type UserProfile = {
  uid: string;
  name: string;
  avatarUrl: string;
  email?: string | null;
};

export type Conversation = {
  id: string;
  participants: string[];
  participantProfiles: UserProfile[];
  lastMessage: string | null;
  lastMessageTimestamp: any | null; // Firestore timestamp
};

export type Message = {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  timestamp: any; // Firestore timestamp
};

async function getUserProfiles(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('uid', 'in', userIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserProfile);
}

// Gets a conversation between two users, creating it if it doesn't exist.
export async function getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const conversationsRef = collection(db, 'conversations');
    // Query for a conversation that contains both participants
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUserId)
    );
    
    const querySnapshot = await getDocs(q);
    let existingConversation = null;

    querySnapshot.forEach(doc => {
        const conversation = doc.data();
        if(conversation.participants.includes(otherUserId) && conversation.participants.length === 2) {
            existingConversation = { id: doc.id, ...conversation };
        }
    });

    if (existingConversation) {
        return existingConversation.id;
    } else {
        // Create a new conversation
        const newConversationRef = await addDoc(conversationsRef, {
            participants: [currentUserId, otherUserId],
            lastMessage: "Conversation started.",
            lastMessageTimestamp: serverTimestamp(),
        });
        return newConversationRef.id;
    }
}


export async function sendMessage(conversationId: string, senderId: string, message: { text?: string; imageUrl?: string }, senderProfile: UserProfile) {
  if (!message.text?.trim() && !message.imageUrl) {
    throw new Error('Message cannot be empty.');
  }

  const batch = writeBatch(db);

  // 1. Add new message to the messages subcollection
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const newMessageRef = doc(messagesRef);

  const messagePayload: {
      senderId: string;
      timestamp: any;
      text?: string;
      imageUrl?: string;
    } = {
    senderId,
    timestamp: serverTimestamp(),
  }

  if (message.text) messagePayload.text = message.text;
  if (message.imageUrl) messagePayload.imageUrl = message.imageUrl;

  batch.set(newMessageRef, messagePayload);

  // 2. Update the last message on the conversation document
  const conversationRef = doc(db, 'conversations', conversationId);
  const lastMessageText = message.text ? message.text : '[Image]';
  batch.update(conversationRef, {
    lastMessage: lastMessageText,
    lastMessageTimestamp: serverTimestamp(),
  });

  // 3. Create a notification for the other participant
  const conversationDoc = await getDoc(conversationRef);
  const participants = conversationDoc.data()?.participants;
  const otherParticipantId = participants.find((p: string) => p !== senderId);

  if (otherParticipantId) {
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
          userId: otherParticipantId,
          type: 'NEW_MESSAGE',
          fromUserId: senderId,
          fromUserName: senderProfile.name,
          fromUserAvatar: senderProfile.avatarUrl,
          relatedId: conversationId,
          read: false,
          timestamp: serverTimestamp(),
      });
  }


  await batch.commit();
}


export async function editMessage(conversationId: string, messageId: string, newText: string, currentUserId: string) {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists() || messageDoc.data().senderId !== currentUserId) {
        throw new Error("You don't have permission to edit this message.");
    }
    await updateDoc(messageRef, { text: newText });
}


export async function deleteMessage(conversationId: string, messageId: string, currentUserId: string) {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists() || messageDoc.data().senderId !== currentUserId) {
        throw new Error("You don't have permission to delete this message.");
    }
    await deleteDoc(messageRef);
}
