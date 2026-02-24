/* eslint-disable no-undef */
// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config is injected during build from .env
firebase.initializeApp({
  apiKey: "AIzaSyBrABPwgyh2eahhQZEqjh7vXgNLxtSoOcY",
  authDomain: "gig-roster.firebaseapp.com",
  projectId: "gig-roster",
  storageBucket: "gig-roster.firebasestorage.app",
  messagingSenderId: "770561557903",
  appId: "1:770561557903:web:fbcc85b6e9be1e06b2f7fa"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/GIG_Roster/gig_logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
