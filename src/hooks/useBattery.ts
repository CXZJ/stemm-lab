import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';

export function useBattery() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    Battery.getBatteryLevelAsync().then(setBatteryLevel);

    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(batteryLevel);
    });

    return () => subscription.remove();
  }, []);

  return batteryLevel;
}