import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// The site is fully usable without Firebase configured - the guestbook and
// admin panel just fall back to a "not connected" state. This getter avoids
// throwing at import time when env vars are empty (e.g. during a first
// `npm run dev` before the user has created a Firebase project).
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;
let _storage: FirebaseStorage | undefined;

function ensureApp() {
  if (!isFirebaseConfigured) return undefined;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(config);
  }
  return app;
}

export function getDb() {
  const a = ensureApp();
  if (!a) return undefined;
  if (!_db) _db = getFirestore(a);
  return _db;
}

export function getAuthInstance() {
  const a = ensureApp();
  if (!a) return undefined;
  if (!_auth) _auth = getAuth(a);
  return _auth;
}

export function getStorageInstance() {
  const a = ensureApp();
  if (!a) return undefined;
  if (!_storage) _storage = getStorage(a);
  return _storage;
}
