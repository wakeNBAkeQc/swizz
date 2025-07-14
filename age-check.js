function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('age-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const dobStr = document.getElementById('dob').value;
    if (!dobStr) return;
    const age = calculateAge(new Date(dobStr));
    if (age >= 18) {
      localStorage.setItem('ageVerified', 'true');
      localStorage.setItem('birthDate', dobStr);
      window.location.href = 'accueil.html';
    } else {
      document.getElementById('age-error').style.display = 'block';
    }
  });
});
