'use client';

import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';

// Centralized client-side image upload function
export async function clientUploadImage(fileDataUrl: string, userId: string, type: 'post' | 'avatar' | 'cover' | 'story' | 'chat'): Promise<string> {
    if (!userId) throw new Error("User not authenticated for upload.");
    
    try {
        const folder = type;
        const fileName = uuidv4();
        const filePath = `${folder}/${userId}/${fileName}`;
        
        const fileRef = storageRef(storage, filePath);

        const snapshot = await uploadString(fileRef, fileDataUrl, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;

    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image. Check storage rules.');
    }
};
