// Favori araç güncelleme
export const updateFavoriteVehicle = async (vehicleId) => {
  try {
    const response = await api.put('/users/favorite-vehicle', { vehicleId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Bir hata oluştu' };
  }
};

// Kullanıcı bilgilerini getir
export const getUser = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Bir hata oluştu' };
  }
};

// Takipçi listesini getir
export const getFollowers = async (userId) => {
  try {
    const response = await api.get(`/users/followers/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Bir hata oluştu' };
  }
};

// Takip edilenler listesini getir
export const getFollowing = async (userId) => {
  try {
    const response = await api.get(`/users/following/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Bir hata oluştu' };
  }
};

// Takip et/takibi bırak
export const toggleFollow = async (userId) => {
  try {
    const response = await api.post(`/users/follow/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Bir hata oluştu' };
  }
};

// Takip durumunu kontrol et
export const checkFollowStatus = async (userId) => {
  try {
    const response = await api.get(`/users/check-follow/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Bir hata oluştu' };
  }
}; 