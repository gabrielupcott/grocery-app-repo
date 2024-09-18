import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
// import BottomNavigator from "./src/navigation/BottomNavigator";
// import { createStackNavigator } from "@react-navigation/stack";
// import Landing from "./src/navigation/auth/Landing";
// import Login from "./src/navigation/auth/Login";
// import Register from "./src/navigation/auth/Register";
// import Verify from "./src/navigation/auth/Verify";
import * as eva from "@eva-design/eva";
import { ApplicationProvider, Layout,  } from "@ui-kitten/components";
import { default as theme } from "../theme/custom-theme.json"; // <-- Import app theme
import { default as mapping } from "../mapping.json"; // <-- Import app mapping
import { useFonts } from "expo-font";
// import { RootSiblingParent } from "react-native-root-siblings";

export const CustomText = ({ children }: PropsWithChildren) => <Text>{children}</Text>;



export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <CustomText>Welcomes!</CustomText>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
