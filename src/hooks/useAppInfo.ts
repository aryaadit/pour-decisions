import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AppInfo {
  version: string;
  build: string;
}

export const useAppInfo = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    const getAppInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await App.getInfo();
          setAppInfo({
            version: info.version,
            build: info.build,
          });
        } catch (error) {
          console.error('Failed to get app info:', error);
          setAppInfo({ version: 'dev', build: '0' });
        }
      } else {
        // Web fallback - use a placeholder or env variable
        setAppInfo({ version: 'web', build: '0' });
      }
    };

    getAppInfo();
  }, []);

  return appInfo;
};
