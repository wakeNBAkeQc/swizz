if (typeof window.firebaseConfig === 'undefined') {
  console.error('Firebase configuration not found.');
} else {
  firebase.initializeApp(window.firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
}
