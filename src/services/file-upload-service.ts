
'use server'

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateUserId } from '@/lib/utils';

export async function uploadFile(file: File, path: string): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  try {
    const fileId = generateUserId("FILE");
    const fileRef = ref(storage, `${path}/${fileId}-${file.name}`);
    
    await uploadBytes(fileRef, file);
    
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw new Error("File upload failed.");
  }
}
