import React, { useState, useEffect } from 'react';
import { View, Modal, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Input, ListItem, OverflowMenu, MenuItem } from '@ui-kitten/components';
import axios from 'axios';
import { API_URLS } from '../../constants/constants';
import { useWindowDimensions } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // For the filter icon
import { FloatingAction } from "react-native-floating-action";
import DeleteConfirmationModal from '@/components/pantry/DeleteConfirmationModal'; // Import the Delete Modal
import ItemDetailsModal from "@/components/pantry/ItemDetailsModal";
import PantryItem, { Item } from '@/components/pantry/PantryItem'; // Import your new component and Item type

type ListDetailsModalProps = {
  visible: boolean;
  listId: string | null;
  name: string | null;
  onClose: () => void;
  token: string | null;
};

const ListDetailsModal: React.FC<ListDetailsModalProps> = ({ visible, listId, name, onClose, token }) => {
  if (!visible) return null;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null); // Track active menu
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false); // State for refreshing
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); // For delete confirmation modal
  const [modalVisible, setModalVisible] = useState<boolean>(false); // View/Edit Modal visibility

  // Fetch items when the modal is opened
  useEffect(() => {
    if (visible && listId && token) {
      fetchListItems();
    }
  }, [visible, listId, token]);

  const fetchListItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URLS.GET_LIST_BY_ID}/${listId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems(response.data.items);
      console.log("List items:", response.data.items);
    } catch (error) {
      console.error('Error fetching list items:', error);
    } finally {
      setLoading(false);
    }
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

   // Function to handle refresh
   const onRefresh = async () => {
    setRefreshing(true);
    fetchListItems(); // Fetch the data
    setRefreshing(false); // Set refreshing to false after data is fetched
  };

  const handleEdit = (item: Item) => {
    setActiveItemId(null);
    onRefresh(); // Refresh the data
  };

  const handleDelete = (item: Item) => {
    setSelectedItem(item);
    setDeleteModalVisible(true); // Show delete confirmation modal
  };

  const filterItems = () => {
    return items
      .filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
  };

  
  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true); // Show modal
  };


  if (!listId) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text category="h4" style={styles.headerText}>
            List {name? ": " + name : ""}
          </Text>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search items in list..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchBar}
        />

         {/* Item Details Modal */}
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
          ListEmptyComponent={<Text category="p1" style={styles.noItemsText}>{loading ? "Loading..." : "You have no items, try adding some."}</Text>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        />

      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  headerContainer: {
    alignItems: 'center', // Centers the "Your Pantry" text
    justifyContent: 'center',
  },
  headerText: {
    textAlign: "center",
    marginBottom: 20,
  },
  searchBar: {
    marginBottom: 20,
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  listTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  noListsText: {
    textAlign: "center",
    marginTop: 20,
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
});

export default ListDetailsModal;
