import React, { useState, useEffect } from 'react';
import { View, Modal, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Input, OverflowMenu, MenuItem, Button } from '@ui-kitten/components';
import axios from 'axios';
import { API_URLS } from '../../constants/constants';
import { useWindowDimensions } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // For the filter icon
import { FloatingAction } from "react-native-floating-action";
import DeleteConfirmationModal from '@/components/pantry/DeleteConfirmationModal'; // Import the Delete Modal
import ItemDetailsModal from "@/components/pantry/ItemDetailsModal";
import PantryItemAddList from '@/components/lists/PantryItemAddList'; // Import your new component and Item type
import ItemDetailsListModal from './ItemDetailsListModal';
import SaveListModal from "@/components/lists/SaveListModal";
import { ListItem } from "./ListDetailsModal";

type ListDetailsModalProps = {
    visible: boolean;
    onClose: () => void;
    token: string | null;
    userId: string | null;
};

const AddListModal: React.FC<ListDetailsModalProps> = ({ visible, onClose, token, userId }) => {
    if (!visible) return null;
    const [userName, setUserName] = useState<string | null>(null);
    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeItemId, setActiveItemId] = useState<string | null>(null); // Track active menu
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false); // State for refreshing
    const [deleteModalVisible, setDeleteModalVisible] = useState(false); // For delete confirmation modal
    const [modalVisible, setModalVisible] = useState<boolean>(false); // View/Edit Modal visibility
    const [stockFilter, setStockFilter] = useState<'InStock' | 'AllOut'>('InStock'); // Track the stock filter
    // state for new list which is dict of item_id and number representing the qty of that item in the new list
    // const [newListItems, setNewListItems] = useState<{ item_id: string, amount: number }[]>([]);
    const [newListItems, setNewListItems] = useState<ListItem[]>([]);
    const [isListValid, setIsListValid] = useState<boolean>(false); // Track if the list is valid
    const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false); // Save confirmation modal
    const [name, setName] = useState<string>("");

    // Fetch items when the modal is opened
    useEffect(() => {

        loadUserData();

    }, []);

    // Use effect to check if the list is valid
    useEffect(() => {
        setIsListValid(newListItems.length > 0);
    }, [newListItems]);

    const handleAddNewList = async () => {
        try {
            // Prepare the list of item IDs with their quantities
            const itemArray = newListItems.map((item) => ({
                item_id: item.item_id,
                quantity: item.amount
            }));

            console.log("Item Array:", itemArray);  
    
            // Prepare the request payload
            const payload = {
                list_name: name,
                // Use the image of the first item in the list, if available
                list_image: items.find((item) => item.item_id === newListItems[0]?.item_id)?.item_image || null,
                user_id: userId,
                items: itemArray,  // Now sending an array of objects with item_id and quantity
            };
    
            // Send the POST request to create a new list
            const response = await axios.post(API_URLS.ADD_LIST, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,  // Assuming you have the token available
                    'Content-Type': 'application/json',
                },
            });
    
            // Handle successful response
            console.log('List created successfully:', response.data);
            onClose(); // Close the modal
    
        } catch (error) {
            // Handle any errors
            if (axios.isAxiosError(error)) {
                console.error('Error creating list:', error.response?.data || error.message);
            } else {
                console.error('Unexpected error:', error);
            }
        }
    };

    const loadUserData = async () => {

        console.log("user ID:", userId);

        try {
            const response = await axios.get(`${API_URLS.GET_ITEMS_BY_USER}/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            let items = response.data.items;
            // add amount property to each item
            items = items.map((item: ListItem) => ({ ...item, amount: 0 }));

            setItems(items);
            // console.log("Items:", response.data.items);
        } catch (error) {
            console.error("Error fetching items:", error);
        }
        setLoading(false);
    };

    // Function to handle refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await loadUserData(); // Re-fetch the data
        setRefreshing(false); // Set refreshing to false after data is fetched
    };

    const handleItemAdd = (item: ListItem) => {
        if (!item || !item.item_id) {
            console.error('Invalid item:', item);
            return; // Prevent further execution if item is invalid
        }

        // Filter out null or undefined elements from newListItems before updating
        let updatedItems = [...newListItems];

        const foundItem = updatedItems.find((newItem) => newItem.item_id === item.item_id);
        console.log("Found Item:", foundItem);

        if (foundItem) {
            foundItem.amount += 1; // Increment the amount if the item already exists
            updatedItems = updatedItems.map((newItem) => {
                if (newItem.item_id === item.item_id) {
                    return { ...newItem, amount: newItem.amount + 1 };
                }
                return newItem;
            }
            );
            let oldSelected = selectedItem;
            oldSelected = { ...item, amount: foundItem.amount };
            console.log("Old Selected:", oldSelected);
            setSelectedItem(oldSelected);
            console.log("Item found in list, updating amount");
        } else {
            console.log("Item not found in list, adding it");
            // Add the item to the list if it doesn't exist
            updatedItems = [...updatedItems, { ...item, amount: 1 }];
            let oldSelected = selectedItem;
            oldSelected = { ...item, amount: 1 };
            console.log("Old Selected:", oldSelected);
            setSelectedItem(oldSelected);
            // updatedItems = [...updatedItems, newItem]; // Add new item to the filtered array
        }

        console.log("Updated Items:", updatedItems);
        setNewListItems(updatedItems);

    };

    const handleItemAmountChange = (item: ListItem, new_amount: number) => {
        console.log('New amount:', new_amount);
        // If the amount is 0, remove the item from the list
        if (new_amount === 0) {
            handleRemoveFromList(item);
            setSelectedItem({ ...item, amount: 0 });
            return;
        }
        setSelectedItem({ ...item, amount: new_amount });

        // if item not in list, add it
        if (!newListItems.find((newItem) => newItem.item_id === item.item_id)) {
            console.log("Item not in list, adding it");
            handleItemAdd(item);
            return;
        }
        console.log("Item found in list, updating amount");
        const updatedItems = newListItems.map((newItem) => {
            if (newItem.item_id === item.item_id) {
                return { ...newItem, amount: new_amount };
            }
            return newItem;
        });
        console.log("Updated Items:", updatedItems);
        setNewListItems(updatedItems);
    }

    const handleRemoveFromList = (item: ListItem) => {
        setSelectedItem(item);
        // remove the item from the list
        const updatedItems = newListItems.filter((newItem) => newItem.item_id !== item.item_id);
        setNewListItems(updatedItems);
        // update itemAmounts

        setActiveItemId(null);
        onRefresh(); // Refresh the data
    };

    const filterItems = () => {
        return items
            .filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(item => stockFilter === 'InStock' ? item.item_stock > 0 : item.item_stock <= 0) // Sorting items by stock status
        // .filter(item => item !== null && item !== undefined && item.item_id);

    };

    const handleItemPress = (item: ListItem) => {
        if (newListItems.find((newItem) => newItem.item_id === item.item_id)) {

            setSelectedItem(newListItems.find((newItem) => newItem.item_id === item.item_id));
        } else {
            setSelectedItem(item);
        }
        setModalVisible(true); // Show modal
    };

    const handleSaveList = () => {
        setSaveModalVisible(false);
        handleAddNewList();
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.headerContainer}>
                    <Text category="h4" style={styles.headerText}>
                        Add Items to Your New List
                    </Text>
                </View>

                {/* Search Bar */}
                <Input
                    placeholder="Search items in pantry..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
                    style={styles.searchBar}
                />

                <FlatList
                    data={filterItems()}
                    // keyExtractor={(item) => item.item_id.toString()}
                    renderItem={({ item }) => (
                        item && item.item_id ? (
                            <TouchableOpacity onPress={() => handleItemPress(item)}>
                            {/* // <TouchableOpacity onPress={() => null}> */}

                                <PantryItemAddList
                                    editable={true}
                                    item={newListItems.find((newItem) => newItem.item_id === item.item_id) || item}
                                    onAdd={() => handleItemAdd(item)}
                                    onDelete={() => handleRemoveFromList(item)} // Trigger delete 
                                    // inList={false}
                                    // amount={0}
                                    inList={newListItems.find((newItem) => newItem.item_id === item.item_id) ? true : false}
                                />
                            </TouchableOpacity>
                        ) : null
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

                {/* Item Details Modal */}
                <ItemDetailsListModal
                    visible={modalVisible}
                    item={selectedItem}
                    onClose={() => setModalVisible(false)}
                    editable={true}
                    onItemAmountChange={handleItemAmountChange}
                />

                <SaveListModal
                    visible={saveModalVisible}
                    onSave={handleSaveList}
                    onChangeName={setName}
                    onCancel={() => setSaveModalVisible(false)}
                />

                {/* Buttons for cancel and create */}
                <View style={styles.actionButtons}>
                    <Button style={styles.cancelButton} appearance="outline" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button testID='save-list-button' style={styles.saveButton} onPress={() => setSaveModalVisible(true)} disabled={!isListValid}>
                        Save List
                    </Button>
                </View>

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

export default AddListModal;
