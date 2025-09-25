import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '@/shared/theme';

const { height: screenHeight } = Dimensions.get('window');

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdropPress = true,
  animationType = 'slide',
  style,
  contentStyle,
}) => {
  const slideAnim = new Animated.Value(screenHeight);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      slideAnim.setValue(screenHeight);
    }
  }, [visible]);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
                style,
              ]}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title && (
                    <Text style={styles.title}>{title}</Text>
                  )}
                  {showCloseButton && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleClose}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={24} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <View style={[styles.content, contentStyle]}>
                {children}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.modal,
    borderTopLeftRadius: borderRadius.modal,
    borderTopRightRadius: borderRadius.modal,
    minHeight: 200,
    maxHeight: screenHeight * 0.9,
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.quaternary,
  },
  content: {
    padding: spacing.lg,
  },
});

export default Modal;
