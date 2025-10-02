import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  BlurView,
  Pressable,
} from 'react-native';
// import * as Haptics from 'expo-haptics';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { useTheme } from '@/shared/context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface NavItem {
  id: string;
  label: string;
  bgColor?: string;
  textColor?: string;
  links?: {
    label: string;
    href?: string;
    onPress?: () => void;
    ariaLabel?: string;
  }[];
}

interface CardNavProps {
  logo?: string;
  logoAlt?: string;
  items: NavItem[];
  onItemPress?: (item: NavItem) => void;
  onLinkPress?: (link: { label: string; href?: string; onPress?: () => void }) => void;
  onCtaPress?: () => void;
  ctaText?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  maxItems?: number;
}

const CardNav: React.FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items = [],
  onItemPress,
  onLinkPress,
  onCtaPress,
  ctaText = 'Get Started',
  baseColor,
  menuColor,
  buttonBgColor,
  buttonTextColor,
  maxItems = 3,
}) => {
  const { themeColors } = useTheme();
  
  // Fallback colors if theme is not loaded
  const safeColors = themeColors || {
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
    primary: '#007AFF',
    background: {
      primary: '#FFFFFF',
      secondary: '#F2F2F7',
    }
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  
  const heightAnim = useRef(new Animated.Value(60)).current;
  const cardsAnim = useRef<Animated.Value[]>([]);
  const opacityAnim = useRef<Animated.Value[]>([]);
  
  // Animasyon array'lerini items değiştiğinde güncelle
  useEffect(() => {
    cardsAnim.current = items.map(() => new Animated.Value(50));
    opacityAnim.current = items.map(() => new Animated.Value(0));
  }, [items.length]);
  
  // Hamburger animasyonları
  const hamburgerLine1Anim = useRef(new Animated.Value(0)).current;
  const hamburgerLine2Anim = useRef(new Animated.Value(0)).current;
  const hamburgerRotation = useRef(new Animated.Value(0)).current;
  
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const calculateHeight = () => {
    if (isMobile) {
      // Mobile için sabit maksimum yükseklik - scroll için
      const topBar = 60;
      const maxContentHeight = 400; // Maksimum içerik yüksekliği
      const padding = 16;
      return topBar + maxContentHeight + padding;
    }
    return 260; // Desktop için sabit yükseklik
  };

  const toggleMenu = () => {
    // Haptic feedback - disabled for now
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!isExpanded) {
      // Açma animasyonu
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      
      Animated.parallel([
        // Hamburger animasyonu - daha smooth
        Animated.spring(hamburgerLine1Anim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(hamburgerLine2Anim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(hamburgerRotation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        // Yükseklik animasyonu - daha smooth
        Animated.spring(heightAnim, {
          toValue: calculateHeight(),
          tension: 80,
          friction: 10,
          useNativeDriver: false,
        }),
        // Kartlar animasyonu - staggered effect
        ...cardsAnim.current.map((cardAnim, index) =>
          Animated.spring(cardAnim, {
            toValue: 0,
            tension: 120,
            friction: 8,
            delay: index * 80,
            useNativeDriver: true,
          })
        ),
        ...opacityAnim.current.map((opacityAnim, index) =>
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 80,
            useNativeDriver: true,
          })
        ),
      ]).start();
    } else {
      // Kapama animasyonu
      setIsHamburgerOpen(false);
      
      Animated.parallel([
        // Hamburger animasyonu
        Animated.timing(hamburgerLine1Anim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(hamburgerLine2Anim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(hamburgerRotation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        // Yükseklik animasyonu
        Animated.spring(heightAnim, {
          toValue: 70,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }),
        // Kartlar animasyonu - hızlı kapanma
        ...cardsAnim.current.map((cardAnim, index) =>
          Animated.timing(cardAnim, {
            toValue: 50,
            duration: 200,
            delay: index * 30,
            useNativeDriver: true,
          })
        ),
        ...opacityAnim.current.map((opacityAnim, index) =>
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            delay: index * 30,
            useNativeDriver: true,
          })
        ),
      ]).start(() => {
        setIsExpanded(false);
      });
    }
  };

  const handleItemPress = useCallback((item: NavItem) => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onItemPress?.(item);
  }, [onItemPress]);

  const handleLinkPress = useCallback((link: { label: string; href?: string; onPress?: () => void }) => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (link.onPress) {
      link.onPress();
    } else if (link.href) {
      onLinkPress?.(link);
    }
  }, [onLinkPress]);

  const handleCtaPress = useCallback(() => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCtaPress?.();
  }, [onCtaPress]);

  // Animasyon değerlerini sıfırla - sadece component mount olduğunda
  useEffect(() => {
    heightAnim.setValue(60);
    cardsAnim.current.forEach(anim => anim.setValue(50));
    opacityAnim.current.forEach(anim => anim.setValue(0));
  }, []); // items dependency'sini kaldırdık

  const displayItems = items; // maxItems kısıtlamasını kaldır

  // Helper functions
  const getCardIcon = (id: string) => {
    switch (id) {
      case 'appointments': return 'calendar-clock';
      case 'messages': return 'message-text';
      case 'calendar': return 'calendar-today';
      case 'financial': return 'wallet';
      case 'profile': return 'account-cog';
      case 'towing': return 'car-tow';
      case 'repair': return 'wrench';
      case 'wash': return 'water';
      case 'tire': return 'car';
      default: return 'folder';
    }
  };

  const getCardSubtitle = (id: string) => {
    switch (id) {
      case 'appointments': return 'Randevu yönetimi';
      case 'messages': return 'Müşteri iletişimi';
      case 'calendar': return 'Takvim görünümü';
      case 'financial': return 'Gelir ve ödemeler';
      case 'profile': return 'Hesap ayarları';
      case 'towing': return 'Çekici hizmetleri';
      case 'repair': return 'Tamir ve bakım';
      case 'wash': return 'Araç yıkama';
      case 'tire': return 'Lastik ve parça';
      default: return 'Kategori';
    }
  };

  const getLinkIcon = (label: string) => {
    if (label.includes('Bugün') || label.includes('Günlük')) return 'calendar-today';
    if (label.includes('Yeni') || label.includes('Oluştur')) return 'plus-circle';
    if (label.includes('Geçmiş') || label.includes('Tümü')) return 'history';
    if (label.includes('Cüzdan') || label.includes('Bakiye')) return 'wallet';
    if (label.includes('Rapor') || label.includes('Analiz')) return 'chart-line';
    if (label.includes('Ödeme') || label.includes('Fatura')) return 'credit-card';
    if (label.includes('Profil') || label.includes('Ayarlar')) return 'account-cog';
    if (label.includes('Bildirim') || label.includes('Uyarı')) return 'bell';
    if (label.includes('Yardım') || label.includes('Destek')) return 'help-circle';
    if (label.includes('Mesaj') || label.includes('Chat')) return 'message-text';
    if (label.includes('Aktif')) return 'play-circle';
    if (label.includes('Paket')) return 'package';
    if (label.includes('Durum') || label.includes('Araç')) return 'car';
    if (label.includes('Haftalık')) return 'calendar-week';
    if (label.includes('Müşteri')) return 'account';
    if (label.includes('Sohbet')) return 'chat';
    return 'arrow-right';
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.nav,
          {
            height: heightAnim,
          },
        ]}
      >
        <ExpoBlurView
          intensity={20}
          tint="light"
          style={styles.blurContainer}
        >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.hamburgerMenu,
              pressed && styles.hamburgerMenuPressed
            ]}
            onPress={toggleMenu}
          >
            <Animated.View 
              style={[
                styles.hamburgerLine, 
                { 
                  backgroundColor: menuColor || safeColors.text.primary,
                  transform: [
                    {
                      rotate: hamburgerLine1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '45deg']
                      })
                    },
                    {
                      translateY: hamburgerLine1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 6]
                      })
                    }
                  ]
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.hamburgerLine, 
                { 
                  backgroundColor: menuColor || safeColors.text.primary,
                  transform: [
                    {
                      rotate: hamburgerLine2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-45deg']
                      })
                    },
                    {
                      translateY: hamburgerLine2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -6]
                      })
                    }
                  ]
                }
              ]} 
            />
          </Pressable>

          <View style={styles.logoContainer}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <Text style={[styles.logoText, { color: safeColors.text.primary }]}>
                {logoAlt}
              </Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: buttonBgColor || safeColors.primary,
              },
              pressed && styles.ctaButtonPressed
            ]}
            onPress={handleCtaPress}
          >
            <Text
              style={[
                styles.ctaButtonText,
                { color: buttonTextColor || safeColors.background.primary },
              ]}
            >
              {ctaText}
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {isExpanded && (
          <ScrollView
            style={[styles.content, { maxHeight: 400 }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {displayItems.map((item, index) => (
              <Animated.View
                key={`${item.label}-${index}`}
                style={[
                  styles.navCard,
                  {
                    transform: [{ translateY: cardsAnim.current[index] }],
                    opacity: opacityAnim.current[index],
                  },
                ]}
              >
                <ExpoBlurView
                  intensity={15}
                  tint="light"
                  style={styles.cardBlur}
                >
                <Pressable
                  style={({ pressed }) => [
                    styles.cardHeader,
                    pressed && styles.cardHeaderPressed
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={styles.cardHeaderContent}>
                    <View style={styles.cardIconContainer}>
                      <MaterialCommunityIcons
                        name={getCardIcon(item.id)}
                        size={24}
                        color={safeColors.text.primary}
                      />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text
                        style={[
                          styles.cardLabel,
                          { color: safeColors.text.primary },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.cardSubtitle,
                          { color: safeColors.text.secondary },
                        ]}
                      >
                        {getCardSubtitle(item.id)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={safeColors.text.primary}
                    />
                  </View>
                </Pressable>

                {item.links && item.links.length > 0 && (
                  <View style={styles.cardLinks}>
                    {item.links.map((link, linkIndex) => (
                      <Pressable
                        key={`${link.label}-${linkIndex}`}
                        style={({ pressed }) => [
                          styles.cardLink,
                          { backgroundColor: safeColors.background.secondary + '50' },
                          pressed && styles.cardLinkPressed
                        ]}
                        onPress={() => handleLinkPress(link)}
                      >
                        <View style={styles.cardLinkContent}>
                          <MaterialCommunityIcons
                            name={getLinkIcon(link.label)}
                            size={18}
                            color={safeColors.text.secondary}
                          />
                          <Text
                            style={[
                              styles.cardLinkText,
                              { color: safeColors.text.secondary },
                            ]}
                          >
                            {link.label}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name="arrow-top-right"
                          size={16}
                          color={safeColors.text.secondary}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
                </ExpoBlurView>
              </Animated.View>
            ))}
          </ScrollView>
        )}
        </ExpoBlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  nav: {
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  topBar: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  hamburgerMenu: {
    width: 28,
    height: 20,
    justifyContent: 'space-between',
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  hamburgerLine: {
    height: 3,
    width: '100%',
    borderRadius: 2,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ctaButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  navCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardBlur: {
    padding: 24,
    minHeight: 140,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.7,
  },
  cardLinks: {
    gap: 12,
  },
  cardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  cardLinkText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  // Pressed states
  hamburgerMenuPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    transform: [{ scale: 0.95 }],
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  cardHeaderPressed: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    transform: [{ scale: 0.98 }],
  },
  cardLinkPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    transform: [{ scale: 0.98 }],
  },
});

export default CardNav;