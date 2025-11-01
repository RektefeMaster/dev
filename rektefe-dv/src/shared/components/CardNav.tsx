import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
// import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
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
    isEmergency?: boolean;
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
  maxItems = 10,
}) => {
  console.log('🔍 CardNav: Component render edildi, items sayısı:', items.length);
  console.log('🔍 CardNav: Items:', items.map(item => ({ id: item.id, label: item.label, linksCount: item.links?.length || 0 })));
  const { colors } = useTheme();
  
  // Fallback colors if theme is not loaded
  const safeColors = colors || {
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
  const cardsAnim = useRef(items.slice(0, maxItems).map(() => new Animated.Value(50))).current;
  const opacityAnim = useRef(items.slice(0, maxItems).map(() => new Animated.Value(0))).current;
  
  // Hamburger animasyonları
  const hamburgerLine1Anim = useRef(new Animated.Value(0)).current;
  const hamburgerLine2Anim = useRef(new Animated.Value(0)).current;
  const hamburgerRotation = useRef(new Animated.Value(0)).current;
  
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const calculateHeight = () => {
    if (isMobile) {
      // Mobile için dinamik yükseklik hesaplama - daha kompakt
      const topBar = 60;
      const padding = 16;
      const cardHeight = 80; // Her kart için daha küçük yükseklik
      const contentHeight = items.slice(0, maxItems).length * cardHeight;
      return topBar + contentHeight + padding;
    }
    return 200; // Desktop için daha küçük sabit yükseklik
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
        ...cardsAnim.map((cardAnim, index) =>
          Animated.spring(cardAnim, {
            toValue: 0,
            tension: 120,
            friction: 8,
            delay: index * 80,
            useNativeDriver: true,
          })
        ),
        ...opacityAnim.map((opacityAnim, index) =>
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
        ...cardsAnim.map((cardAnim, index) =>
          Animated.timing(cardAnim, {
            toValue: 50,
            duration: 200,
            delay: index * 30,
            useNativeDriver: true,
          })
        ),
        ...opacityAnim.map((opacityAnim, index) =>
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

  const handleItemPress = (item: NavItem) => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onItemPress?.(item);
  };

  const handleLinkPress = (link: { label: string; href?: string; onPress?: () => void }) => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (link.onPress) {
      link.onPress();
    } else if (link.href) {
      onLinkPress?.(link);
    }
  };

  const handleCtaPress = () => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCtaPress?.();
  };

  // Animasyon değerlerini sıfırla
  useEffect(() => {
    heightAnim.setValue(60);
    cardsAnim.forEach(anim => anim.setValue(50));
    opacityAnim.forEach(anim => anim.setValue(0));
  }, [items]);

  const displayItems = items.slice(0, maxItems);

  // Helper functions
  const getCardIcon = (id: string) => {
    switch (id) {
      case 'appointments': return 'calendar-clock';
      case 'financial': return 'wallet';
      case 'profile': return 'account-cog';
      case 'services': return 'wrench';
      case 'messages': return 'message-text';
      case 'settings': return 'cog';
      default: return 'folder';
    }
  };

  const getCardSubtitle = (id: string) => {
    switch (id) {
      case 'appointments': return 'Randevu yönetimi';
      case 'financial': return 'Gelir ve ödemeler';
      case 'profile': return 'Hesap ayarları';
      case 'services': return 'Servis kategorileri';
      case 'messages': return 'Müşteri iletişimi';
      case 'settings': return 'Uygulama ayarları';
      default: return 'Kategori';
    }
  };

  const getLinkIcon = (label: string) => {
    if (label.includes('ACİL') || label.includes('Acil')) return 'phone-alert';
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
    if (label.includes('Çekici')) return 'truck';
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
            <BlurView
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
                backgroundColor: buttonBgColor || (safeColors.primary as any),
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
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {displayItems.map((item, index) => (
              <Animated.View
                key={`${item.label}-${index}`}
                style={[
                  styles.navCard,
                  {
                    transform: [{ translateY: cardsAnim[index] }],
                    opacity: opacityAnim[index],
                  },
                ]}
              >
                <BlurView
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
          {(() => { 
            console.log('🔍 CardNav: Links rendering başladı, item:', item.id, 'links count:', item.links.length); 
            return null as null; 
          })()}
          {item.links.map((link, linkIndex) => {
            if (link.label === 'ACİL ÇEKİCİ') {
              console.log('🚨 CardNav: ACİL ÇEKİCİ linki bulundu!', link);
            }
            return (
                      <Pressable
                        key={`${link.label}-${linkIndex}`}
                        style={({ pressed }) => [
                          styles.cardLink,
                          { 
                            backgroundColor: link.isEmergency 
                              ? '#EF4444' + '30' 
                              : colors.background.secondary + '50',
                            borderColor: link.isEmergency ? '#EF4444' : 'transparent',
                            borderWidth: link.isEmergency ? 2 : 0,
                            transform: link.isEmergency ? [{ scale: 1.05 }] : [],
                          },
                          pressed && styles.cardLinkPressed
                        ]}
                        onPress={() => handleLinkPress(link)}
                      >
                        <View style={styles.cardLinkContent}>
                          <MaterialCommunityIcons
                            name={getLinkIcon(link.label)}
                            size={18}
                            color={link.isEmergency ? '#EF4444' : safeColors.text.secondary}
                          />
                          <Text
                            style={[
                              styles.cardLinkText,
                              { 
                                color: link.isEmergency ? '#EF4444' : safeColors.text.secondary,
                                fontWeight: link.isEmergency ? '700' : '500',
                              },
                            ]}
                          >
                            {link.label}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name={link.isEmergency ? "phone-alert" : "arrow-top-right"}
                          size={16}
                          color={link.isEmergency ? '#EF4444' : safeColors.text.secondary}
                        />
                      </Pressable>
                    );
                  })}
                  </View>
                )}
                </BlurView>
              </Animated.View>
            ))}
          </ScrollView>
        )}
            </BlurView>
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
    padding: 16,
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  cardLinks: {
    gap: 12,
  },
  cardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardLinkText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.1,
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