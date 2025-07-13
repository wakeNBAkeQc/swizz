function loadUserInfo() {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
}

function saveUserInfo(age, gender) {
    localStorage.setItem('userInfo', JSON.stringify({ age: age, gender: gender }));
    const index = localStorage.getItem('userPinIndex');
    if (index !== null) {
        const pins = JSON.parse(localStorage.getItem('pins') || '[]');
        if (pins[index]) {
            pins[index].age = age;
            pins[index].gender = gender;
            localStorage.setItem('pins', JSON.stringify(pins));
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('profile-form');
    if (form) {
        const info = loadUserInfo();
        if (info.age) form.age.value = info.age;
        if (info.gender) form.gender.value = info.gender;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            saveUserInfo(form.age.value, form.gender.value);
            alert('Profil sauvegardé');
        });
    }

    const mapEl = document.getElementById('map');
    if (mapEl) {
        const map = L.map('map').setView([48.8584, 2.2945], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        let pins = JSON.parse(localStorage.getItem('pins') || '[]');
        pins.forEach(p => {
            L.marker([p.lat, p.lng]).addTo(map)
                .bindPopup(p.age + ' ans – ' + p.gender);
        });

        map.on('click', function (e) {
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
            localStorage.setItem('pins', JSON.stringify(pins));
            localStorage.setItem('userPinIndex', pins.length - 1);
        });
    }
});
