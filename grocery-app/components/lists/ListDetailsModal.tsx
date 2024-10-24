import React, { useState, useEffect } from 'react';
import { View, Modal, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Input, Button } from '@ui-kitten/components';
import axios from 'axios';
import { API_URLS } from '../../constants/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // For the filter icon
import PantryItemAddList from '@/components/lists/PantryItemAddList'; // Use PantryItemAddList component
import ItemDetailsListModal from './ItemDetailsListModal'; // Import the ItemDetailsListModal
import AddNewItemModal from './AddNewItemModal'; // Import AddNewItemModal
import * as SecureStore from 'expo-secure-store';
import ListShopModal from './ListShopModal'; // Import ListShopModal
import { router } from 'expo-router';

type ListDetailsModalProps = {
  visible: boolean;
  listId: string | null;
  name: string | null;
  onClose: () => void;
  token: string | null;
};

export type ListItem = {
  item_id: string;
  item_name: string;
  item_description: string;
  item_nutrition: string;
  item_price: number;
  item_stock: number;
  item_type: string;
  item_image: string;
  user_id: string;
  amount: number;
  isChecked?: boolean;  // New field to track if the item is checked in the shopping list
};

const ListDetailsModal: React.FC<ListDetailsModalProps> = ({ visible, listId, name, onClose, token }) => {
  if (!visible) return null;

  const [items, setItems] = useState<ListItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null); // Track the selected item
  const [modalVisible, setModalVisible] = useState<boolean>(false); // View/Edit Modal visibility
  const [refreshing, setRefreshing] = useState(false); // State for refreshing
  const [editMode, setEditMode] = useState<boolean>(false); // Edit mode for the list
  const [newList, setNewList] = useState<ListItem[]>([]);
  const [addListModalVisible, setAddListModalVisible] = useState<boolean>(false); // State for showing AddNewItemModal
  const [shopModalVisible, setShopModalVisible] = useState<boolean>(false); // State for showing ListShopModal

  useEffect(() => {
    if (visible && listId && token) {
      fetchListItems();
    }
  }, [visible, listId, token]);

  const fetchListItems = async () => {
    setUserId(await SecureStore.getItemAsync('user_id'));
    try {
      setLoading(true);
      const response = await axios.get(`${API_URLS.GET_LIST_BY_ID}/${listId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems(response.data.items);
      setNewList(response.data.items);
    } catch (error) {
      console.error('Error fetching list items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemAmountChange = (item: ListItem, newAmount: number) => {
    if (Number.isNaN(newAmount)) return;
    const updatedList = newList.map((i) =>
      i.item_id === item.item_id ? { ...i, amount: newAmount } : i
    );
    setNewList(updatedList);
  };

  const handleItemPress = (item: ListItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const onRefresh = async () => {
    if (editMode) return;
    setRefreshing(true);
    await fetchListItems();
    setRefreshing(false);
  };

  const filterItems = () => {
    return editMode
      ? newList.filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
      : items.filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  // Opens the shopping modal when the "Shop List" button is pressed
  const handleShopList = () => {
    setShopModalVisible(true);  // Open the shopping list modal
  };

  // Updates the list when the user is done shopping
  const handleShopDone = (updatedItems: ListItem[]) => {
    setNewList(updatedItems);  // Update the list after shopping
    setShopModalVisible(false);  // Close the shopping modal
    onClose();  // Close the list details modal
  };

  const handleSaveList = async () => {
    // Implementation for saving the list
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    fetchListItems(); // Reset the list to the original state
    onRefresh();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text category="h4" style={styles.headerText}>
            {editMode ? "Editing " : ""}{name ? `"${name}"` : ""}
          </Text>
          <TouchableOpacity style={styles.editButton} onPress={() => { editMode ? handleCancelEdit() : setEditMode(true) }}>
            <Icon name="pencil-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search items in list..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchBar}
        />

        {/* Item List */}
        <FlatList
          data={filterItems()}
          keyExtractor={(item) => item.item_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleItemPress(item)}>
              <PantryItemAddList
                editable={editMode}
                item={item}
                onAdd={null}
                onDelete={() => { }}  // Handle item remove if needed
                inList={items.includes(item)}
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={items.length === 0 ? styles.noItemsContainer : undefined}
          ListEmptyComponent={<Text category="p1" style={styles.noItemsText}>{loading ? "Loading..." : "You have no items, try adding some."}</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />

        {/* Item Details Modal */}
        {selectedItem && (
          <ItemDetailsListModal
            visible={modalVisible}
            item={selectedItem}
            onClose={() => setModalVisible(false)}
            onItemAmountChange={handleItemAmountChange}
            editable={editMode}
          />
        )}

        {/* ListShopModal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={shopModalVisible}
          onRequestClose={onClose}
          style={{ flex: 1, justifyContent: 'center' }} // Add this to ensure full-screen display
        >
          <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
            <ListShopModal
              visible={shopModalVisible}
              listItems={newList.map(item => ({ ...item, isChecked: false }))}
              onClose={() => {setShopModalVisible(false); onClose()}}
              onDone={handleShopDone}
            />
          </SafeAreaView>
        </Modal>

        {/* Buttons for Cancel and Shop List */}
        <View style={styles.actionButtons}>
          <Button style={styles.noButton} appearance="outline" onPress={editMode ? handleCancelEdit : onClose}>
            {editMode ? "Cancel" : "Close"}
          </Button>
          <Button style={styles.yesButton} onPress={editMode ? handleSaveList : handleShopList}>
            {editMode ? "Save List" : "Shop List"}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editButton: {
    position: 'absolute',
    right: 10,
  },
  headerText: {
    textAlign: "center",
    flex: 1,
    fontSize: 20,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  noButton: {
    flex: 1,
    marginHorizontal: 10,
  },
  yesButton: {
    flex: 1,
    marginHorizontal: 10,
  },
});

export default ListDetailsModal;
