import { apiFetch } from './apiFetch';
import { getAuthHeaders } from './authHeaders';

import { API_URL as API } from './api';

export async function getForumCategories() {
  const res = await apiFetch(`${API}/forum/categories`);
  if (!res.ok) return [];
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function getForumPosts(params: { category?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  const res = await apiFetch(`${API}/forum/posts?${query.toString()}`);
  if (!res.ok) return { posts: [], total: 0 };
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function getRecentPosts() {
  const res = await apiFetch(`${API}/forum/posts/recent`);
  if (!res.ok) return [];
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function getForumPost(id: number) {
  const res = await apiFetch(`${API}/forum/posts/${id}`);
  if (!res.ok) return null;
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function createPost(data: { title: string; content: string; category: string; tags?: string[] }) {
  const res = await apiFetch(`${API}/forum/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function createReply(postId: number, content: string) {
  const res = await apiFetch(`${API}/forum/posts/${postId}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function likePost(postId: number) {
  const res = await apiFetch(`${API}/forum/posts/${postId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}

export async function likeReply(replyId: number) {
  const res = await apiFetch(`${API}/forum/replies/${replyId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(error.message || 'Forum request failed'); }
  return res.json();
}
