import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Pantry from "../screens/bottom/Pantry";
import Lists from "../screens/bottom/Lists";
import Stores from "../screens/bottom/Stores";
import { StyleSheet } from "react-native";

export type RootStackParamList = {
  Pantry: undefined;
  Lists: undefined;
  Stores: undefined;
};

const Tab = createBottomTabNavigator<RootStackParamList>();

const BottomNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarHideOnKeyboard: true,
        // headerShown: route.name === "Create" ? false : true,
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "";
          if (route.name === "Pantry") {
            iconName = focused ? "inventory-2" : "inventory-2";
          } else if (route.name === "Lists") {
            iconName = focused ? "list" : "list";
          } else if (route.name === "Stores") {
            iconName = focused ? "location-on" : "location-on";
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen name="Pantry" component={Pantry} />
      <Tab.Screen name="Lists" component={Lists} />
      <Tab.Screen name="Stores" component={Stores} />
    </Tab.Navigator>
  );
};

export default BottomNavigator;

const styles = StyleSheet.create({
  header: {
    alignContent: "center",
    textAlign: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },
});
