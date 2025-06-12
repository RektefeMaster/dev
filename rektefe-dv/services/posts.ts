import { api } from './api';

export interface Post {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    city?: string;
    tags?: string[];
  };
  content: string;
  likes: string[];
  createdAt: string;
  commentsCount?: number;
  imageUrl?: string;
  city?: string;
  tags?: string[];
}

export interface CreatePostData {
  content: string;
  imageUrl?: string;
  city?: string;
  tags?: string[];
}

export const postService = {
  getPosts: async () => {
    const response = await api.get('/posts');
    return response.data;
  },
  
  createPost: async (data: CreatePostData) => {
    const response = await api.post('/posts', data);
    return response.data;
  },
  
  likePost: async (postId: string) => {
    return api.post(`/posts/${postId}/like`);
  },
  
  deletePost: async (postId: string) => {
    return api.delete(`/posts/${postId}`);
  },

  getUserPosts: async (userId: string) => {
    const response = await api.get('/posts');
    return response.data.filter((post: Post) => post.user && String(post.user._id) === String(userId));
  }
}; 