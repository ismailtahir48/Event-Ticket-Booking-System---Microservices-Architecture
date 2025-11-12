const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3005';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3003';
const SEATMAP_SERVICE_URL = process.env.SEATMAP_SERVICE_URL || 'http://localhost:3004';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3006';
const PAYMENTS_SERVICE_URL = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3007';

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest(`${AUTH_SERVICE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, role?: string) =>
      apiRequest(`${AUTH_SERVICE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }),
  },
  inventory: {
    hold: (showtimeId: string, seatIds: string[], userId: string) =>
      apiRequest(`${INVENTORY_SERVICE_URL}/hold`, {
        method: 'POST',
        body: JSON.stringify({ showtimeId, seatIds, userId }),
      }),
    release: (holdId: string) =>
      apiRequest(`${INVENTORY_SERVICE_URL}/release`, {
        method: 'POST',
        body: JSON.stringify({ holdId }),
      }),
    availability: (showtimeId: string) =>
      apiRequest(`${INVENTORY_SERVICE_URL}/availability?showtimeId=${showtimeId}`),
    purchase: (holdId: string, orderId: string) =>
      apiRequest(`${INVENTORY_SERVICE_URL}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ holdId, orderId }),
      }),
  },
};

