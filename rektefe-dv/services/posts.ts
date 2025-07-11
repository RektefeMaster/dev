import { api } from './api';

export interface Post {
  _id: string;
  user: string;
  content: string;
  likes: string[];
  createdAt: string;
}

export interface CreatePostData {
  user: string;
  content: string;
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
    return response.data.filter((post: Post) => {
      const userObj = post.user as any;
      if (typeof userObj === 'object' && userObj !== null) {
        return String(userObj._id) === String(userId);
      }
      return String(post.user) === String(userId);
    });
  }
}; 