import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase from a base64 encoded service account JSON 
// or from separate environment variables.
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('[Firebase] Initialized successfully');
  } catch (err) {
    console.error('[Firebase] Initialization error (ensure env vars are set):', err.message);
  }
}

export const db = getFirestore();
