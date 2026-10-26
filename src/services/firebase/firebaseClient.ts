import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import type { EventPlanWorkspace, UserProfileSettings } from '../../types/event';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'doc_default';
}

export async function saveUserProfileToFirestore(profile: UserProfileSettings): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) return;
  const uid = sanitizeId(profile.uid);
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const payload = {
      uid,
      name: (profile.name || 'Event Planner').slice(0, 120),
      email: (profile.email || auth.currentUser.email || 'user@example.com').slice(0, 254),
      currency: profile.currency || 'INR',
      country: (profile.country || 'India').slice(0, 80),
      timezone: (profile.timezone || 'Asia/Kolkata').slice(0, 80),
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);

    const prefRef = doc(db, 'users', uid, 'preferences', 'default');
    const prefSnap = await getDoc(prefRef);
    await setDoc(prefRef, {
      ownerId: uid,
      defaultStyle: 'Traditional',
      reminderLeadDays: Math.max(0, Math.min(365, Number(profile.reminderLeadDays) || 7)),
      aiPrivacyConsent: Boolean(profile.aiPrivacyConsent),
      createdAt: prefSnap.exists() ? prefSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserProfileFromFirestore(uid: string): Promise<UserProfileSettings | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return null;
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    const snap = await getDoc(doc(db, 'users', safeUid));
    if (!snap.exists()) return null;
    const data = snap.data();

    let reminderLeadDays = 7;
    let aiPrivacyConsent = true;
    try {
      const prefSnap = await getDoc(doc(db, 'users', safeUid, 'preferences', 'default'));
      if (prefSnap.exists()) {
        const prefData = prefSnap.data();
        if (typeof prefData.reminderLeadDays === 'number') {
          reminderLeadDays = prefData.reminderLeadDays;
        }
        if (typeof prefData.aiPrivacyConsent === 'boolean') {
          aiPrivacyConsent = prefData.aiPrivacyConsent;
        }
      }
    } catch {
      // Fall back to defaults if preference doc does not exist yet
    }

    return {
      uid: data.uid,
      name: data.name || 'Planner',
      email: data.email || '',
      currency: data.currency || 'INR',
      country: data.country || 'India',
      timezone: data.timezone || 'Asia/Kolkata',
      reminderLeadDays,
      aiPrivacyConsent,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveEventToFirestore(event: EventPlanWorkspace): Promise<void> {
  if (!auth.currentUser || event.isDemo) return;
  const uid = auth.currentUser.uid;
  const eventId = sanitizeId(event.id);
  const path = `events/${eventId}`;

  try {
    const ref = doc(db, 'events', eventId);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().ownerId !== uid) {
      throw new Error('Unauthorized: Cannot modify an event owned by another user.');
    }
    const workspaceJson = JSON.stringify({ ...event, ownerId: uid }).slice(0, 440000);
    await setDoc(ref, {
      ownerId: uid,
      title: (event.title || 'Untitled Event').slice(0, 160),
      eventType: (event.eventType || 'Wedding').slice(0, 60),
      status: event.status || 'Planning',
      eventDate: (event.eventDate || '2026-12-15').slice(0, 40),
      city: (event.city || 'Kolkata').slice(0, 120),
      venueName: (event.venueName || 'TBD').slice(0, 160),
      venueType: event.venueType || 'Indoor',
      guestCount: Math.max(0, Math.min(100000, Number(event.guestCount) || 0)),
      totalBudget: Math.max(0, Math.min(10000000000, Number(event.totalBudget) || 0)),
      currency: event.currency || 'INR',
      workspaceJson,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserEventsFromFirestore(uid: string): Promise<EventPlanWorkspace[]> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return [];
  const path = 'events';
  try {
    const q = query(collection(db, 'events'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const loaded: EventPlanWorkspace[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.ownerId === uid && data.workspaceJson) {
        try {
          const parsed = JSON.parse(data.workspaceJson) as EventPlanWorkspace;
          loaded.push({ ...parsed, id: docSnap.id, ownerId: uid, isDemo: false });
        } catch {
          // ignore malformed JSON
        }
      }
    });
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const safeId = sanitizeId(eventId);
  const path = `events/${safeId}`;
  try {
    const ref = doc(db, 'events', safeId);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().ownerId !== uid) {
      throw new Error('Unauthorized: Cannot delete an event owned by another user.');
    }
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
};
