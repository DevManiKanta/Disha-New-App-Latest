import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add any custom fonts here if needed
  });
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      // Wait for fonts to load
      if (fontsLoaded) {
        // Ensure splash shows for at least 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, [fontsLoaded]);

  if (!appReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}
