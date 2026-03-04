import { Middleware } from '@reduxjs/toolkit';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '../../firebase';
import { AppUser } from '../../model/model';
import { initializeUserData, logout, setUser, setUserData } from '../slices/authSlice';

let isListenerInitialized = false;

export const authMiddleware: Middleware = (store) => {
  if (!isListenerInitialized) {
    isListenerInitialized = true;
    let unsubscribeSnapshot: (() => void) | undefined;

    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        store.dispatch(setUser(firebaseUser));
        (store.dispatch as (action: unknown) => unknown)(initializeUserData(firebaseUser));

        const userRef = doc(db, 'users', firebaseUser.uid);

        unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as AppUser;
            store.dispatch(setUserData(userData));
          }
        });
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = undefined;
        }
        store.dispatch(logout());
      }
    });
  }

  return (next) => (action) => next(action);
};
