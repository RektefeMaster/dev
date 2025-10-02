/**
 * JWT Token yardımcı fonksiyonları
 */

export interface TokenPayload {
  userId: string;
  userType: 'driver' | 'mechanic';
  exp: number;
  iat: number;
}

/**
 * JWT token'ı decode eder ve payload'ını döndürür
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // JWT token'ı decode et (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Payload'ı decode et
    const payload = JSON.parse(atob(parts[1]));
    return payload as TokenPayload;
  } catch (error) {
    console.error('Token decode hatası:', error);
    return null;
  }
};

/**
 * Token'ın süresinin dolup dolmadığını kontrol eder
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // Expiry time'ı kontrol et (saniye cinsinden)
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Token'ın ne kadar süre sonra dolacağını hesaplar (dakika cinsinden)
 */
export const getTokenTimeToExpiry = (token: string): number => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeToExpiry = payload.exp - currentTime;
  
  // Dakika cinsinden döndür
  return Math.max(0, Math.floor(timeToExpiry / 60));
};

/**
 * Token'ın geçerli olup olmadığını kontrol eder
 */
export const isTokenValid = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return false;
  }

  const payload = decodeToken(token);
  if (!payload) {
    return false;
  }

  // Gerekli alanları kontrol et
  if (!payload.userId || !payload.userType) {
    return false;
  }

  // Süre kontrolü
  return !isTokenExpired(token);
};

/**
 * Token'ın yenilenmesi gerekip gerekmediğini kontrol eder
 * (Son 5 dakika içinde dolacaksa true döner)
 */
export const shouldRefreshToken = (token: string): boolean => {
  const timeToExpiry = getTokenTimeToExpiry(token);
  return timeToExpiry <= 5; // Son 5 dakika
};

/**
 * Token'dan kullanıcı bilgilerini çıkarır
 */
export const getTokenUserInfo = (token: string): { userId: string; userType: string } | null => {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    userType: payload.userType
  };
};
