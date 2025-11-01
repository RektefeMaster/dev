import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  userId: {
    name: string;
    surname: string;
  };
}

interface MechanicDetail {
  id: string;
  name: string;
  surname: string;
  rating: number;
  experience: number;
  totalJobs: number;
  specialties: string[];
  city: string;
  isAvailable: boolean;
  avatar?: string;
  bio?: string;
  ratingCount: number;
  ratingStats?: {
    average: number;
    total: number;
    distribution: { [key: number]: number };
  };
  recentReviews?: Review[];
  shopName?: string;
  location?: {
    city: string;
    district?: string;
    neighborhood?: string;
    street?: string;
  };
  phone?: string;
  workingHours?: string;
  carBrands?: string[];
  engineTypes?: string[];
  transmissionTypes?: string[];
}

export const useMechanicDetail = (mechanic: MechanicDetail) => {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(mechanic.rating);
  const [totalReviews, setTotalReviews] = useState(mechanic.ratingCount || 0);
  const [loading, setLoading] = useState(false);
  const [mechanicDetails, setMechanicDetails] = useState(mechanic);
  
  // Expandable sections state
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [showAllCarBrands, setShowAllCarBrands] = useState(false);
  const [showAllEngineTypes, setShowAllEngineTypes] = useState(false);
  const [showAllTransmissionTypes, setShowAllTransmissionTypes] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    fetchMechanicDetails();
  }, [mechanic.id]);

  const fetchMechanicDetails = async () => {
    const { data, error } = await withErrorHandling(
      () => apiService.getMechanicDetails(mechanic.id),
      { showErrorAlert: false }
    );

    if (data && data.success && data.data) {
      setMechanicDetails(data.data);
      
      // Rating bilgilerini güncelle
      if (data.data.ratingStats) {
        setAverageRating(data.data.ratingStats.average);
        setTotalReviews(data.data.ratingStats.total);
      }
      
      // Yorumları güncelle
      if (data.data.ratings && data.data.ratings.length > 0) {
        setReviews(data.data.ratings.map((review: any) => ({
          _id: review._id,
          rating: review.rating,
          comment: review.comment || '',
          createdAt: review.createdAt,
          userId: {
            name: review.userId?.name || 'Kullanıcı',
            surname: review.userId?.surname || ''
          }
        })));
      }
    }
  };

  const fetchMechanicReviews = async () => {
    setLoading(true);
    
    try {
      // Bu kısım apiService'e taşınabilir
      const { data: ratingData } = await withErrorHandling(
        () => apiService.getMechanicRatingStats(mechanic.id),
        { showErrorAlert: false }
      );

      if (ratingData && ratingData.success) {
        setAverageRating(ratingData.data.averageRating);
        setTotalReviews(ratingData.data.totalRatings);
      }

      const { data: reviewsData } = await withErrorHandling(
        () => apiService.getMechanicReviews(mechanic.id, { limit: 20 }),
        { showErrorAlert: false }
      );

      if (reviewsData && reviewsData.success && reviewsData.data) {
        const data = reviewsData.data as any;
        setReviews(data.ratings || data.reviews || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeCustomer = async () => {
    const { data, error } = await withErrorHandling(
      () => apiService.becomeCustomer(mechanic.id),
      { customErrorMessage: 'Müşteri olurken bir hata oluştu' }
    );

    if (data && data.success) {
      return { success: true, message: 'Başarıyla müşteri oldunuz!' };
    }
    
    return { success: false, message: error?.message || 'Bir hata oluştu' };
  };

  const handleRemoveCustomer = async () => {
    const { data, error } = await withErrorHandling(
      () => apiService.removeCustomer(mechanic.id),
      { customErrorMessage: 'Müşterilik bırakılırken bir hata oluştu' }
    );

    if (data && data.success) {
      return { success: true, message: 'Müşterilik başarıyla bırakıldı!' };
    }
    
    return { success: false, message: error?.message || 'Bir hata oluştu' };
  };

  return {
    // State
    reviews,
    averageRating,
    totalReviews,
    loading,
    mechanicDetails,
    showAllSpecialties,
    showAllCarBrands,
    showAllEngineTypes,
    showAllTransmissionTypes,
    showAllReviews,
    
    // Actions
    setShowAllSpecialties,
    setShowAllCarBrands,
    setShowAllEngineTypes,
    setShowAllTransmissionTypes,
    setShowAllReviews,
    fetchMechanicDetails,
    fetchMechanicReviews,
    handleBecomeCustomer,
    handleRemoveCustomer,
  };
};
