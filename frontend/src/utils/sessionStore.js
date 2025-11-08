// utils/sessionStore.js
export const setSessionData = (key, value, expiryMs = 2 * 60 * 60 * 1000) => {
  const data = { value, expiry: Date.now() + expiryMs };
  sessionStorage.setItem(key, JSON.stringify(data));
};

export const getSessionData = (key) => {
  const dataStr = sessionStorage.getItem(key);
  if (!dataStr) return null;
  try {
    const data = JSON.parse(dataStr);
    if (Date.now() > data.expiry) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data.value;
  } catch {
    return null;
  }
};
