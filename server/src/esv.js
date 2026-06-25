import { config } from './config.js';

export async function esvFetch(path, params) {
  if (!config.esvApiKey) {
    const error = new Error('ESV API key is not configured');
    error.status = 503;
    throw error;
  }

  const url = new URL(`https://api.esv.org${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { Authorization: `Token ${config.esvApiKey}` },
  });

  if (!response.ok) {
    const error = new Error(`ESV API request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
