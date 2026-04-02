import { getAuthHeaders } from './authHeaders';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getForumCategories() {
  const res = await fetch(`${API}/forum/categories`);
  if (!res.ok) return [];
  return res.json();
}

export async function getForumPosts(params: { category?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  const res = await fetch(`${API}/forum/posts?${query.toString()}`);
  if (!res.ok) return { posts: [], total: 0 };
  return res.json();
}

export async function getRecentPosts() {
  const res = await fetch(`${API}/forum/posts/recent`);
  if (!res.ok) return [];
  return res.json();
}

export async function getForumPost(id: number) {
  const res = await fetch(`${API}/forum/posts/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createPost(data: { title: string; content: string; category: string; tags?: string[] }) {
  const res = await fetch(`${API}/forum/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createReply(postId: number, content: string) {
  const res = await fetch(`${API}/forum/posts/${postId}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function likePost(postId: number) {
  const res = await fetch(`${API}/forum/posts/${postId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function likeReply(replyId: number) {
  const res = await fetch(`${API}/forum/replies/${replyId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return res.json();
}
