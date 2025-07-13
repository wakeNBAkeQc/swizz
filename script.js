codex/creer-site-web-pour-carte-interactive
function getPins() {
  return JSON.parse(localStorage.getItem('pins') || '[]');
}
function savePins(pins) {
  localStorage.setItem('pins', JSON.stringify(pins));
}
function initProfileForm() {
  const ageInput = document.getElementById('age');
  const genderSelect = document.getElementById('gender');
  if (ageInput) ageInput.value = localStorage.getItem('age') || '';
  if (genderSelect) genderSelect.value = localStorage.getItem('gender') || '';
  const form = document.getElementById('profileForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      localStorage.setItem('age', ageInput.value);
      localStorage.setItem('gender', genderSelect.value);
      alert('Profil mis \u00e0 jour');
    });
  }
}
function loadPins(map) {
  getPins().forEach(p => {
    L.marker([p.lat, p.lng]).addTo(map)
      .bindPopup(`${p.age} ans \u2013 ${p.gender}`);
  });
}
function initMap() {
  const mapElem = document.getElementById('map');
  if (!mapElem) return;
  const map = L.map('map').setView([48.8584, 2.2945], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  loadPins(map);
  map.on('click', e => {
    if (localStorage.getItem('hasPin')) {
      alert('Vous avez d\u00e9j\u00e0 ajout\u00e9 un pin');
      return;
    }
    const age = localStorage.getItem('age');
    const gender = localStorage.getItem('gender');
    if (!age || !gender) {
      alert('Renseignez votre \u00e2ge et votre genre dans le profil');
      return;
    }
    const marker = L.marker(e.latlng).addTo(map)
      .bindPopup(`${age} ans \u2013 ${gender}`);
    const pins = getPins();
    pins.push({ lat: e.latlng.lat, lng: e.latlng.lng, age, gender });
    savePins(pins);
    localStorage.setItem('hasPin', 'true');
    marker.openPopup();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initProfileForm();
  initMap();

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
 main
});
