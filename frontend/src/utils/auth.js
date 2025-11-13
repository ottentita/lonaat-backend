export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
};

export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return !!getAccessToken();
};

export const isAdmin = () => {
  const user = getUser();
  // Check both is_admin flag (primary) and role field (fallback)
  return user?.is_admin === true || user?.role === 'admin';
};
