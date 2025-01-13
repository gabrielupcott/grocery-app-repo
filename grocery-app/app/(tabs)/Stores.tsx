import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TextInput, Button, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from "react-native-maps";
import * as SecureStore from 'expo-secure-store';
import axios from "axios";
import { Text } from "@ui-kitten/components";
import { API_URLS } from "@/constants/constants";
import StoreListItem from '@/components/stores/StoreListItem';
import OwnerStores from "@/components/stores/OwnerStores";
import { useAuth } from '@/context/AuthContext';

interface Store {
  store_id: string;
  store_name: string;
  store_location: string;
  store_flyer_link: string;
  latitude: number;
  longitude: number;
}

const Stores: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { token, userName, userType } = useAuth();
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [customLocation, setCustomLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (token && userName) {
      loadStoreData();
    }
  }, [token, userName]);

  const loadStoreData = async () => {
    try {
      if (userType === 2) {
        return; // Rendering handled by OwnerStores
      } else {
        const responseLocation = await axios.get(`${API_URLS.GET_USER_LOCATION}/${userName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userAddress = responseLocation.data.user_location;
        fetchNearbyStores(userAddress, token);
      }
    } catch (error) {
      console.error("Failed to load store data:", error);
      setLoading(false);
    }
  };

  const fetchNearbyStores = async (location: string, token: string | null) => {
    
    try {
      setLoading(true);

      const userCoordsResponse = await axios.get(`${API_URLS.GET_USER_LOCATION_COORDINATES}`, {
        params: { address: location },
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUserCoordinates({
        latitude: userCoordsResponse.data.latitude,
        longitude: userCoordsResponse.data.longitude,
      });

      const storesResponse = await axios.get(`${API_URLS.NEARBY_STORES}?current_location=${location}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const storesWithCoordinates = storesResponse.data.map((store: Store) => ({
        ...store,
        latitude: store.latitude,
        longitude: store.longitude,
      }));
      setNearbyStores(storesWithCoordinates);

    } catch (error) {
      console.error("Failed to fetch nearby stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = () => {
    if (customLocation) {
      fetchNearbyStores(customLocation, token);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.loadingText}>Looking for stores...</Text>
      </View>
    );
  }
  // If user type is 2, render OwnerStores instead
  if (userType == 2) {
    return <OwnerStores userId={userName} token={token} />;
  }
  // Default Stores page rendering for non-owner users
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text category="h4" style={styles.headerText}>
          Stores
        </Text>
      </View>

      {/* Custom Location Input */}
      {/* <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter custom location"
          value={customLocation}
          onChangeText={setCustomLocation}
        />
        <Button title="CHANGE" onPress={handleLocationChange} />
      </View> */}

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userCoordinates ? userCoordinates.latitude : 33.5186,
          longitude: userCoordinates ? userCoordinates.longitude : -86.8104,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {nearbyStores.map((store) => (
          <Marker
            key={store.store_id}
            coordinate={{ latitude: store.latitude, longitude: store.longitude }}
            title={store.store_name}
          />
        ))}
      </MapView>

      {errorText ? <Text>Error: {errorText ? errorText : ""}</Text> : <FlatList
        data={nearbyStores}
        keyExtractor={(store) => store.store_id}
        renderItem={({ item }) => (
          <StoreListItem
            store={item}
            onOpenFlyer={(url) => Linking.openURL(url)}
            mode="view"
          />
        )}
        contentContainerStyle={styles.storeList}
        ListHeaderComponent={<Text category="h5" style={styles.listHeader}>Stores</Text>}
        ListEmptyComponent={<Text style={styles.listHeader}>No stores near you found...</Text>}
      />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { height: "66%", width: "100%" },
  storeList: { padding: 10, backgroundColor: "#fff" },
  listHeader: { textAlign: "center", marginBottom: 10 },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#3366FF',
  },
});

export default Stores;
