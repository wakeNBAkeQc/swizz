

const PROFILE_STORAGE_KEY = 'profilInfo';

async function loadUserInfo() {
    // Always attempt to read cached info first so the profile page retains
    // the last values even when the user is logged out or offline.
    const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
    const localInfo = cached ? JSON.parse(cached) : {};

    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !window.db) return localInfo;
    try {
        const doc = await db.collection('profils').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            const info = {
                name: data.nom || '',
                age: data.age || '',
                gender: data.genre || '',
                photo: data.photoURL || null
            };
            // Update local cache so future loads work without Firestore.
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(info));
            return info;
        }
    } catch (err) {
        console.error('loadUserInfo error:', err);
    }
    return localInfo;
}

async function saveUserInfo(info) {
    // Persist info locally so it is restored on next visit even before
    // Firebase data loads.
    try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(info));
    } catch (_) {}

    const uid = firebase.auth().currentUser?.uid;
    if (uid && window.db) {
        try {
            await db.collection('profils').doc(uid).set({
                nom: info.name,
                age: parseInt(info.age, 10) || null,
                genre: info.gender,
                photoURL: info.photo || null
            }, { merge: true });
        } catch (err) {
            console.error('saveUserInfo error:', err);
        }
    }
    if (userMarker && userIndex !== null && mapPins[userIndex]) {
        const p = mapPins[userIndex];
        p.name = info.name;
        p.age = info.age;
        p.gender = info.gender;
        p.photo = info.photo;
        userMarker.setPopupContent(popupHtml(p, userIndex));
    }
}

async function getPins() {
    if (!window.db) return [];
    try {
        const snap = await db.collection('pins').get();
        return snap.docs.map(pinFromDoc);
    } catch (err) {
        console.error('getPins error:', err);
        return [];
    }
}

function savePins() {
    // pins are stored directly in Firestore; no-op
}


async function syncUserInfoFromFirestore() {
    return loadUserInfo();
}

let userMarker = null;
let markers = [];
let mapPins = [];
let userIndex = null;
let mapInstance = null;

function pinFromDoc(doc) {
    const data = doc.data();
    const snap = data.profilSnapshot || {};
    return {
        id: doc.id,
        uid: data.uid || doc.id,
        lat: data.lat,
        lng: data.lng,
        name: snap.nom || '',
        age: snap.age || '',
        gender: snap.genre || '',
        photo: snap.photoURL || null,
        lastSeen: data.timestamp || null
    };
}

async function fetchFirestorePins() {
    if (!window.db) return [];
    try {
        const snap = await db.collection('pins').get();
        return snap.docs.map(pinFromDoc);
    } catch (err) {
        console.error('Failed to fetch pins from Firestore:', err);
        return [];
    }
}

async function syncPinsFromFirestore() {
    if (!window.db) return null;
    try {
        const snap = await db.collection('pins').get();
        const remotePins = snap.docs.map(pinFromDoc);
        mapPins = remotePins;
        const uid = firebase.auth().currentUser?.uid;
        userIndex = uid ? remotePins.findIndex(p => p.id === uid) : null;
        return remotePins;
    } catch (err) {
        console.error('syncPinsFromFirestore error:', err);
        return null;
    }
}

async function loadFavorites() {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !window.db) return [];
    try {
        const doc = await db.collection('profils').doc(uid).get();
        return doc.exists && Array.isArray(doc.data().favPins) ? doc.data().favPins : [];
    } catch (err) {
        console.error('loadFavorites error:', err);
        return [];
    }
}

async function saveFavorites(favs) {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !window.db) return;
    try {
        await db.collection('profils').doc(uid).set({ favPins: favs }, { merge: true });
    } catch (err) {
        console.error('saveFavorites error:', err);
    }
}

async function loadMessages() {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !window.db) return {};
    try {
        const doc = await db.collection('profils').doc(uid).get();
        return doc.exists && doc.data().messages ? doc.data().messages : {};
    } catch (err) {
        console.error('loadMessages error:', err);
        return {};
    }
}

async function saveMessages(msgs) {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !window.db) return;
    try {
        await db.collection('profils').doc(uid).set({ messages: msgs }, { merge: true });
    } catch (err) {
        console.error('saveMessages error:', err);
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function logoutUser() {
    if (window.firebase?.auth) {
        firebase.auth().signOut().catch(() => {});
    }
    // Do not clear user data so profile details and markers remain after logout
    window.location.href = 'login.html';
}

async function cleanupPins() {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !window.db) return;
    const pins = mapPins.length ? mapPins : await getPins();
    const idx = pins.findIndex(p => p.id === uid);
    userIndex = idx >= 0 ? idx : null;
    if (idx === -1) {
        try {
            await db.collection('pins').doc(uid).delete();
            const snap = await db.collection('pins').where('uid', '==', uid).get();
            const promises = [];
            snap.forEach(doc => {
                if (doc.id !== uid) promises.push(doc.ref.delete());
            });
            await Promise.all(promises);
        } catch (_) {
            // ignore cleanup errors
        }
    }
}


function toJsDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
    }
    return null;
}

function formatLastSeen(lastSeen) {
    const date = toJsDate(lastSeen);
    if (!date) return "Vu il y a plus d'une semaine";
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 2) return 'En ligne maintenant';
    if (diffMin < 60) return `Vu il y a ${diffMin} minutes`;
    if (diffMin < 1440) return `Vu il y a ${Math.floor(diffMin / 60)} heures`;
    if (diffMin < 10080) return `Vu il y a ${Math.floor(diffMin / 1440)} jours`;
    return "Vu il y a plus d'une semaine";
}

function popupHtml(p, idx) {
    const img = p.photo ? `<img src="${p.photo}" class="popup-photo">` : '';
    const likes = p.likes || 0;
    const likeBtn = `<button class="like-btn" data-index="${idx}">Like (${likes})</button>`;
    const favBtn = idx !== userIndex ? `<button class="fav-btn" data-index="${idx}" data-id="${p.id}">❤️ Ajouter aux favoris</button>` : '';
    const msgBtn = idx !== userIndex ? `<button class="msg-btn" data-index="${idx}" data-id="${p.id}">Envoyer un message</button>` : '';
    const removeBtn = idx === userIndex ? `<button class="button remove-pin-btn">Supprimer ce pin</button>` : '';

    const label = formatLastSeen(p.lastSeen);
    const online = label === 'En ligne maintenant';
    const status = `<span class="status-indicator" title="Dernière activité">${online ? '🟢' : '🕒'} ${label}</span>`;

    let messagesHtml = '';
    if (idx === userIndex) {
        const msgs = loadMessages()[p.id] || [];
        if (msgs.length) {
            messagesHtml = '<div class="messages">' + msgs.map(m => `<p>${escapeHtml(m)}</p>`).join('') + '</div>';
        }
    }

    const name = escapeHtml(p.name || '');
    const age = escapeHtml(String(p.age));
    const gender = escapeHtml(p.gender);
    return `${img}<p><strong>${name}</strong><br>${age} ans – ${gender}</p>${status}${likeBtn}${favBtn}${msgBtn}${removeBtn}${messagesHtml}`;
}

async function initProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    const info = await loadUserInfo();
    if (info.name) form.name.value = info.name;
    if (info.age) form.age.value = info.age;
    if (info.gender) form.gender.value = info.gender;
    let photoData = info.photo || null;
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview && photoData) {
        photoPreview.src = photoData;
        photoPreview.style.display = 'block';
    }
    if (photoInput) {
        photoInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                photoData = reader.result;
                if (photoPreview) {
                    photoPreview.src = photoData;
                    photoPreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        });
    }
    form.addEventListener('submit', async e => {
        e.preventDefault();
        await saveUserInfo({
            name: form.name.value,
            age: form.age.value,
            gender: form.gender.value,
            photo: photoData
        });
        alert('Profil sauvegardé');
    });
}

async function initMap() {
    const pinsFetched = await syncPinsFromFirestore();
    // Determine the current user's pin index only when pins were fetched
    if (pinsFetched) {
        await cleanupPins();
    }


    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    // Montréal coordinates by default
    const map = L.map(mapEl).setView([45.5019, -73.5674], 13);
    mapInstance = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const pins = await getPins();
    mapPins = pins;
    const uid = firebase.auth().currentUser?.uid;
    userIndex = uid ? pins.findIndex(p => p.id === uid) : null;
    markers = [];
    pins.forEach((p, idx) => {
        const marker = L.marker([p.lat, p.lng], {riseOnHover: true}).addTo(map)
            .bindPopup(popupHtml(p, idx));
        markers.push(marker);
        if (idx === userIndex) {
            userMarker = marker;
            marker.on('click', removeUserPin);
        }
    });

    const btn = document.getElementById('remove-pin');
    if (btn) {
        btn.style.display = Number.isNaN(userIndex) ? 'none' : 'block';
    }

    if (!Number.isNaN(userIndex) && pins[userIndex]) {
        pins[userIndex].lastSeen = Date.now();
        savePins(pins);
        const uid = firebase.auth().currentUser?.uid;
        if (uid && window.db) {
            const p = pins[userIndex];
            const snap = {
                nom: p.name,
                age: parseInt(p.age, 10) || null,
                genre: p.gender,
                photoURL: p.photo || null
            };
            db.collection('pins').doc(uid).set({
                uid,
                lat: p.lat,
                lng: p.lng,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                profilSnapshot: snap
            }, { merge: true });
        }
    }

    map.on('popupopen', e => {
        const el = e.popup.getElement();
        const likeBtn = el.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', async () => {
                const idx = parseInt(likeBtn.dataset.index, 10);
                const list = await getPins();
                const pin = list[idx];
                if (!pin) return;
                pin.likes = (pin.likes || 0) + 1;
                likeBtn.textContent = `Like (${pin.likes})`;
                await db.collection('pins').doc(pin.id).set({ likes: pin.likes }, { merge: true });
            });
        }
        const favBtn = el.querySelector('.fav-btn');
        if (favBtn) {
            favBtn.addEventListener('click', async () => {
                const id = favBtn.dataset.id;
                const favs = await loadFavorites();
                if (!favs.includes(id)) {
                    favs.push(id);
                    await saveFavorites(favs);
                    favBtn.textContent = '❤️ Ajouté';
                }
            });
        }
        const msgBtn = el.querySelector('.msg-btn');
        if (msgBtn) {
            msgBtn.addEventListener('click', () => {
                const id = msgBtn.dataset.id;
                openMessageModal(id);
            });
        }
        const removeBtn = el.querySelector('.remove-pin-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeUserPin);
        }
    });

    map.on('click', async e => {
        await cleanupPins();
        const uid = firebase.auth().currentUser?.uid;
        if (!uid) {
            alert('Authentification en cours, veuillez réessayer.');
            return;
        }
        const existing = mapPins.findIndex(p => p.id === uid);
        if (existing >= 0) {
            alert('Vous avez déjà ajouté un pin.');
            return;
        }
        const info = await loadUserInfo();
        if (!info.name || !info.age || !info.gender) {
            alert('Veuillez remplir votre nom, âge et genre dans le profil.');
            window.location.href = 'profil.html';
            return;
        }
        const pinData = { id: uid, name: info.name, age: info.age, gender: info.gender, photo: info.photo, likes: 0 };
        const marker = L.marker(e.latlng, {riseOnHover:true}).addTo(map)
            .bindPopup(popupHtml(pinData, pins.length))
            .openPopup();
        marker.once('add', () => { marker._icon.classList.add('marker-new'); });
        const fullPin = { lat: e.latlng.lat, lng: e.latlng.lng, ...pinData };
        fullPin.lastSeen = Date.now();
        pins.push(fullPin);
        mapPins = pins;
        markers.push(marker);
        if (uid && window.db) {
            try {
                await db.collection('pins').doc(uid).set({
                    uid,
                    lat: fullPin.lat,
                    lng: fullPin.lng,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    profilSnapshot: {
                        nom: info.name,
                        age: parseInt(info.age, 10) || null,
                        genre: info.gender,
                        photoURL: info.photo || null
                    }
                });
            } catch (_) {}
        }
        userMarker = marker;
        userMarker.on('click', removeUserPin);
        const btn = document.getElementById('remove-pin');
        if (btn) btn.style.display = 'block';
    });

    function handleZoom() {
        if (map.getZoom() >= 15) {
            markers.forEach(m => m.openPopup());
        } else {
            markers.forEach(m => m.closePopup());
        }
    }
    map.on('zoomend', handleZoom);
    handleZoom();
}

async function removeUserPin(e) {
    if (e && e.stopPropagation) {
        e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
    }
    const user = firebase.auth().currentUser;
    if (!user || !window.db) {
        alert('Utilisateur non authentifié.');
        return;
    }
    if (!confirm('Supprimer définitivement votre pin ?')) return;
    const uid = user.uid;
    try {
        await db.collection('pins').doc(uid).delete();
        const idx = mapPins.findIndex(p => p.id === uid);
        const pins = (await getPins()).filter(p => p.id !== uid);
        mapPins = pins;
        userIndex = null;
        if (idx >= 0) {
            markers[idx].remove();
            markers.splice(idx, 1);
        }
        if (userMarker) {
            userMarker.remove();
            userMarker = null;
        }
        alert('Pin supprimé');
        location.reload();
    } catch (err) {
        console.error('removeUserPin error:', err);
        alert('Impossible de supprimer le pin.');
    }
}

async function displayRandomProfiles() {
    const container = document.getElementById('profiles');
    if (!container) return;

    const pins = await getPins();
    if (pins.length === 0) {
        container.textContent = 'Aucun profil enregistré.';
        return;
    }
    // Shuffle and take up to 3 profiles
    const sample = pins
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    sample.forEach(p => {
        const div = document.createElement('div');
        div.className = 'profile-card';
        if (p.photo) {
            const img = document.createElement('img');
            img.src = p.photo;
            img.className = 'popup-photo';
            div.appendChild(img);
        }
        const info = document.createElement('p');
        info.textContent = `${p.name} - ${p.age} ans – ${p.gender}`;
        div.appendChild(info);
        const likes = document.createElement('span');
        likes.textContent = `Likes: ${p.likes || 0}`;
        div.appendChild(likes);
        container.appendChild(div);
    });
}

function openMessageModal(id) {
    const modal = document.getElementById('message-modal');
    if (!modal) return;
    modal.style.display = 'block';
    const textarea = modal.querySelector('textarea');
    const sendBtn = modal.querySelector('button');
    textarea.value = '';
    sendBtn.onclick = async () => {
        const text = textarea.value.trim();
        if (text) {
            const msgs = await loadMessages();
            if (!msgs[id]) msgs[id] = [];
            msgs[id].push(escapeHtml(text));
            await saveMessages(msgs);
        }
        modal.style.display = 'none';
    };
}

async function displayFavorites() {
    const container = document.getElementById('fav-list');
    if (!container) return;
    container.innerHTML = '';
    const favs = await loadFavorites();
    const pins = await getPins();
    favs.forEach(id => {
        const p = pins.find(pin => pin.id === id);
        if (!p) return;
        const div = document.createElement('div');
        div.className = 'profile-card';
        if (p.photo) {
            const img = document.createElement('img');
            img.src = p.photo;
            img.className = 'popup-photo';
            div.appendChild(img);
        }
        const info = document.createElement('p');
        info.textContent = `${p.name} - ${p.age} ans – ${p.gender}`;
        div.appendChild(info);
        const likes = document.createElement('span');
        likes.textContent = `Likes: ${p.likes || 0}`;
        div.appendChild(likes);
        const remove = document.createElement('button');
        remove.textContent = 'Retirer';
        remove.className = 'button';
        remove.addEventListener('click', async () => {
            const list = (await loadFavorites()).filter(i => i !== id);
            await saveFavorites(list);
            displayFavorites();
        });
        div.appendChild(remove);
        container.appendChild(div);
    });
}

function applyFilters() {
    const min = parseInt(document.getElementById('filter-age-min').value, 10) || 0;
    const max = parseInt(document.getElementById('filter-age-max').value, 10) || 150;
    const gender = document.getElementById('filter-gender').value;
    const photoOnly = document.getElementById('filter-photo').checked;
    markers.forEach((m, idx) => {
        const p = mapPins[idx];
        let show = true;
        if (p.age < min || p.age > max) show = false;
        if (gender && p.gender !== gender) show = false;
        if (photoOnly && !p.photo) show = false;
        if (show) {
            m.addTo(mapInstance);
        } else {
            m.remove();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('section').forEach(sec => sec.classList.add('fade-section'));
    await syncUserInfoFromFirestore();
    const pinsFetched = await syncPinsFromFirestore();
    if (pinsFetched) {
        await cleanupPins();
    }
    displayRandomProfiles();
    displayFavorites();
    const btn = document.getElementById('remove-pin');
    if (btn) btn.style.display = userIndex !== null ? 'block' : 'none';
    initProfileForm();
    initAuthGuard(document.body.dataset.auth === 'required');
    const removeBtn = document.getElementById('remove-pin');
    if (removeBtn) {
        removeBtn.addEventListener('click', removeUserPin);
    }
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', e => {
            e.preventDefault();
            logoutUser();
        });
    }

    const filters = document.getElementById('filter-menu');
    if (filters) {
        filters.addEventListener('input', applyFilters);
    }

    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

});
