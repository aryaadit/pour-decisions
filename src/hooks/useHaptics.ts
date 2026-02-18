import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const useHaptics = () => {
  const impact = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style });
    } catch (error: unknown) {
      // Silently fail on unsupported platforms
    }
  };

  const notification = async (type: NotificationType = NotificationType.Success) => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type });
    } catch (error: unknown) {
      // Silently fail on unsupported platforms
    }
  };

  const selectionChanged = async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionChanged();
    } catch (error: unknown) {
      // Silently fail on unsupported platforms
    }
  };

  return {
    impact,
    notification,
    selectionChanged,
    ImpactStyle,
    NotificationType,
  };
};
