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
    const policyAccepted = document.getElementById('policy-check')?.checked;
    const ageErr = document.getElementById('age-error');
    const policyErr = document.getElementById('policy-error');
    if (ageErr) ageErr.style.display = 'none';
    if (policyErr) policyErr.style.display = 'none';
    if (age >= 18 && policyAccepted) {
      localStorage.setItem('ageVerified', 'true');
      localStorage.setItem('birthDate', dobStr);
      window.location.href = 'accueil.html';
    } else {
      if (age < 18 && ageErr) ageErr.style.display = 'block';
      if (!policyAccepted && policyErr) policyErr.style.display = 'block';
    }
  });
});
