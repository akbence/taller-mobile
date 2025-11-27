import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

type Props = {
  message: string;
  onHide?: () => void;
  type?: 'success' | 'error' | 'info' | null ;
};

export default function SlideDownBanner({ message, onHide, type }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    console.log("LOGS: " + message + " " + type + " ")
    if(!message){
//      return
    }
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

  let bannerStyle;
  switch (type) {
    case 'error':
      bannerStyle = styles.error;
      break;
    case 'success':
      bannerStyle=styles.success;
      break
    case 'info':
    default:
      bannerStyle = styles.info;
      break;
  }

  return (
    <Animated.View style={[styles.banner,
      bannerStyle,
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
  info: { backgroundColor: '#003cffce' },
  error: { backgroundColor: '#f44336' },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
