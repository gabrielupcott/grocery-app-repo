import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ApplicationProvider, Layout, Text } from "@ui-kitten/components";
import * as eva from "@eva-design/eva";
import { default as theme } from "../theme/custom-theme.json"; // <-- Import app theme

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// let customFonts = {
//   "OpenSans-Regular": require("./assets/fonts/OpenSans-Regular.ttf"),
//   "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
// };

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  // const [isLoaded] = useFonts(customFonts);

  // if (!isLoaded) {
  //   return (
  //     <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
  //       <CustomText>Loading...</CustomText>
  //     </ApplicationProvider>
  //   );
  // }

  return (
    <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="Login" options={{
          headerShown: false, gestureEnabled: false, // Disable swipe back gesture
        }} />
        <Stack.Screen name="Register" options={{ headerShown: false }} />
        {/* <Stack.Screen name="Verify" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
      </Stack>
    </ApplicationProvider>
  );
}
