import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Text, Button, Input } from "@ui-kitten/components"; // Removed Icon from here
import Ionicons from 'react-native-vector-icons/Ionicons'; // Importing Ionicons
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import ShoppingItem from './ShoppingItem'; // Import ShoppingItem component
import { ListItem } from './ListDetailsModal'; // Import ListItem type
import CongratsModal from './CongratsModal'; // Import CongratsModal

type ListShopModalProps = {
    visible: boolean;
    listItems: ListItem[];
    onClose: () => void;
    onDone: (updatedItems: ListItem[]) => void;
};

const ListShopModal: React.FC<ListShopModalProps> = ({
    visible,
    listItems,
    onClose,
    onDone,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<"Unchecked" | "Checked">("Unchecked");
    const [items, setItems] = useState<ListItem[]>(listItems);
    const [congratsModalVisible, setCongratsModalVisible] = useState<boolean>(false);
    const [totalCost, setTotalCost] = useState<number>(0);
    const [uncheckedItemsCount, setUncheckedItemsCount] = useState<number>(0); // Track unchecked items

    useEffect(() => {
        setItems(listItems); // Initialize the list items when the modal is opened
        console.log("ListShopModal: Updated list items", listItems);
    }, [listItems]);

    useEffect(() => {
        const uncheckedItems = items.filter(item => !item.isChecked);
        setUncheckedItemsCount(uncheckedItems.length); // Update the number of unchecked items
    }, [items]);

    if (!visible) return null;

    const toggleItemChecked = (itemId: string, isChecked: boolean) => {
        const updatedItems = items.map((item) =>
            item.item_id === itemId
                ? { ...item, isChecked } // Update the item's checked state
                : item
        );
        setTotalCost(
            updatedItems
                .filter((item) => item.isChecked)
                .reduce((total, item) => total + item.item_price, 0)
        );
        setItems(updatedItems);
    };

    const filteredItems = items
        .filter((item) =>
            item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((item) =>
            filter === "Unchecked" ? !item.isChecked : item.isChecked
        );

        
    if (filteredItems.length == 0) {
        if (filter === "Unchecked") {
            setFilter("Checked");
        } else {
            setFilter("Unchecked");
        }
    }

    const handleFinish = () => {
        setCongratsModalVisible(true);
        // onDone(items);
    };

    return (
        <View style={styles.modalContainer}>
            <Text category="h5" style={styles.headerText}>
                Shopping List
            </Text>

            {/* Search Bar */}
            <Input
                placeholder="Search items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                // Custom icon using Ionicons
                accessoryLeft={() => <Ionicons name="search-outline" size={24} color="gray" />}
                style={styles.searchBar}
            />

            {/* Segmented Control */}
            <SegmentedControl
                values={["Unchecked", "Checked"]}
                selectedIndex={filter === "Unchecked" ? 0 : 1}
                onChange={(event) => {
                    setFilter(event.nativeEvent.selectedSegmentIndex === 0 ? "Unchecked" : "Checked");
                }}
                style={styles.segmentedControl}
            />

            {/* Item List */}
            <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.item_id}
                renderItem={({ item }) => (
                    <ShoppingItem
                        item={item}
                        onToggleCheck={toggleItemChecked}
                    />
                )}
            />

            {/* Button Group */}
            <View style={styles.buttonGroup}>
                <Button
                    style={styles.cancelButton}
                    appearance="outline"
                    onPress={onClose}
                >
                    Cancel
                </Button>
                {/* Alternate button for when not all items are checked */}
                <Button
                    style={styles.doneButton}
                    onPress={() => handleFinish()}
                    appearance={uncheckedItemsCount === 0 ? "filled" : "outline"} // Change button appearance based on unchecked items
                    disabled={uncheckedItemsCount == listItems.length} // Disable button if there are unchecked items
                >
                    Done
                </Button>

                {/* Congrats Modal */}
                <CongratsModal
                    visible={congratsModalVisible}
                    purchasedItems={items.filter((item) => item.isChecked)}
                    totalCost={totalCost}
                    onClose={() => { setCongratsModalVisible(false); onClose(); }}
                    allDone={uncheckedItemsCount === 0}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "center", // Centers modal content vertically
        padding: 20,
        backgroundColor: "white",
    },
    headerText: {
        textAlign: "center",
        marginBottom: 20,
    },
    searchBar: {
        marginBottom: 20,
    },
    segmentedControl: {
        marginBottom: 20,
    },
    buttonGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
    },
    doneButton: {
        flex: 1,
        marginLeft: 10,
    },
});

export default ListShopModal;
