import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signInAsGuest() {
  return signInAnonymously(auth);
}

export function linkGuestAccount(user: User, email: string, password: string) {
  return linkWithCredential(user, EmailAuthProvider.credential(email, password));
}

export function signOut() {
  return firebaseSignOut(auth);
}
