import { useState, useEffect } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

interface ResponsiveState {
  screenWidth: number;
  screenHeight: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isSmallDevice: boolean;
  isTablet: boolean;
  scale: number;
  fontScale: number;
}

export const useResponsive = () => {
  const [state, setState] = useState<ResponsiveState>(() => {
    const { width, height } = Dimensions.get('window');
    const scale = Dimensions.get('window').scale;
    const fontScale = Dimensions.get('window').fontScale;
    
    return {
      screenWidth: width,
      screenHeight: height,
      isPortrait: height >= width,
      isLandscape: width > height,
      isSmallDevice: width < 375,
      isTablet: width >= 768,
      scale,
      fontScale,
    };
  });

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setState({
        screenWidth: window.width,
        screenHeight: window.height,
        isPortrait: window.height >= window.width,
        isLandscape: window.width > window.height,
        isSmallDevice: window.width < 375,
        isTablet: window.width >= 768,
        scale: window.scale,
        fontScale: window.fontScale,
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Utility to calculate width percentage
  const wp = (percentage: number) => {
    return (percentage * state.screenWidth) / 100;
  };

  // Utility to calculate height percentage
  const hp = (percentage: number) => {
    return (percentage * state.screenHeight) / 100;
  };

  // Utility for responsive font size
  const rf = (size: number) => {
    const scale = state.screenWidth / 375; // Standard width
    const newSize = size * scale;
    if (Platform.OS === 'ios') {
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    } else {
      return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
    }
  };
  
  // Simple responsive value based on breakpoint
  const responsiveValue = <T>(mobile: T, tablet: T): T => {
    return state.isTablet ? tablet : mobile;
  };

  return {
    ...state,
    wp,
    hp,
    rf,
    responsiveValue,
  };
};
