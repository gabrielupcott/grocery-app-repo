import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
// import Pantry from "../screens/bottom/Pantry";
// import Lists from "../screens/bottom/Lists";
// import Stores from "../screens/bottom/Stores";
import { StyleSheet } from "react-native";


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // headerShown: route.name === "Create" ? false : true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "";
          if (route.name === "index") {
            iconName = focused ? "inventory-2" : "inventory-2";
          } else if (route.name === "Lists") {
            iconName = focused ? "list" : "list";
          } else if (route.name === "Stores") {
            iconName = focused ? "location-on" : "location-on";
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarShowLabel: false,
      })}>
      <Tabs.Screen name="index"/>
      <Tabs.Screen name="Lists"/>
      <Tabs.Screen name="Stores"/>
    </Tabs>
  );
}

// // You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
// function TabBarIcon(props: {
//   name: React.ComponentProps<typeof FontAwesome>['name'];
//   color: string;
// }) {
//   return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
// }

// export default function TabLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <Tabs
//       screenOptions={{
//         tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
//         // Disable the static render of the header on web
//         // to prevent a hydration error in React Navigation v6.
//         headerShown: useClientOnlyValue(false, true),
//       }}>
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Tab One',
//           tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
//           headerRight: () => (
//             <Link href="/modal" asChild>
//               <Pressable>
//                 {({ pressed }) => (
//                   <FontAwesome
//                     name="info-circle"
//                     size={25}
//                     color={Colors[colorScheme ?? 'light'].text}
//                     style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
//                   />
//                 )}
//               </Pressable>
//             </Link>
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="two"
//         options={{
//           title: 'Tab Two',
//           tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
//         }}
//       />
//     </Tabs>
//   );
// }
