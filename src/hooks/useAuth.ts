import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';

interface AuthState {
  user: User | null;
  initializing: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, initializing: true });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState({ user, initializing: false });
    });
  }, []);

  return state;
}
