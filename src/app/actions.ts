'use server';

import { summarizePost } from '@/ai/flows/summarize-post';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export async function getSummary(text: string) {
  try {
    const result = await summarizePost({ text });
    return { summary: result.summary };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to summarize the post.' };
  }
}

export async function searchEverything(searchQuery: string) {
    if (!searchQuery) {
        return { users: [], posts: [] };
    }
    
    const lowerCaseQuery = searchQuery.toLowerCase();

    // Search for users
    const usersRef = collection(db, 'users');
    const userQuery = query(
        usersRef,
        where('name_lowercase', '>=', lowerCaseQuery),
        where('name_lowercase', '<=', lowerCaseQuery + '\uf8ff'),
        limit(5)
    );
    const userDocs = await getDocs(userQuery);
    const users = userDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Search for posts (simple substring match, not full-text search)
    // This is not efficient and will not scale well.
    // For a production app, a dedicated search service like Algolia is recommended.
    const postsRef = collection(db, 'posts');
    const allPostsDocs = await getDocs(postsRef);
    const posts = allPostsDocs.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => post.content?.toLowerCase().includes(lowerCaseQuery))
        .slice(0, 5);
        
    return { users, posts };
}
