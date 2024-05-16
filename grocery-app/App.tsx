import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import BottomNavigator from "./src/navigation/BottomNavigator";
import { createStackNavigator } from "@react-navigation/stack";
import Landing from "./src/navigation/auth/Landing";
import Login from "./src/navigation/auth/Login";
import Register from "./src/navigation/auth/Register";
import Verify from "./src/navigation/auth/Verify";
import * as eva from "@eva-design/eva";
import { ApplicationProvider, Layout, Text } from "@ui-kitten/components";
import { default as theme } from "./src/theme/custom-theme.json"; // <-- Import app theme
import { default as mapping } from "./mapping.json"; // <-- Import app mapping
import { useFonts } from "expo-font";
import { RootSiblingParent } from "react-native-root-siblings";

const Stack = createStackNavigator();
//SplashScreen.preventAutoHideAsync();
let customFonts = {
  "OpenSans-Regular": require("./assets/OpenSans-Regular.ttf"),
  "Poppins-Medium": require("./assets/Poppins-Medium.ttf"),
};

export default function App() {
  const [isLoaded] = useFonts(customFonts);

  if (!isLoaded) {
    return (
      <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
        <Text>Loading...</Text>
      </ApplicationProvider>
    );
  }
  return (
    <RootSiblingParent>
      <ApplicationProvider
        {...eva}
        theme={{ ...eva.light, ...theme }}
        customMapping={mapping}
      >
        <NavigationContainer>
          <Stack.Navigator>
            {/* options={{ gestureEnabled: false }} to disable going back */}
            <Stack.Screen
              name="Landing"
              component={Landing}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={Register}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Verify"
              component={Verify}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={BottomNavigator}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ApplicationProvider>
    </RootSiblingParent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
