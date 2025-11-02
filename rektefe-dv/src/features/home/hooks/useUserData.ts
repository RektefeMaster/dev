import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';

export const useUserData = () => {
  const { token, userId, user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false); // Prevent duplicate calls

  const fetchUserProfile = useCallback(async () => {
    if (!token || !userId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      const { data, error } = await withErrorHandling(
        () => apiService.getUserProfile(),
        { showErrorAlert: false }
      );

      if (data && data.success) {
        setUserProfile(data.data);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, userId]);

  useEffect(() => {
    // Sadece token ve userId varsa çağır
    // Her render'da çağrılmasını önle - sadece token/userId değiştiğinde
    if (token && userId) {
      fetchUserProfile();
    }
  }, [token, userId, fetchUserProfile]); // fetchUserProfile useCallback ile optimize edildi

  return {
    userProfile: userProfile || user,
    loading,
    fetchUserProfile,
  };
};
