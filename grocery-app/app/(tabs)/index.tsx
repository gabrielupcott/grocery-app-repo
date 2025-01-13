import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, BackHandler, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Layout, Text, Button, List, ListItem, OverflowMenu, MenuItem, Input } from "@ui-kitten/components";
import axios, { AxiosError, AxiosResponse } from "axios";
import { API_URLS } from "@/constants/constants"; // Assuming you have a constants file
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // Import vector icons
import { FloatingAction } from "react-native-floating-action";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import PantryItem, { Item } from '@/components/pantry/PantryItem'; // Import your new component and Item type
import ItemDetailsModal from "@/components/pantry/ItemDetailsModal";
import AddItemModal from '@/components/pantry/AddItemModal';  // Import the new modal
import DeleteConfirmationModal from '@/components/pantry/DeleteConfirmationModal'; // Import the Delete Modal
import { router } from 'expo-router';
import BarcodeScannerScreen from "../../components/pantry/BarcodeScannerScreen";
import { useAuth } from '@/context/AuthContext';

const actions = [
  {
    text: "Scan Barcode",
    icon: require("../../assets/images/barcode_icon.png"), // Replace with your barcode icon
    name: "scan_barcode",
    position: 1,
    color: '#000000', // Background color of the action button
    textColor: '#000000', // Text color for the label
  },
  {
    text: "Add Manually",
    icon: require("../../assets/images/keyboard_icon.png"), // Replace with your keyboard icon
    name: "add_manually",
    position: 2,
    color: '#000000', // Background color of the action button
    textColor: '#000000', // Text color for the label
  }
];

const Pantry: React.FC = () => {
  const layout = useWindowDimensions();
  const { token, userId, userName, logout } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null); // Track active menu
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [stockFilter, setStockFilter] = useState<'InStock' | 'AllOut'>('InStock'); // Track the stock filter
  const [modalVisible, setModalVisible] = useState<boolean>(false); // View/Edit Modal visibility
  const [addItemModalVisible, setAddItemModalVisible] = useState<boolean>(false); // Add Modal visibility
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); // For delete confirmation modal

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false); // State for refreshing
  const [barcodeScanning, setBarcodeScanning] = useState<boolean>(false);

  const handleBackPress = () => {
    Alert.alert(
      'Log out?',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: 'Log out',
          onPress: () => logout(),
        },
      ],
      { cancelable: false }
    );
    return true;
  };

  const loadUserData = async () => {
    if (token && userId) {
      try {
        const response = await axios.get(`${API_URLS.GET_ITEMS_BY_USER}/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setItems(response.data.items);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    loadUserData();

    return () => backHandler.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData(); // Re-fetch the data
    setRefreshing(false); // Set refreshing to false after data is fetched
  };

  const handleDeleteConfirm = async () => {
    if (selectedItem && token) {
      try {
        await axios.delete(`${API_URLS.ADD_ITEM}/${selectedItem.item_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // Remove the item from the list after successful deletion
        setItems(prevItems => prevItems.filter(item => item.item_id !== selectedItem.item_id));
        setDeleteModalVisible(false);
        setSelectedItem(null);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const handleDelete = (item: Item) => {
    setSelectedItem(item);
    setDeleteModalVisible(true); // Show delete confirmation modal
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setSelectedItem(null);
  };

  const handleAddManually = () => {
    setAddItemModalVisible(true);
  };

  const handleItemAdded = () => {
    onRefresh();
  };

  const filterItems = () => {
    return items
      .filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(item => stockFilter === 'InStock' ? item.item_stock > 0 : item.item_stock <= 0); // Sorting items by stock status
  };

  const renderIcon = (props: any) => <Icon {...props} name="ellipsis-vertical-outline" />;

  const renderItem = ({ item }: { item: Item }) => (
    <ListItem
      title={`${item.item_name}`}
      description={`${item.item_stock} in stock`}
      accessoryRight={() => (
        <OverflowMenu
          anchor={renderIcon}
          visible={activeItemId === item.item_id && selectedItem?.item_id === item.item_id}
          onBackdropPress={() => setActiveItemId(null)}>
          <MenuItem title="Edit" onPress={() => handleEdit(item)} />
          <MenuItem title="Delete" onPress={() => handleDelete(item)} />
        </OverflowMenu>
      )}
      onPress={() => {
        setSelectedItem(item);
        setActiveItemId(item.item_id);
        // setVisible(true);
      }}
    />
  );

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true); // Show modal
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const handleEdit = (item: Item) => {
    setActiveItemId(null);
    onRefresh(); // Refresh the data
  };

  if (barcodeScanning)
    return (
      <BarcodeScannerScreen onClose={() => {setBarcodeScanning(false);onRefresh()}} />
    )

  return (
    <Layout style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Button
            style={styles.logoutButton}
            appearance="ghost"
            status="danger"
            onPress={logout}
          >
            Log out
          </Button>

          <Text category="h4" style={styles.headerText}>
            Your Pantry
          </Text>
        </View>

        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon size={24} {...props} name="search-outline" />}
          style={styles.searchBar}
        />

        <SegmentedControl
          values={['In Stock', 'All Out']}
          selectedIndex={stockFilter === 'InStock' ? 0 : 1}
          onChange={(event: { nativeEvent: { selectedSegmentIndex: number } }) => {
            setStockFilter(event.nativeEvent.selectedSegmentIndex === 0 ? 'InStock' : 'AllOut');
          }}
        />

        <FlatList
          data={filterItems()}
          keyExtractor={(item) => item.item_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleItemPress(item)}>
              <PantryItem
                item={item}
                onEdit={() => handleItemPress(item)}
                onDelete={() => handleDelete(item)} // Trigger delete modal
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={items.length === 0 ? styles.noItemsContainer : undefined}
          ListEmptyComponent={<Text category="p1" style={styles.noItemsText}>{loading ? "Loading..." : "No items found."}</Text>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        />

        <DeleteConfirmationModal
          visible={deleteModalVisible}
          onClose={closeDeleteModal}
          onDelete={handleDeleteConfirm} // Trigger the delete API call
          itemName={selectedItem?.item_name || ""}
        />

        <ItemDetailsModal
          visible={modalVisible}
          item={selectedItem}
          onClose={closeModal}
          onEdit={handleEdit}
        />

        <AddItemModal
          visible={addItemModalVisible}
          onClose={() => setAddItemModalVisible(false)}
          onAdd={handleItemAdded}
          token={token}
          userId={userId}
          setBarcodeScanning={() => null}
        />

        <FloatingAction
          actions={actions}
          color="#000000"

          onPressItem={name => {
            if (name === "scan_barcode") {
              console.log("Scan Barcode");
              // router.replace("/BarcodeScannerScreen");
              setBarcodeScanning(true);
            } else if (name === "add_manually") {
              console.log("Add Manually");
              handleAddManually(); // Trigger AddItemModal
            }
          }}
        />

      </SafeAreaView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerText: {
    marginBottom: 20,
    textAlign: "center",
  },
  headerContainer: {
    alignItems: 'center', // Centers the "Your Pantry" text
    justifyContent: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
  },
  searchBar: {
    marginBottom: 20,
  },
  noItemsContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noItemsText: {
    textAlign: "center",
    marginTop: 20,
  },
  actionButton: {
    position: "absolute",
    right: 30,
    bottom: 30,
  },
  actionButtonIcon: {
    fontSize: 20,
    height: 22,
    color: 'white',
  },
});

export default Pantry; 