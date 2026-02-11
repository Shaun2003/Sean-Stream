'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';

export type Notification = {
    id: string;
    userId: string;
    type: 'FRIEND_REQUEST' | 'NEW_MESSAGE' | 'POST_LIKE';
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar: string;
    relatedId?: string; // e.g., postId or conversationId
    read: boolean;
    timestamp: any;
};

export async function getNotifications(userId: string): Promise<Notification[]> {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}

export async function markNotificationsAsRead(notificationIds: string[]) {
    if (notificationIds.length === 0) return;
    
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
        const notifRef = doc(db, 'notifications', id);
        batch.update(notifRef, { read: true });
    });

    await batch.commit();
}
