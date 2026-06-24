// src/utils/validatePassword.js
// Mirrors backend validation for instant frontend feedback without network calls

export const validatePassword = (password = '') => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  const isValid = score === 5;

  let strength = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  else if (score >= 1) strength = 'fair';

  return { checks, score, isValid, strength };
};
