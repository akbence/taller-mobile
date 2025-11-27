import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

type Props = {
  message: string;
  onHide?: () => void;
  type?: 'success' | 'error';
};

export default function SlideDownBanner({ message, onHide, type }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  }, [translateY]);

  return (
    <Animated.View style={[styles.banner,
      type === 'error' ? styles.error : styles.success,
     { transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#4caf50',
    padding: 12,
    zIndex: 1000,
    elevation: 5,
  },
  success: { backgroundColor: '#4caf50' },
  error: { backgroundColor: '#f44336' },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
