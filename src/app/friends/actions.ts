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
  deleteDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  addDoc,
  setDoc,
} from 'firebase/firestore';

// This type will be useful for returning user data
export type UserProfile = {
  uid: string;
  name: string;
  avatarUrl: string;
  email?: string | null;
};

// Function to fetch basic user profiles. Useful for displaying friend info.
async function getUserProfiles(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('uid', 'in', userIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function getFriendRequests(userId: string) {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(requestsRef, where('to', '==', userId), where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);

  const requestersIds = querySnapshot.docs.map(doc => doc.data().from);
  if(requestersIds.length === 0) return [];
  
  const requestersProfiles = await getUserProfiles(requestersIds);

  return querySnapshot.docs.map(doc => {
      const requester = requestersProfiles.find(p => p.uid === doc.data().from);
      return {
          id: doc.id,
          from: doc.data().from,
          ...requester
      };
  });
}

export async function getFriends(userId: string) {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const userData = userDoc.data();
    const friendIds = userData.friends || [];
    if (friendIds.length > 0) {
      return await getUserProfiles(friendIds);
    }
  }
  return [];
}


export async function respondToFriendRequest(
  requestingUserId: string,
  currentUserId: string,
  action: 'accept' | 'decline'
) {
  const requestDocRef = doc(db, 'friendRequests', `${requestingUserId}_${currentUserId}`);

  if (action === 'accept') {
    const batch = writeBatch(db);
    
    // 1. Add each user to the other's friends list
    const currentUserDocRef = doc(db, 'users', currentUserId);
    batch.update(currentUserDocRef, { friends: arrayUnion(requestingUserId) });
    
    const requestingUserDocRef = doc(db, 'users', requestingUserId);
    batch.update(requestingUserDocRef, { friends: arrayUnion(currentUserId) });
    
    // 2. Delete the friend request
    batch.delete(requestDocRef);
    
    await batch.commit();

  } else { // decline
    await deleteDoc(requestDocRef);
  }
}

export async function sendFriendRequest(targetUserId: string, currentUserId: string, currentUserProfile: UserProfile) {
    if (targetUserId === currentUserId) throw new Error("You cannot send a friend request to yourself.");

    const requestDocRef = doc(db, 'friendRequests', `${currentUserId}_${targetUserId}`);
    const requestDoc = await getDoc(requestDocRef);

    if (requestDoc.exists()) throw new Error("Friend request already sent.");
    
    const batch = writeBatch(db);

    // 1. Create the friend request document
    batch.set(requestDocRef, {
        from: currentUserId,
        to: targetUserId,
        status: 'pending',
        timestamp: serverTimestamp(),
    });

    // 2. Create a notification for the target user
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
        userId: targetUserId,
        type: 'FRIEND_REQUEST',
        fromUserId: currentUserId,
        fromUserName: currentUserProfile.name,
        fromUserAvatar: currentUserProfile.avatarUrl,
        read: false,
        timestamp: serverTimestamp()
    });
    
    await batch.commit();
}
