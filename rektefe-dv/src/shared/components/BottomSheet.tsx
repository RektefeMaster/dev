import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import BottomSheetContent from './BottomSheetContent';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;
// Açık durumda: ekranın %25'i görünür kalacak şekilde (yani bottom sheet ekranın %75'ini kaplayacak)
const OPEN_TRANSLATE_Y = SCREEN_HEIGHT - BOTTOM_SHEET_HEIGHT;
// Kapalı durumda: tamamen ekran dışında (aşağıda)
const CLOSED_TRANSLATE_Y = SCREEN_HEIGHT;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  // Başlangıçta kapalı pozisyon (ekran dışında)
  const translateY = React.useRef(new Animated.Value(CLOSED_TRANSLATE_Y)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Önce başlangıç pozisyonuna getir (anında, ekranın dışında)
      translateY.setValue(CLOSED_TRANSLATE_Y);
      opacity.setValue(0);
      
      // Bir frame sonra animasyonu başlat (daha smooth)
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: OPEN_TRANSLATE_Y,
            useNativeDriver: true,
            tension: 85,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      // Kapanma animasyonu
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: CLOSED_TRANSLATE_Y,
          useNativeDriver: true,
          tension: 85,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panStartY = React.useRef(0);
  const isScrolling = React.useRef(false);
  const scrollYRef = React.useRef(0);
  const scrollDirectionRef = React.useRef<'up' | 'down' | null>(null);
  const lastScrollY = React.useRef(0);

  const handleScrollStart = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const handleScrollEnd = useCallback(() => {
    // Scroll bittikten kısa bir süre sonra false yap (debounce)
    setTimeout(() => {
      isScrolling.current = false;
    }, 100);
  }, []);

  const handleScroll = useCallback((scrollY: number) => {
    // Scroll direction'ı belirle
    if (scrollY > lastScrollY.current) {
      scrollDirectionRef.current = 'down';
    } else if (scrollY < lastScrollY.current) {
      scrollDirectionRef.current = 'up';
    }
    lastScrollY.current = scrollY;
    scrollYRef.current = scrollY;
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          // Scroll aktifse veya yukarı scroll yapılıyorsa pan responder devreye girmesin
          if (isScrolling.current || scrollDirectionRef.current === 'up') {
            return false;
          }
          // Sadece drag handle alanında (ilk 60px) aktif olsun
          return evt.nativeEvent.locationY < 60;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Scroll aktifse devreye girmesin
          if (isScrolling.current) return false;
          
          // Yukarı scroll yapılıyorsa devreye girmesin
          if (scrollDirectionRef.current === 'up') return false;
          
          // ScrollView en üstte değilse devreye girmesin
          if (scrollYRef.current > 20) return false;
          
          // Sadece drag handle alanında ve aşağı doğru sürükleme varsa
          if (evt.nativeEvent.locationY < 60 && gestureState.dy > 0 && Math.abs(gestureState.dy) > 10) {
            return true;
          }
          return false;
        },
        onPanResponderTerminationRequest: () => {
          // ScrollView her zaman öncelikli
          return true;
        },
        onPanResponderGrant: () => {
          translateY.stopAnimation((value) => {
            panStartY.current = value;
          });
          // Haptic feedback
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          // Sadece aşağı doğru sürükleme
          if (gestureState.dy > 0) {
            const newValue = panStartY.current + gestureState.dy;
            translateY.setValue(Math.min(newValue, CLOSED_TRANSLATE_Y));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.6) {
            // Haptic feedback on close
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            Animated.spring(translateY, {
              toValue: CLOSED_TRANSLATE_Y,
              useNativeDriver: true,
              tension: 85,
              friction: 8,
            }).start(() => {
              onClose();
            });
          } else {
            Animated.spring(translateY, {
              toValue: OPEN_TRANSLATE_Y,
              useNativeDriver: true,
              tension: 85,
              friction: 8,
            }).start();
          }
        },
      }),
    [onClose]
  );

  const overlayStyle = useMemo(
    () => [
      styles.overlay,
      {
        opacity,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
      },
    ],
    [isDark, opacity]
  );

  const bottomSheetStyle = useMemo(
    () => [
      styles.bottomSheet,
      {
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        transform: [{ translateY }],
      },
    ],
    [isDark, translateY]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated={true}
    >
      <View style={styles.container}>
        <Animated.View style={overlayStyle}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View style={bottomSheetStyle}>
          {/* Drag Handle - Pan responder buraya uygulanıyor */}
          <View 
            style={styles.dragHandleContainer}
            {...panResponder.panHandlers}
          >
            <View style={[styles.dragHandle, { backgroundColor: isDark ? theme.colors.border.tertiary : '#E5E5E5' }]} />
          </View>

          {/* Content */}
          <BottomSheetContent 
            onClose={onClose} 
            onScrollStart={handleScrollStart}
            onScrollEnd={handleScrollEnd}
            onScroll={handleScroll}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    height: BOTTOM_SHEET_HEIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});

export default React.memo(BottomSheet);