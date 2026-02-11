
'use server';

import {
  doc,
  updateDoc,
  increment,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  writeBatch,
  deleteDoc,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';


export type PostData = {
  content: string;
  imageUrl?: string;
  linkUrl?: string;
};

export type StoryData = {
  imageUrl: string;
};

export type SimpleUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export async function createPost(postData: PostData, user: SimpleUser) {
  if (!user || !user.uid) {
    throw new Error('You must be logged in to create a post.');
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User profile not found.');
    }
    const userProfile = userDoc.data();

    const handle = `@${(userProfile.name || 'user').toLowerCase().replace(/\s/g, '')}`;

    const postPayload: { [key: string]: any } = {
      userId: user.uid,
      user: {
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl,
        handle: handle,
      },
      content: postData.content,
      timestamp: serverTimestamp(),
      likes: 0,
      comments: 0,
      shares: 0,
    };

    if (postData.imageUrl) {
      postPayload.imageUrl = postData.imageUrl;
    }
    if (postData.linkUrl) {
      postPayload.linkUrl = postData.linkUrl;
    }

    await addDoc(collection(db, 'posts'), postPayload);
  } catch (error) {
    console.error('Error creating post:', error);
    throw new Error('Failed to create post.');
  }
}

export async function createStory(storyData: StoryData, user: SimpleUser) {
  if (!user || !user.uid) {
    throw new Error('You must be logged in to create a story.');
  }

  if (!storyData.imageUrl) {
    throw new Error('Story must have an image.');
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User profile not found.');
    }
    const userProfile = userDoc.data();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Expires in 24 hours

    const storyPayload = {
      userId: user.uid,
      user: {
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl,
      },
      imageUrl: storyData.imageUrl,
      timestamp: serverTimestamp(),
      expiresAt: expiresAt,
    };

    await addDoc(collection(db, 'stories'), storyPayload);
  } catch (error) {
    console.error('Error creating story:', error);
    throw new Error('Failed to create story.');
  }
}

export async function likePost(postId: string, liked: boolean, liker: SimpleUser) {
  if (!liker || !liker.uid) throw new Error("Authentication required to like a post.");
  try {
    const postRef = doc(db, 'posts', postId);
    const batch = writeBatch(db);

    batch.update(postRef, {
      likes: increment(liked ? 1 : -1),
    });

    if (liked) {
      const postDoc = await getDoc(postRef);
      const postData = postDoc.data();
      
      const likerDocRef = doc(db, 'users', liker.uid);
      const likerDoc = await getDoc(likerDocRef);
      const likerProfile = likerDoc.data();

      if (postData && likerProfile && postData.userId !== liker.uid) {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: postData.userId,
          type: 'POST_LIKE',
          fromUserId: liker.uid,
          fromUserName: likerProfile.name,
          fromUserAvatar: likerProfile.avatarUrl,
          relatedId: postId,
          read: false,
          timestamp: serverTimestamp(),
        });
      }
    }
    
    await batch.commit();

  } catch (error) {
    console.error('Error liking post:', error);
    throw new Error('Failed to update like count.');
  }
}

export async function sharePost(postId: string) {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      shares: increment(1),
    });
  } catch (error) {
    console.error('Error sharing post:', error);
    throw new Error('Failed to update share count.');
  }
}

export async function deletePost(postId: string, userId: string) {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
        throw new Error("Post not found.");
    }

    if (postDoc.data().userId !== userId) {
        throw new Error("You don't have permission to delete this post.");
    }

    await deleteDoc(postRef);
}

export async function editPost(postId: string, newContent: string, userId: string) {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
        throw new Error("Post not found.");
    }

    if (postDoc.data().userId !== userId) {
        throw new Error("You don't have permission to edit this post.");
    }

    await updateDoc(postRef, { content: newContent });
}

export async function addComment(postId: string, commentText: string, user: SimpleUser) {
    if (!commentText.trim()) throw new Error("Comment cannot be empty.");

    const batch = writeBatch(db);
    
    // Add comment to subcollection
    const commentRef = doc(collection(db, 'posts', postId, 'comments'));
    batch.set(commentRef, {
        text: commentText,
        userId: user.uid,
        user: {
            name: user.displayName,
            avatarUrl: user.photoURL,
        },
        timestamp: serverTimestamp(),
    });

    // Increment comment count
    const postRef = doc(db, 'posts', postId);
    batch.update(postRef, { comments: increment(1) });
    
    await batch.commit();
}

export type Comment = {
    id: string;
    text: string;
    userId: string;
    user: { name: string | null; avatarUrl: string | null; };
    timestamp: { seconds: number; nanoseconds: number; } | null;
}

export async function getComments(postId: string): Promise<Comment[]> {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Comment));
}
