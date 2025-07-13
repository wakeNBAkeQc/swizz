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

    const map = L.map(mapEl).setView([48.8584, 2.2945], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const pins = getPins();
    pins.forEach(p => {
        L.marker([p.lat, p.lng]).addTo(map)
            .bindPopup(p.age + ' ans – ' + p.gender);
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
        L.marker(e.latlng).addTo(map)
            .bindPopup(info.age + ' ans – ' + info.gender)
            .openPopup();
        pins.push({ lat: e.latlng.lat, lng: e.latlng.lng, age: info.age, gender: info.gender });
        savePins(pins);
        localStorage.setItem('userPinIndex', pins.length - 1);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initProfileForm();
    initMap();
});
