const KEY_SERVER = 'cbt_server_url';
const KEY_DOMAIN = 'cbt_domain_url';

export function getServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(KEY_SERVER) || window.location.origin;
}

export function setServerUrl(url: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_SERVER, url.replace(/\/+$/, ''));
}

export function getDomainUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(KEY_DOMAIN) || '';
}

export function setDomainUrl(url: string) {
  if (typeof window === 'undefined') return;
  if (url) {
    localStorage.setItem(KEY_DOMAIN, url.replace(/\/+$/, ''));
  } else {
    localStorage.removeItem(KEY_DOMAIN);
  }
}
