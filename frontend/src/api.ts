const API_URL = '/api';

/** Omits undefined/null/empty so URLSearchParams does not emit "key=undefined". */
function buildQueryString(record: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue;
    sp.set(key, value);
  }
  return sp.toString();
}

class ApiClient {
  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'Request failed');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async get(endpoint: string, includeAuth = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(includeAuth),
    });
    return this.handleResponse(response);
  }

  async post(endpoint: string, data?: any, includeAuth = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async put(endpoint: string, data: any, includeAuth = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(endpoint: string, includeAuth = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth),
    });
    return this.handleResponse(response);
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data, false),

  login: (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    return fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    });
  },

  getMe: () => api.get('/auth/me'),

  googleOAuth: (token: { email: string; name: string }) =>
    api.post('/auth/oauth/google', token, false),
};

// Movies API
export const moviesApi = {
  getAll: (params?: { query?: string; genre?: string; language?: string }) => {
    const queryString = buildQueryString(params ?? {});
    return api.get(`/movies/${queryString ? `?${queryString}` : ''}`, false);
  },

  getById: (id: string) => api.get(`/movies/${id}`, false),

  create: (data: any) => api.post('/movies/', data),

  update: (id: string, data: any) => api.put(`/movies/${id}`, data),

  delete: (id: string) => api.delete(`/movies/${id}`),
};

// Theaters API
export const theatersApi = {
  getAll: (city?: string) =>
    api.get(`/theaters/${city ? `?city=${encodeURIComponent(city)}` : ''}`, false),

  getById: (id: string) => api.get(`/theaters/${id}`, false),

  create: (data: any) => api.post('/theaters/', data),

  update: (id: string, data: any) => api.put(`/theaters/${id}`, data),

  delete: (id: string) => api.delete(`/theaters/${id}`),

  getScreens: (theaterId: string) => api.get(`/theaters/${theaterId}/screens`, false),

  createScreen: (theaterId: string, data: any) =>
    api.post(`/theaters/${theaterId}/screens`, data),
};

// Shows API
export const showsApi = {
  getAll: (params?: { movie_id?: string; theater_id?: string; city?: string; date?: string }) => {
    const queryString = buildQueryString(params ?? {});
    return api.get(`/shows/${queryString ? `?${queryString}` : ''}`, false);
  },

  getById: (id: string) => api.get(`/shows/${id}`, false),

  getSeats: (id: string) => api.get(`/shows/${id}/seats`, false),

  holdSeats: (id: string, seatIds: string[]) =>
    api.post(`/shows/${id}/seats/hold`, seatIds),

  create: (data: any) => api.post('/shows/', data),

  delete: (id: string) => api.delete(`/shows/${id}`),
};

// Bookings API
export const bookingsApi = {
  create: (data: any) => api.post('/bookings/', data),

  getAll: (status?: string) =>
    api.get(`/bookings/${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  getById: (id: string) => api.get(`/bookings/${id}`),

  confirm: (id: string) => api.post(`/bookings/${id}/confirm`),

  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
};

// Payments API
export const paymentsApi = {
  process: (data: any) => api.post('/payments/', data),

  getById: (id: string) => api.get(`/payments/${id}`),

  getByBooking: (bookingId: string) =>
    api.get(`/payments/booking/${bookingId}`),

  simulateFailure: (data: any) =>
    api.post('/payments/simulate-failure', data),
};

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/dashboard/stats'),

  getUsers: () => api.get('/admin/users'),

  activateUser: (id: string) => api.put(`/admin/users/${id}/activate`, {}),

  deactivateUser: (id: string) => api.put(`/admin/users/${id}/deactivate`, {}),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  getAllBookings: (status?: string) =>
    api.get(`/admin/bookings${status ? `?status=${status}` : ''}`),

  getRevenue: (startDate?: string, endDate?: string) => {
    const qs = buildQueryString({ start_date: startDate, end_date: endDate });
    return api.get(`/admin/revenue${qs ? `?${qs}` : ''}`);
  },
};
