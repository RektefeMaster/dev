import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonLoaderProps {
  children: React.ReactNode;
  backgroundColor?: string;
  highlightColor?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  children,
  backgroundColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
}) => {
  const sharedValue = useSharedValue(0);

  useEffect(() => {
    sharedValue.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            sharedValue.value,
            [0, 1],
            [-200, 200]
          ),
        },
      ],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {children}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={['transparent', highlightColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

interface SkeletonItemProps {
    style: StyleProp<ViewStyle>;
}

export const SkeletonItem: React.FC<SkeletonItemProps> = ({ style }) => {
    return <View style={style} />;
};


const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 4,
  },
  gradient: {
    flex: 1,
  },
}); 