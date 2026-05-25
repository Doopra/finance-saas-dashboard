const API_BASE_URL = '/api';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (geminiKey) {
      headers['x-gemini-key'] = geminiKey;
    }
  }
  
  return headers;
};

export const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  post: async (endpoint, body) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  postFile: async (endpoint, file) => {
    const headers = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const geminiKey = localStorage.getItem('gemini_api_key');
      if (geminiKey) {
        headers['x-gemini-key'] = geminiKey;
      }
    }

    const formData = new FormData();
    formData.append('statement', file);

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  put: async (endpoint, body) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  delete: async (endpoint) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }
    return res.json();
  },
};
