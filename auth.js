function initAuthGuard(requireAuth = false) {
  firebase.auth().onAuthStateChanged(user => {
    const span = document.getElementById('user-info');
    if (span) span.textContent = user ? (user.displayName || user.email) : '';
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');
    const logoutLink = document.getElementById('logout-link');
    if (loginLink) loginLink.style.display = user ? 'none' : 'inline';
    if (signupLink) signupLink.style.display = user ? 'none' : 'inline';
    if (logoutLink) logoutLink.style.display = user ? 'inline' : 'none';
    const page = location.pathname.split('/').pop();
    const authPages = ['login.html', 'signup.html'];
    if (!user && requireAuth) {
      window.location.href = 'login.html';
    } else if (user && authPages.includes(page)) {
      window.location.href = 'map.html';
    }
  });
}

function register(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const age = parseInt(document.getElementById('age').value, 10);
  const gender = document.getElementById('gender').value;
  const policyAccepted = document.getElementById('policy-check')?.checked;
  const policyErr = document.getElementById('policy-error');
  if (policyErr) policyErr.style.display = 'none';
  if (!policyAccepted) {
    if (policyErr) policyErr.style.display = 'block';
    else alert("Vous devez accepter la politique d'utilisation.");
    return;
  }
  if (age < 18) {
    alert('Vous devez avoir au moins 18 ans.');
    return;
  }
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(cred => {
      return Promise.all([
        cred.user.updateProfile({ displayName: name }),
        firebase.firestore().collection('users').doc(cred.user.uid).set({
          uid: cred.user.uid,
          nom: name,
          email: cred.user.email,
          age,
          genre,
          photoURL: cred.user.photoURL || null
        })
      ]);
    })
    .then(() => {
      window.location.href = 'map.html';
    })
    .catch(err => alert(err.message));
}

function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = 'map.html';
    })
    .catch(err => alert(err.message));
}

function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      return firebase.firestore().collection('users').doc(user.uid).set({
        uid: user.uid,
        nom: user.displayName || '',
        email: user.email,
        age: null,
        genre: null,
        photoURL: user.photoURL || null
      }, { merge: true });
    })
    .then(() => {
      window.location.href = 'map.html';
    })
    .catch(err => alert(err.message));
}
