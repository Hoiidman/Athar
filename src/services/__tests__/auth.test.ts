import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { signIn, signInAsGuest, signOut as signOutWrapper, signUp } from '../auth';
import { auth } from '../firebase';

// Mock our own firebase.ts too, not just firebase/auth — otherwise
// importing it still pulls in the real Firebase SDK's module chain
// (firebase/app -> @firebase/component -> @firebase/util), which mixes
// ESM and CJS builds in a way Jest's default transform can't parse. This
// is a unit test of our wrapper functions' call-forwarding, so nothing
// here should touch the real SDK at all.
jest.mock('../firebase', () => ({ auth: { __mockAuth: true } }));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
}));

describe('auth service', () => {
  it('signUp calls createUserWithEmailAndPassword with the given credentials', () => {
    signUp('a@b.com', 'password123');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'a@b.com', 'password123');
  });

  it('signIn calls signInWithEmailAndPassword with the given credentials', () => {
    signIn('a@b.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'a@b.com', 'password123');
  });

  it('signInAsGuest calls signInAnonymously', () => {
    signInAsGuest();
    expect(signInAnonymously).toHaveBeenCalledWith(auth);
  });

  it('signOut calls the Firebase signOut', () => {
    signOutWrapper();
    expect(signOut).toHaveBeenCalledWith(auth);
  });
});
