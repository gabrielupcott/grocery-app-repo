import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, Modal, TextInput, RefreshControl } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import { API_URLS } from "../../constants/constants";
import StoreListItem from '@/components/stores/StoreListItem';
import { FloatingAction } from "react-native-floating-action";
import { Text, Button } from '@ui-kitten/components';
import DeleteConfirmationModal from "../pantry/DeleteConfirmationModal";

interface Store {
  store_id: string;
  store_name: string;
  store_location: string;
  store_flyer_link: string;
  latitude: number;
  longitude: number;
}

interface OwnerStoresProps {
  userId: string | null;
  token: string | null;
}

const OwnerStores: React.FC<OwnerStoresProps> = ({ userId, token }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  // States for the Add, Edit, and Delete modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  
  // Fields for creating and editing a store
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [storeFlyerLink, setStoreFlyerLink] = useState('');
  const [isLocationValid, setIsLocationValid] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isFlyerLinkValid, setIsFlyerLinkValid] = useState<boolean | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const actions = [
    {
      text: "Add New Store",
      icon: require("../../assets/images/add_icon.png"),
      name: "add_store",
      position: 1,
      color: "#000000",
      textColor: "#000000",
    },
  ];

  useEffect(() => {
    const getUserIdByEmail = async () => {
      try {
        if (userId && token) {
          const response = await axios.get(API_URLS.GET_USERID_BY_EMAIL + "?email=" + userId, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setOwnerId(response.data.user_id);
        }
      } catch (error) {
        console.error("Error fetching user ID by email:", error);
      }
    };
    getUserIdByEmail();
  }, [userId, token]);

  useEffect(() => {
    if (ownerId && !refreshing) {
      fetchStoresByOwner(ownerId, token, true);
    }
  }, [ownerId]);

  const fetchStoresByOwner = async (ownerId: string, authToken: string | null, isInitialLoad = false) => {
    try {
      if (isInitialLoad) setInitialLoading(true);
      const response = await axios.get(`${API_URLS.GET_STORES_BY_OWNER}/${ownerId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const storePromises = response.data.stores.map(async (store: Store) => {
        if (!store.latitude || !store.longitude) {
          const coordsResponse = await axios.get(`${API_URLS.GET_USER_LOCATION_COORDINATES}`, {
            params: { address: store.store_location },
            headers: { Authorization: `Bearer ${authToken}` },
          });
          return {
            ...store,
            latitude: coordsResponse.data.latitude,
            longitude: coordsResponse.data.longitude,
          };
        }
        return store;
      });

      const storesWithCoordinates = await Promise.all(storePromises);
      setStores(storesWithCoordinates);

      if (storesWithCoordinates.length > 0) {
        const firstStore = storesWithCoordinates[0];
        setUserCoordinates({
          latitude: firstStore.latitude,
          longitude: firstStore.longitude,
        });
      }
    } catch (error) {
      console.error("Failed to load stores by owner:", error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveStore = async () => {
    if (!isLocationValid) {
      await verifyLocation(storeLocation);
    }
    
    if (isLocationValid && isFlyerLinkValid && ownerId) {
      try {
        const newStoreData = {
          store_name: storeName,
          store_location: storeLocation,
          store_flyer_link: storeFlyerLink,
          store_owner_id: ownerId,
        };

        await axios.post(API_URLS.CREATE_STORE, newStoreData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStoreName('');
        setStoreLocation('');
        setStoreFlyerLink('');
        setIsModalVisible(false);
        setInitialLoading(true);

        if (ownerId) {
          await fetchStoresByOwner(ownerId, token);
        }
      } catch (error: any) {
        setLocationError(error.response.data.detail);
        setIsLocationValid(false);
        console.error("Failed to add new store:", error);
      }
    }
  };

  const handleEditStore = async () => {
    if (!isLocationValid) {
      await verifyLocation(storeLocation);
    }

    if (isLocationValid && isFlyerLinkValid && storeId) {
      try {
        const updatedStoreData = {
          store_name: storeName,
          store_location: storeLocation,
          store_flyer_link: storeFlyerLink,
        };

        await axios.put(`${API_URLS.UPDATE_STORE}/${storeId}`, updatedStoreData, 
          { headers: { Authorization: `Bearer ${token}` }
        });
        

        setIsEditModalVisible(false);
        setInitialLoading(true);
        if (ownerId) {
          await fetchStoresByOwner(ownerId, token);
        }
      } catch (error: any) {
        console.error("Failed to update store:", error);
      }
    }
  };

  const handleDeleteStore = async () => {
    if (storeId) {
      try {
        await axios.delete(`${API_URLS.DELETE_STORE}/${storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsDeleteModalVisible(false);
        setIsEditModalVisible(false);
        setInitialLoading(true);
        setStoreName('');
        setStoreLocation('');
        setStoreFlyerLink('');
        if (ownerId) {
          await fetchStoresByOwner(ownerId, token);
        }
      } catch (error) {
        console.error("Failed to delete store:", error);
      }
    }
  };

  const openEditModal = (store: Store) => {
    setStoreId(store.store_id);
    setStoreName(store.store_name);
    setStoreLocation(store.store_location);
    setStoreFlyerLink(store.store_flyer_link);
    setIsEditModalVisible(true);
    setHasChanges(false); // Reset change tracking
  };

  const verifyLocation = async (location: string) => {
    try {
      const response = await axios.post(`${API_URLS.VERIFY_LOCATION}?address=${location}`, {
        headers: { Authorization: `Bearer ${token}` },
      }
      );
      if (response.status === 200 && response.data.found) {
        setIsLocationValid(true);
        setLocationError("");
      } else {
        setIsLocationValid(false);
        setLocationError("Location not found. Please enter a valid address.");
      }
    } catch (error) {
      setIsLocationValid(false);
      setLocationError("Location verification failed. Please try a different address.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (ownerId && token) {
      await fetchStoresByOwner(ownerId, token);
    }
    setRefreshing(false);
  };

  const validateFlyerLink = (link: string) => {
    const urlPattern = new RegExp(
      "^(https?:\\/\\/)" +
      "((([a-zA-Z0-9\\-]+\\.)+[a-zA-Z]{2,})" +
      "|((\\d{1,3}\\.){3}\\d{1,3}))" +
      "(\\:\\d+)?(\\/[-a-zA-Z0-9@:%_\\+.~#?&//=]*)?$",
      "i"
    );
    setIsFlyerLinkValid(urlPattern.test(link));
  };

  const handleCancel = () => {
    setStoreName('');
    setStoreLocation('');
    setStoreFlyerLink('');
    setIsLocationValid(null);
    setIsFlyerLinkValid(null);
    setIsModalVisible(false);
    setIsEditModalVisible(false);
    setIsDeleteModalVisible(false);
  }

  const isSaveButtonEnabledCreate = isFlyerLinkValid;
  const isSaveButtonEnabledEdit = hasChanges && isFlyerLinkValid;

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.loadingText}>Loading your stores...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text category="h4" style={styles.headerText}>Your Stores</Text>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userCoordinates ? userCoordinates.latitude : 33.5186,
          longitude: userCoordinates ? userCoordinates.longitude : -86.8104,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {stores.map((store) => (
          <Marker
            key={store.store_id}
            coordinate={{ latitude: store.latitude, longitude: store.longitude }}
            title={store.store_name}
          />
        ))}
      </MapView>

      <FlatList
        data={stores}
        keyExtractor={(store) => store.store_id}
        renderItem={({ item }) => (
          <StoreListItem
            store={item}
            onOpenFlyer={() => openEditModal(item)}
            mode="edit"
          />
        )}
        contentContainerStyle={styles.storeList}
        ListHeaderComponent={<Text category="h5" style={styles.listHeader}>Stores</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Add New Store Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text category="h5" style={styles.modalTitle}>Add New Store</Text>
          <TextInput
            style={styles.input}
            placeholder="Store Name"
            value={storeName}
            onChangeText={setStoreName}
          />
          <TextInput
            style={styles.input}
            placeholder="Store Location"
            value={storeLocation}
            onChangeText={(text) => {
              setStoreLocation(text);
              setIsLocationValid(null);
            }}
          />
          {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Flyer Link"
            value={storeFlyerLink}
            onChangeText={(text) => {
              setStoreFlyerLink(text);
              validateFlyerLink(text);
            }}
          />
          {isFlyerLinkValid === false && storeFlyerLink ? (
            <Text style={styles.errorText}>Invalid flyer link URL.</Text>
          ) : null}

          <View style={styles.actionButtons}>
            <Button style={styles.cancelButton} appearance="outline" onPress={handleCancel}>
              Cancel
            </Button>
            <Button
              style={styles.saveButton}
              onPress={handleSaveStore}
              disabled={!isSaveButtonEnabledCreate}
            >
              Create Store
            </Button>
          </View>
        </View>
      </Modal>

      {/* Edit Store Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text category="h5" style={styles.modalTitle}>Edit Store</Text>
          <TextInput
            style={styles.input}
            placeholder="Store Name"
            value={storeName}
            onChangeText={(text) => {
              setStoreName(text);
              setHasChanges(true);
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Store Location"
            value={storeLocation}
            onChangeText={(text) => {
              setStoreLocation(text);
              setIsLocationValid(null);
              setHasChanges(true);
            }}
          />
          {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Flyer Link"
            value={storeFlyerLink}
            onChangeText={(text) => {
              setStoreFlyerLink(text);
              validateFlyerLink(text);
              setHasChanges(true);
            }}
          />
          {isFlyerLinkValid === false && storeFlyerLink ? (
            <Text style={styles.errorText}>Invalid flyer link URL.</Text>
          ) : null}

          <View style={styles.actionButtons}>
            <Button style={styles.cancelButton} appearance="outline" onPress={handleCancel}>
              Cancel
            </Button>
            <Button
              style={styles.saveButton}
              onPress={handleEditStore}
              disabled={!isSaveButtonEnabledEdit}
            >
              Save Changes
            </Button>
          </View>
          <View style={styles.actionButtons}>
            <Button style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)}>
              Delete Store
            </Button>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onDelete={handleDeleteStore}
        itemName={storeName}
      />

      {/* Floating Action Button */}
        <FloatingAction
          actions={actions}
          color="#000000"
          onPressItem={() => setIsModalVisible(true)}
        />

      <View style={StyleSheet.absoluteFill}>
        <Button
          testID="add-store-button"
          style={styles.hiddenButton}
          onPress={() => setIsModalVisible(true)}
        >
        </Button>
      </View>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { height: "50%", width: "100%" },
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
  modalContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginHorizontal: 10,
  },
  hiddenButton: {
    opacity: 0,
    height: 0,
    width: 0,
  },
  deleteButton: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: '#FF0000',
  },
  saveButton: {
    flex: 1,
    marginHorizontal: 10,
  },
});

export default OwnerStores;
