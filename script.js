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
});
