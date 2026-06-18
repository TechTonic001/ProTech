// src/utils/formatters.js

export const formatCurrency = (val) => {
  const num = Number(val || 0);
  return '₦' + num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (val) => {
  if (!val) return '—';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatRelativeTime = (val) => {
  if (!val) return '—';
  const past = new Date(val);
  if (isNaN(past.getTime())) return '—';
  const now = new Date();
  const diffMs = now - past;
  
  if (diffMs < 0) return 'Just now'; // Future date buffer
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
