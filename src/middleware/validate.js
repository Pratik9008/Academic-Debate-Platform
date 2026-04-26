function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function requiredString(value, maxLen) {
  const s = String(value || "").trim();
  if (!s) return null;
  if (maxLen && s.length > maxLen) return null;
  return s;
}

module.exports = { isEmail, requiredString };

