import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';

export const useUserData = () => {
  const { token, userId, user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserProfile = async () => {
    if (!token || !userId) return;

    setLoading(true);
    const { data, error } = await withErrorHandling(
      () => apiService.getUserProfile(),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      setUserProfile(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserProfile();
  }, [token, userId]);

  return {
    userProfile: userProfile || user,
    loading,
    fetchUserProfile,
  };
};
