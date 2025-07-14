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

function popupHtml(p, idx) {
    const img = p.photo ? `<img src="${p.photo}" class="popup-photo">` : '';
    const likes = p.likes || 0;
    const likeBtn = `<button class="like-btn" data-index="${idx}">Like (${likes})</button>`;
    return `${img}<p>${p.age} ans – ${p.gender}</p>${likeBtn}`;
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
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    // Montréal coordinates by default
    const map = L.map(mapEl).setView([45.5019, -73.5674], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const pins = getPins();
    const userIndex = parseInt(localStorage.getItem('userPinIndex'), 10);
    const markers = [];
    pins.forEach((p, idx) => {
        const marker = L.marker([p.lat, p.lng], {riseOnHover: true}).addTo(map)
            .bindPopup(popupHtml(p, idx));
        markers.push(marker);
        if (idx === userIndex) {
            userMarker = marker;
            marker.on('click', removeUserPin);
        }
    });

    map.on('popupopen', e => {
        const btn = e.popup.getElement().querySelector('.like-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                const list = getPins();
                list[idx].likes = (list[idx].likes || 0) + 1;
                savePins(list);
                btn.textContent = `Like (${list[idx].likes})`;
            });
        }
    });

    map.on('click', e => {
        if (localStorage.getItem('userPinIndex') !== null) {
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

function removeUserPin() {
    const index = parseInt(localStorage.getItem('userPinIndex'), 10);
    if (Number.isNaN(index)) {
        alert("Vous n'avez pas encore placé de pin.");
        return;
    }
    if (!confirm('Supprimer définitivement votre pin ?')) {
        return;
    }
    const pins = getPins();
    if (pins[index]) {
        pins.splice(index, 1);
        savePins(pins);
    }
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

document.addEventListener('DOMContentLoaded', () => {
    initProfileForm();
    initMap();
    displayRandomProfiles();
    const btn = document.getElementById('remove-pin');
    if (btn) {
        btn.addEventListener('click', removeUserPin);
    }
});
