import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Layout, Text, Button, List, ListItem, OverflowMenu, MenuItem, Input } from "@ui-kitten/components";
import axios, { AxiosError, AxiosResponse } from "axios";
import { API_URLS } from "@/constants/constants"; // Assuming you have a constants file
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons'; // Import vector icons
import { FloatingAction } from "react-native-floating-action";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import PantryItem, { Item } from '@/components/pantry/PantryItem'; // Import your new component and Item type
import ItemDetailsModal from "@/components/pantry/ItemDetailsModal";

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

const Pantry: React.FC = ({

}) => {
  const layout = useWindowDimensions();
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null); // Track active menu
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [stockFilter, setStockFilter] = useState<'InStock' | 'AllOut'>('InStock'); // Track the stock filter
  const [modalVisible, setModalVisible] = useState<boolean>(false); // Modal visibility

  useEffect(() => {
    const loadUserData = async () => {
      const storedUserName = await SecureStore.getItemAsync("userName");
      const storedToken = await SecureStore.getItemAsync("token");
      const storedUserId = await SecureStore.getItemAsync("user_id");

      setUserName(storedUserName);
      setToken(storedToken);
      setUserId(storedUserId);

      if (storedToken) {

        try {
          if (!storedUserId) {
            console.error("User ID not found.");
            return;
          }
          const response = await axios.get(`${API_URLS.GET_ITEMS_BY_USER}/${storedUserId}`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          setItems(response.data.items);
          console.log("Items:", response.data.items);
        } catch (error) {
          console.error("Error fetching items:", error);
        }
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("userName");
    await SecureStore.deleteItemAsync("token");
    router.push("/Login");
  };

  const filterItems = () => {
    return items
      .filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(item => stockFilter === 'InStock' ? item.item_stock > 0 : item.item_stock <= 0 ); // Sorting items by stock status
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
    // Handle edit functionality here
  };

  const handleDelete = (item: Item) => {
    setActiveItemId(null);
    // Handle delete functionality here
  };

  return (
    <Layout style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <Text category="h4" style={styles.headerText}>
        Your Pantry
      </Text>

      {/* Search bar */}
      <Input
        placeholder="Search items..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
        style={styles.searchBar}
      />

      {/* In Stock and All Out buttons */}
      <SegmentedControl
        values={['In Stock', 'All Out']}
        selectedIndex={stockFilter === 'InStock' ? 0 : 1}
        onChange={(event: { nativeEvent: { selectedSegmentIndex: number } }) => {
          setStockFilter(event.nativeEvent.selectedSegmentIndex === 0 ? 'InStock' : 'AllOut');
        }}
      />

      {/* FlatList for items */}
      <FlatList
        data={filterItems()}
        keyExtractor={(item) => item.item_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleItemPress(item)}>
            <PantryItem
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
        </TouchableOpacity>
        )}
        contentContainerStyle={items.length === 0 ? styles.noItemsContainer : undefined}
        ListEmptyComponent={<Text category="p1" style={styles.noItemsText}>You have no items, try adding some.</Text>}
      />

      {/* Item Details Modal */}
      <ItemDetailsModal
          visible={modalVisible}
          item={selectedItem}
          onClose={closeModal}
          onEdit={handleEdit}
        />

      <FloatingAction
        actions={actions}
        color="#000000"
        
        onPressItem={name => {
          if (name === "scan_barcode") {
            console.log("Scan Barcode");
          } else if (name === "add_manually") {
            console.log("Add Manually");
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
