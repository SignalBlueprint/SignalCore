/**
 * Centralized API client for Questboard
 *
 * Automatically injects JWT tokens and handles authentication
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3000';

// Token management (accessed via closure, updated by setTokenGetter)
let getToken: (() => string | null) | null = null;
let refreshTokenFn: (() => Promise<void>) | null = null;

/**
 * Configure the API client with auth functions from AuthContext
 * Must be called once at app initialization
 */
export function configureApiClient(
  tokenGetter: () => string | null,
  tokenRefresher: () => Promise<void>
) {
  getToken = tokenGetter;
  refreshTokenFn = tokenRefresher;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Internal fetch wrapper that adds auth headers and handles token refresh
 */
async function apiFetch(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add auth token if available and not skipped
  if (!skipAuth && getToken) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token once
  if (response.status === 401 && !skipAuth && refreshTokenFn) {
    try {
      await refreshTokenFn();

      // Retry the request with new token
      const newToken = getToken?.();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      }
    } catch (error) {
      // Refresh failed - let the 401 propagate
      console.error('Token refresh failed:', error);
    }
  }

  return response;
}

/**
 * Parse response body - handles JSON and text
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text as unknown as T;
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'GET',
  });

  if (!response.ok) {
    const error = await parseResponse<any>(response);
    throw new Error(error.message || `GET ${endpoint} failed: ${response.status}`);
  }

  return parseResponse<T>(response);
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await parseResponse<any>(response);
    throw new Error(error.message || `POST ${endpoint} failed: ${response.status}`);
  }

  return parseResponse<T>(response);
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await parseResponse<any>(response);
    throw new Error(error.message || `PUT ${endpoint} failed: ${response.status}`);
  }

  return parseResponse<T>(response);
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await parseResponse<any>(response);
    throw new Error(error.message || `DELETE ${endpoint} failed: ${response.status}`);
  }

  return parseResponse<T>(response);
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await parseResponse<any>(response);
    throw new Error(error.message || `PATCH ${endpoint} failed: ${response.status}`);
  }

  return parseResponse<T>(response);
}

// Export a default object with all methods
export default {
  configure: configureApiClient,
  get,
  post,
  put,
  delete: del,
  patch,
};
