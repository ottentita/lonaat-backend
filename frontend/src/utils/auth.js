export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// tokens are now handled via httpOnly cookies, so we no longer expose them
export const clearAuth = () => {
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return !!getUser();
};

export const isAdmin = () => {
  const user = getUser();
  // Check both is_admin flag (primary) and role field (fallback)
  return user?.is_admin === true || (typeof user?.role === 'string' && user.role.toUpperCase() === 'ADMIN');
};
