// utils/validatePassword.js
const COMMON_WEAK_PASSWORDS = [
  'password', 'password1', 'password123', '12345678', '123456789',
  'qwerty123', 'qwerty', 'letmein', 'admin123', 'welcome123',
  '11111111', '00000000', 'iloveyou', 'monkey123', 'abc12345',
  'dragon', 'master', 'sunshine', 'princess', 'football'
];

const validatePassword = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.).');
  }
  if (COMMON_WEAK_PASSWORDS.includes((password || '').toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger one.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = { validatePassword };
