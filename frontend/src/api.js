const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options) {
  const response = await fetch(API_URL + path, options);
  if (!response.ok) {
    throw new Error('Request failed: ' + response.status);
  }
  return response.json();
}

export function getSummary() {
  return request('/summary');
}


export function getRecommendations(status) {
  const query = status ? '?status=' + status : '';
  return request('/recommendations' + query);
}

export function setRecommendationStatus(id, status) {
  return request('/recommendations/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export function runAnalysis() {
  return request('/analysis/run', { method: 'POST' });
}
