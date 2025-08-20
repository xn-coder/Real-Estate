
'use server'

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateUserId } from '@/lib/utils';

export async function uploadFile(file: File): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  try {
    const fileId = generateUserId("FILE");
    const storageRef = ref(storage, `uploads/${fileId}-${file.name}`);
    
    await uploadBytes(storageRef, file);
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw new Error("File upload failed.");
  }
}
