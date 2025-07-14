if(!localStorage.getItem("ageVerified") && !location.pathname.endsWith("age.html")){
  window.location.href="age.html";
}

function loadUserInfo() {
    const data = localStorage.getItem('userInfo');
    return data ? JSON.parse(data) : {};
}

function saveUserInfo(info) {
    localStorage.setItem('userInfo', JSON.stringify(info));
    const index = localStorage.getItem('userPinIndex');
    if (index !== null) {
        const pins = getPins();
        if (pins[index]) {
            pins[index].age = info.age;
            pins[index].gender = info.gender;
            pins[index].photo = info.photo;
            savePins(pins);
            if (userMarker) {
                userMarker.setPopupContent(popupHtml(pins[index], parseInt(index, 10)));
            }
        }
    }
}

function getPins() {
    return JSON.parse(localStorage.getItem('pins') || '[]');
}

function savePins(pins) {
    localStorage.setItem('pins', JSON.stringify(pins));
}

let userMarker = null;
let markers = [];
let mapPins = [];
let userIndex = null;
let mapInstance = null;

function loadFavorites() {
    return JSON.parse(localStorage.getItem('favPins') || '[]');
}

function saveFavorites(favs) {
    localStorage.setItem('favPins', JSON.stringify(favs));
}

function loadMessages() {
    return JSON.parse(localStorage.getItem('messages') || '{}');
}

function saveMessages(msgs) {
    localStorage.setItem('messages', JSON.stringify(msgs));
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
    localStorage.removeItem('ageVerified');
    localStorage.removeItem('birthDate');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('pins');
    localStorage.removeItem('userPinIndex');
    window.location.href = 'index.html';
}

function cleanupPins() {
    let pins = getPins();
    let index = parseInt(localStorage.getItem('userPinIndex'), 10);
    if (pins.length > 1) {
        if (Number.isNaN(index) || index >= pins.length) {
            index = 0;
        }
        pins = [pins[index]];
        savePins(pins);
        localStorage.setItem('userPinIndex', '0');
    } else if (pins.length === 1 && Number.isNaN(index)) {
        localStorage.setItem('userPinIndex', '0');
    } else if (pins.length === 0) {
        localStorage.removeItem('userPinIndex');
    }
}

function popupHtml(p, idx) {
    const img = p.photo ? `<img src="${p.photo}" class="popup-photo">` : '';
    const likes = p.likes || 0;
    const likeBtn = `<button class="like-btn" data-index="${idx}">Like (${likes})</button>`;
    const favBtn = idx !== userIndex ? `<button class="fav-btn" data-index="${idx}">❤️ Ajouter aux favoris</button>` : '';
    const msgBtn = idx !== userIndex ? `<button class="msg-btn" data-index="${idx}">Envoyer un message</button>` : '';

    const last = p.lastSeen || 0;
    const diffMin = Math.floor((Date.now() - last) / 60000);
    const online = diffMin < 10;
    const status = `<span class="status-indicator" title="Dernière activité">${online ? '🟢 En ligne' : `🕒 Vu il y a ${diffMin} min`}</span>`;

    let messagesHtml = '';
    if (idx === userIndex) {
        const msgs = loadMessages()[idx] || [];
        if (msgs.length) {
            messagesHtml = '<div class="messages">' + msgs.map(m => `<p>${escapeHtml(m)}</p>`).join('') + '</div>';
        }
    }

    const age = escapeHtml(String(p.age));
    const gender = escapeHtml(p.gender);
    return `${img}<p>${age} ans – ${gender}</p>${status}${likeBtn}${favBtn}${msgBtn}${messagesHtml}`;
}

function initProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    const info = loadUserInfo();
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
    form.addEventListener('submit', e => {
        e.preventDefault();
        saveUserInfo({ age: form.age.value, gender: form.gender.value, photo: photoData });
        alert('Profil sauvegardé');
    });
}

function initMap() {
    // Ensure only one pin exists before initializing the map
    cleanupPins();

    // Listen for storage changes from other tabs to keep state in sync
    window.addEventListener('storage', e => {
        if (e.key === 'pins' || e.key === 'userPinIndex') {
            cleanupPins();
            location.reload();
        }
    });

    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    // Montréal coordinates by default
    const map = L.map(mapEl).setView([45.5019, -73.5674], 13);
    mapInstance = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const pins = getPins();
    mapPins = pins;
    userIndex = parseInt(localStorage.getItem('userPinIndex'), 10);
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

    if (!Number.isNaN(userIndex) && pins[userIndex]) {
        pins[userIndex].lastSeen = Date.now();
        savePins(pins);
    }

    map.on('popupopen', e => {
        const el = e.popup.getElement();
        const likeBtn = el.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                const idx = parseInt(likeBtn.dataset.index, 10);
                const list = getPins();
                list[idx].likes = (list[idx].likes || 0) + 1;
                savePins(list);
                likeBtn.textContent = `Like (${list[idx].likes})`;
            });
        }
        const favBtn = el.querySelector('.fav-btn');
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                const idx = parseInt(favBtn.dataset.index, 10);
                const favs = loadFavorites();
                if (!favs.includes(idx)) {
                    favs.push(idx);
                    saveFavorites(favs);
                    favBtn.textContent = '❤️ Ajouté';
                }
            });
        }
        const msgBtn = el.querySelector('.msg-btn');
        if (msgBtn) {
            msgBtn.addEventListener('click', () => {
                const idx = parseInt(msgBtn.dataset.index, 10);
                openMessageModal(idx);
            });
        }
    });

    map.on('click', e => {
        cleanupPins();
        if (localStorage.getItem('userPinIndex') !== null || userMarker) {
            alert('Vous avez déjà ajouté un pin.');
            return;
        }
        const info = loadUserInfo();
        if (!info.age || !info.gender) {
            alert('Veuillez remplir votre âge et genre dans le profil.');
            return;
        }
        const pinData = { age: info.age, gender: info.gender, photo: info.photo, likes: 0 };
        const marker = L.marker(e.latlng, {riseOnHover:true}).addTo(map)
            .bindPopup(popupHtml(pinData, pins.length))
            .openPopup();
        marker.once('add', () => { marker._icon.classList.add('marker-new'); });
        pins.push({ lat: e.latlng.lat, lng: e.latlng.lng, ...pinData });
        markers.push(marker);
        savePins(pins);
        localStorage.setItem('userPinIndex', pins.length - 1);
        userMarker = marker;
        userMarker.on('click', removeUserPin);
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

function removeUserPin(e) {
    if (e) {
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
        } else if (e.stopPropagation) {
            e.stopPropagation();
            if (e.preventDefault) e.preventDefault();
        }
    }
    const index = parseInt(localStorage.getItem('userPinIndex'), 10);
    if (Number.isNaN(index)) {
        alert("Vous n'avez pas encore placé de pin.");
        return;
    }
    if (!confirm('Supprimer définitivement votre pin ?')) {
        return;
    }
    savePins([]);
    localStorage.removeItem('userPinIndex');
    if (userMarker) {
        userMarker.remove();
        userMarker = null;
    }
    location.reload();
}

function displayRandomProfiles() {
    const container = document.getElementById('profiles');
    if (!container) return;

    const pins = getPins();
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
        info.textContent = `${p.age} ans – ${p.gender}`;
        div.appendChild(info);
        const likes = document.createElement('span');
        likes.textContent = `Likes: ${p.likes || 0}`;
        div.appendChild(likes);
        container.appendChild(div);
    });
}

function openMessageModal(idx) {
    const modal = document.getElementById('message-modal');
    if (!modal) return;
    modal.style.display = 'block';
    const textarea = modal.querySelector('textarea');
    const sendBtn = modal.querySelector('button');
    textarea.value = '';
    sendBtn.onclick = () => {
        const text = textarea.value.trim();
        if (text) {
            const msgs = loadMessages();
            if (!msgs[idx]) msgs[idx] = [];
            msgs[idx].push(escapeHtml(text));
            saveMessages(msgs);
        }
        modal.style.display = 'none';
    };
}

function displayFavorites() {
    const container = document.getElementById('fav-list');
    if (!container) return;
    container.innerHTML = '';
    const favs = loadFavorites();
    const pins = getPins();
    favs.forEach(idx => {
        const p = pins[idx];
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
        info.textContent = `${p.age} ans – ${p.gender}`;
        div.appendChild(info);
        const likes = document.createElement('span');
        likes.textContent = `Likes: ${p.likes || 0}`;
        div.appendChild(likes);
        const remove = document.createElement('button');
        remove.textContent = 'Retirer';
        remove.className = 'button';
        remove.addEventListener('click', () => {
            const list = loadFavorites().filter(i => i !== idx);
            saveFavorites(list);
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

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('section').forEach(sec => sec.classList.add('fade-section'));
    cleanupPins();
    initProfileForm();
    displayRandomProfiles();
    displayFavorites();
    const btn = document.getElementById('remove-pin');
    if (btn) {
        btn.addEventListener('click', removeUserPin);
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
