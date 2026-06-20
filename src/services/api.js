export const analyzeProfileApi = async ({ profileText, name }) => {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileText, name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to analyze profile' }));
    throw new Error(err.error || 'Failed to analyze profile');
  }

  return res.json();
};