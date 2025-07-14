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
            savePins(pins);
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

function initProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    const info = loadUserInfo();
    if (info.age) form.age.value = info.age;
    if (info.gender) form.gender.value = info.gender;
    form.addEventListener('submit', e => {
        e.preventDefault();
        saveUserInfo({ age: form.age.value, gender: form.gender.value });
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
    pins.forEach((p, idx) => {
        const marker = L.marker([p.lat, p.lng]).addTo(map)
            .bindPopup(p.age + ' ans – ' + p.gender);
        if (idx === userIndex) {
            userMarker = marker;
            marker.on('click', removeUserPin);
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
        const marker = L.marker(e.latlng).addTo(map)
            .bindPopup(info.age + ' ans – ' + info.gender)
            .openPopup();
        pins.push({ lat: e.latlng.lat, lng: e.latlng.lng, age: info.age, gender: info.gender });
        savePins(pins);
        localStorage.setItem('userPinIndex', pins.length - 1);
        userMarker = marker;
        userMarker.on('click', removeUserPin);
    });
}

function removeUserPin() {
    const index = localStorage.getItem('userPinIndex');
    if (index === null) {
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
        div.textContent = `${p.age} ans – ${p.gender} (lat: ${p.lat.toFixed(2)}, lng: ${p.lng.toFixed(2)})`;
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
