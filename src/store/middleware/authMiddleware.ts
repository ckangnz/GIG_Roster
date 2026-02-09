import { Middleware } from '@reduxjs/toolkit';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '../../firebase';
import { AppUser } from '../../model/model';
import { initializeUserData, logout, setUser, setUserData, setLoading } from '../slices/authSlice';

let isListenerInitialized = false;

export const authMiddleware: Middleware = (store) => {
  if (!isListenerInitialized) {
    isListenerInitialized = true;
    let unsubscribeSnapshot: (() => void) | undefined;

    const isDevelopment = import.meta.env.MODE === 'development';

    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        store.dispatch(setUser(firebaseUser))
          ; (store.dispatch as (action: unknown) => unknown)(initializeUserData(firebaseUser.uid));

        const userRef = doc(db, 'users', firebaseUser.uid);

        unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as AppUser;
            store.dispatch(setUserData(userData));
          }
        });
      } else {
        if (isDevelopment) {
          const mockUser: Partial<User> = {
            uid: 'dev-user-123',
            email: 'dev@example.com',
            displayName: 'Dev User',
          };

          const mockUserData: AppUser = {
            name: 'Dev User',
            email: 'dev@example.com',
            isApproved: true,
            isAdmin: true,
            isActive: true,
            teams: [],
            positions: [],
            gender: '',
          };

          store.dispatch(setUser(mockUser as User));
          store.dispatch(setUserData(mockUserData));
          store.dispatch(setLoading(false));
        } else {
          store.dispatch(logout());
          if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
          }
        }
      }
    });
  }

  return (next) => (action) => next(action);
};
