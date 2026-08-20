import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  linkGuestAccount,
  signIn,
  signInAsGuest,
  signOut as signOutWrapper,
  signUp,
} from '../auth';
import { auth } from '../firebase';

// Mock our own firebase.ts too, not just firebase/auth — otherwise
// importing it still pulls in the real Firebase SDK's module chain
// (firebase/app -> @firebase/component -> @firebase/util), which mixes
// ESM and CJS builds in a way Jest's default transform can't parse. This
// is a unit test of our wrapper functions' call-forwarding, so nothing
// here should touch the real SDK at all.
jest.mock('../firebase', () => ({ auth: { __mockAuth: true } }));

jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn(() => ({ __credential: true })) },
  createUserWithEmailAndPassword: jest.fn(),
  linkWithCredential: jest.fn(),
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

  it('linkGuestAccount links the credentials to the existing account', () => {
    const guest = { uid: 'guest-1' } as User;

    linkGuestAccount(guest, 'a@b.com', 'password123');

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('a@b.com', 'password123');
    expect(linkWithCredential).toHaveBeenCalledWith(guest, { __credential: true });
  });
});
