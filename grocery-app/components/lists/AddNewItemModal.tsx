import React, { useState, useEffect } from 'react';
import { View, Modal, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Input, Button, List } from '@ui-kitten/components';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // For the filter icon
import PantryItemAddList from '@/components/lists/PantryItemAddList'; // Import PantryItemAddList component
import * as SecureStore from 'expo-secure-store';
import ItemDetailsListModal from './ItemDetailsListModal'; // Import ItemDetailsListModal
import { API_URLS } from '../../constants/constants';
import { ListItem } from './ListDetailsModal'; // Import ListItem type

type AddNewItemModalProps = {
    visible: boolean;
    onClose: () => void;
    userId: string | null;
    list: ListItem[];  // The list object
    newList: ListItem[]; // The new list object
    onSave: (newItems: ListItem[]) => void;
};

const AddNewItemModal: React.FC<AddNewItemModalProps> = ({ visible, onClose, list, newList, onSave }) => {
    const [userName, setUserName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [newListItems, setNewListItems] = useState<ListItem[]>(newList);
    const [selectedItem, setSelectedItem] = useState<ListItem | null>(null); // State for selected item
    const [modalVisible, setModalVisible] = useState<boolean>(false); // State for details modal
    const [addedItems, setAddedItems] = useState<ListItem[]>(newList);

    // console.log(list);
    useEffect(() => {
        if (visible) {
            loadUserData();
        }
    }, [visible]);

    const loadUserData = async () => {
        const storedUserName = await SecureStore.getItemAsync("userName");
        const storedToken = await SecureStore.getItemAsync("token");
        const storedUserId = await SecureStore.getItemAsync("user_id");

        setUserName(storedUserName);
        setToken(storedToken);
        setUserId(storedUserId);

        if (storedToken && storedUserId) {
            try {
                const response = await axios.get(`${API_URLS.GET_ITEMS_BY_USER}/${storedUserId}`, {
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                });
                // Need to add amount property to each item
                let itemsWithAmount = response.data.items.map((item: ListItem) => {
                    const foundItem = list.find((newItem) => newItem.item_id === item.item_id);
                    return { ...item, amount: foundItem ? foundItem.amount : 0 };
                });

                itemsWithAmount = filterItems(itemsWithAmount);

                console.log("Items with amount:", itemsWithAmount[2]);

                setItems(itemsWithAmount);
            } catch (error) {
                console.error("Error fetching items:", error);
            }
        }
        setLoading(false);
    };

    // Function to handle refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await loadUserData();
        setRefreshing(false);
    };

    const handleNewItemAdd = (item: ListItem, amount: number) => {
        // console.log("Adding new item:", item);
      
        // Update newList to include the newly added item
        // console.log("adding item", item); 
        // Need to add the amount to the item
        

        item.amount = amount;
        let oldItems = [...items];
        let index = oldItems.findIndex((i) => i.item_id === item.item_id);
        oldItems[index].amount = amount;
        setItems(oldItems);
        
        let oldList = [...newListItems];

        let oldAddedItems = [...addedItems];

        if (!oldAddedItems.find((newItem) => newItem.item_id === item.item_id)) {
            oldAddedItems.push({ ...item, amount: amount });
            setAddedItems(oldAddedItems);
        } else {
            // If in newList, update the amount
            index = oldAddedItems.findIndex((i) => i.item_id === item.item_id);
            oldAddedItems[index].amount = amount;
            setAddedItems(oldAddedItems);
        }

        // If not in newList, add it
        if (!newList.find((newItem) => newItem.item_id === item.item_id)) {
            oldList.push({ ...item, amount: amount });
            setNewListItems(oldList);
        } else {
            // If in newList, update the amount
            index = oldList.findIndex((i) => i.item_id === item.item_id);
            oldList[index].amount = amount;
            setNewListItems(oldList);
        }
        // Update newList to include the newly added item
        // console.log("adding item", item); 
      
        // setNewListItems([...newList, item]);

        // console.log("newList is now ", oldList);
      
        // Update the itemAmounts (or newItemAmounts) with the new item's amount
        // setItemAmounts(prevAmounts => ({
        //   ...prevAmounts,
        //   [item.item_id]: amount, // Add or update the amount for the newly added item
        // }));
      };

    const handleItemPress = (item: ListItem) => {
        setSelectedItem(item); // Set the selected item
        setModalVisible(true); // Show the details modal
    };

    const handleItemRemove = (item: ListItem) => {
        // console.log("Removing item:", item);

        let oldAddedItems = [...addedItems];
        oldAddedItems = oldAddedItems.filter((i) => i.item_id !== item.item_id);
        setAddedItems(oldAddedItems);

        let oldList = [...newListItems];
        oldList = oldList.filter((i) => i.item_id !== item.item_id);
        console.log("oldList", oldList);

        const oldItems = [...items];
        const index = oldItems.findIndex((i) => i.item_id === item.item_id);
        console.log("index", oldItems[index]);
        oldItems[index].amount = 0;
        
        setItems(oldItems);
        setNewListItems(oldList);
        console.log("newList", newListItems);
      }

    const handleItemAmountChange = (item: ListItem, newAmount: number) => {
        console.log("Item:", item, "New amount:", newAmount);
        if (Number.isNaN(newAmount)) {
          return;
        }
        if (newAmount <= 0) {
          // Remove from newList if the amount is 0 or less
          handleItemRemove(item);
          setModalVisible(false);
          console.log("newList", newListItems);
        } else {
          // Add or update the item's amount in the itemAmounts/newItemAmounts
          // setItemAmounts(prevAmounts => ({
          //   ...prevAmounts,
          //   [item.item_id]: newAmount,
            // })

            let oldAddedItems = [...addedItems];
            let index = oldAddedItems.findIndex((i) => i.item_id === item.item_id);
            if (index != -1) {
              oldAddedItems[index].amount = newAmount;
            } else {
                oldAddedItems.push({ ...item, amount: newAmount });
                }
            setAddedItems(oldAddedItems);


            let oldItems = [...items];
            index = oldItems.findIndex((i) => i.item_id === item.item_id);
            oldItems[index].amount = newAmount;
            setItems(oldItems);

            let oldList = [...newListItems];
            index = oldList.findIndex((i) => i.item_id === item.item_id);
            console.log("index", oldList[index]);
            if (index != -1) {
              oldList[index].amount = newAmount;
            } else {
                console.log("pushing");
                oldList.push({ ...item, amount: newAmount });
            }
            setNewListItems(oldList);

        //   // }));
        //   let oldList = [...newList];
        //   let index = oldList.findIndex((i) => i.item_id === item.item_id);
        //   oldList[index].amount = newAmount;
      
        //   setNewListItems(oldList);
        //   console.log("asdnewList", newList);
        }
      };

    const searchFilter = () => {
        return items.filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
    };

    const filterItems = (items: ListItem[]) => {
        // also filter out items already in the list UNLESS an item from list is not in newList
        return items.filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(item => !newList.find(newItem => newItem.item_id === item.item_id));
    };

    const handleSave = () => {
        console.log("Sending new items:", addedItems);
        onSave(addedItems);
        // reset the added items
        setAddedItems([]);
        // return addedItems;
        onClose(); // Close the modal
    };

    const handleClose = () => {
        addedItems.forEach((item) => {
            handleItemRemove(item);
        });
        onClose();
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.headerContainer}>
                    <Text category="h4" style={styles.headerText}>
                        Add Items to List
                    </Text>
                </View>

                {/* Search Bar */}
                <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
                    style={styles.searchBar}
                />

                {/* Item List */}
                <FlatList
                    data={searchFilter()}
                    keyExtractor={(item) => item.item_id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handleItemPress(item)}>
                            <PantryItemAddList
                                editable={true}
                                item={item}
                                onAdd={() => handleNewItemAdd(item, 1)}
                                onDelete={() => handleItemRemove(item)}
                                inList={item.amount > 0}
                            />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={items.length === 0 ? styles.noItemsContainer : undefined}
                    ListEmptyComponent={<Text category="p1" style={styles.noItemsText}>{loading ? "Loading..." : "No items found."}</Text>}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />

                {/* Item Details Modal */}
                {selectedItem &&
                    <ItemDetailsListModal
                        visible={modalVisible}
                        item={selectedItem}
                        onClose={() => setModalVisible(false)}
                        onItemAmountChange={handleItemAmountChange} // Handle item amount changes
                        editable={true}
                    />
                }

                {/* Buttons for cancel and save */}
                <View style={styles.actionButtons}>
                    <Button style={styles.cancelButton} appearance="outline" onPress={handleClose}>
                        Cancel
                    </Button>
                    <Button style={styles.saveButton} onPress={handleSave} disabled={newListItems.length === 0}>
                        Save Items
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        textAlign: "center",
        marginBottom: 20,
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
    cancelButton: {
        flex: 1,
        marginHorizontal: 10,
    },
    saveButton: {
        flex: 1,
        marginHorizontal: 10,
    },
});

export default AddNewItemModal;