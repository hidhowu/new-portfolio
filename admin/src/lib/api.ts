let csrfToken: string | null = null;

async function fetchCsrf() {
  const res = await fetch('/api/admin/csrf', { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.token;
  return csrfToken;
}

async function getToken(): Promise<string> {
  if (!csrfToken) await fetchCsrf();
  // Refresh from cookie as fallback
  if (!csrfToken) {
    const match = document.cookie.match(/pf_csrf=([^;]+)/);
    csrfToken = match ? decodeURIComponent(match[1]) : '';
  }
  return csrfToken || '';
}

export type ApiOptions = Omit<RequestInit, 'body'> & { data?: unknown };

export async function api<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const { data, ...rest } = opts;
  const isFormData = data instanceof FormData;
  const headers: HeadersInit = { ...(rest.headers as Record<string, string>) };

  const method = rest.method ?? (data ? 'POST' : 'GET');
  const isMutating = !['GET', 'HEAD'].includes(method.toUpperCase());

  if (isMutating) {
    const token = await getToken();
    (headers as Record<string, string>)['x-csrf-token'] = token;
  }

  if (data && !isFormData) {
    (headers as Record<string, string>)['content-type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...rest,
    method,
    credentials: 'include',
    headers,
    body: data ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (err.fields && typeof err.fields === 'object') {
      const detail = Object.entries(err.fields)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
        .join('; ');
      throw new Error(`${err.error || 'Validation failed'} — ${detail}`);
    }
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const get = <T = any>(url: string) => api<T>(url, { method: 'GET' });
export const post = <T = any>(url: string, data?: unknown) => api<T>(url, { method: 'POST', data });
export const patch = <T = any>(url: string, data?: unknown) => api<T>(url, { method: 'PATCH', data });
export const put = <T = any>(url: string, data?: unknown) => api<T>(url, { method: 'PUT', data });
export const del = <T = any>(url: string) => api<T>(url, { method: 'DELETE' });
