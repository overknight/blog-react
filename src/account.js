export const login = (token) =>
  fetch('https://blog.kata.academy/api/user', { headers: { Authorization: `Bearer ${token}` } }).then((response) => {
    const contentType = response.headers.get('content-type').replace(/^([^ ;]*).*/, '$1');
    if (response.status == 401) return { unauthorized: true };
    if (contentType == 'application/json') return response.json();
  });
