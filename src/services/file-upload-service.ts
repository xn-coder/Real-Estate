
'use server'

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateUserId } from '@/lib/utils';

export async function uploadFile(formData: FormData): Promise<string> {
  const file = formData.get('file') as File;
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  try {
    const fileId = generateUserId("FILE");
    // Sanitize filename to prevent path issues
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const storageRef = ref(storage, `uploads/${fileId}-${sanitizedFileName}`);
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    await uploadBytes(storageRef, arrayBuffer, {
      contentType: file.type,
    });
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw new Error("File upload failed.");
  }
}
