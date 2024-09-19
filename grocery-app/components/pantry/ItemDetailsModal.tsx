import React, { useState } from 'react';
import { View, Modal, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import { Item } from '@/components/pantry/PantryItem'; // Import the Item type from PantryItem


type ItemDetailsModalProps = {
    visible: boolean;
    item: Item | null;
    onClose: () => void;
    onEdit: (item: Item) => void;
};

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ visible, item, onClose, onEdit }) => {
    const [quantity, setQuantity] = useState<number>(item?.item_stock || 0); // Default quantity

    console.log(item?.item_stock || 0);

    const increaseQuantity = () => setQuantity(quantity + 1);
    const decreaseQuantity = () => {
        if (quantity > 0) setQuantity(quantity - 1);
    };

    if (!item) return null; // Return null if no item is selected

    console.log('Item:', item);
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <ScrollView style={styles.modalContent}>
                    <View style={styles.imageContainer}>
                        {/* <Image
              source={item.item_image ? { uri: item.item_image } : require('../../assets/images/no-image.png')}
              style={styles.itemImage}
            /> */}
                        <Image
                            source={require('../../assets/images/no-image.png')}
                            style={styles.itemImage}
                        />
                        <TouchableOpacity style={styles.editIcon} onPress={() => onEdit(item)}>
                            <Icon name="pencil-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.itemDescription}>{item.item_description}</Text>

                    {/* Quantity Section */}
                    <View style={styles.quantityContainer}>
                        <Text style={styles.infoHeader}>Quantity</Text>
                        <View style={styles.quantityControl}>
                            <Button style={styles.quantityButton} onPress={decreaseQuantity} disabled={item.item_stock <= 0}>
                                <Icon name="remove-outline" size={24} color="#000" />
                            </Button>
                            <Text style={styles.quantityText}>{item.item_stock}</Text>
                            <Button style={styles.quantityButton} onPress={increaseQuantity}>
                                <Icon name="add-outline" size={24} color="#000" />
                            </Button>
                        </View>
                    </View>

                    {/* Information Section */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoHeader}>Information</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Price</Text>
                            <Text style={styles.infoValue}>${item.item_price.toFixed(2)}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Serving Size (g)</Text>
                            <Text style={styles.infoValue}>{0}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Calories</Text>
                            <Text style={styles.infoValue}>{item.item_nutrition || 0}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Protein (g)</Text>
                            <Text style={styles.infoValue}>{0}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Carbohydrates (g)</Text>
                            <Text style={styles.infoValue}>{0}</Text>
                        </View>
                    </View>

                </ScrollView>
                <Button style={styles.closeButton} onPress={onClose}>Close</Button>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
        width: '100%',
    },
    imageContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    itemImage: {
        width: 150,
        height: 150,
        borderRadius: 8,
        marginBottom: 20,
    },
    editIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'black',
        // round into circle
        borderRadius: 50,
        padding: 10,
    },
    itemName: {
        fontWeight: 'bold',
        fontSize: 24,
        textAlign: 'center',
    },
    itemDescription: {
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    quantityContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 18,
        marginBottom: 10,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityButton: {
        // round into circle
        borderRadius: 50,
        marginHorizontal: 20,
    },
    quantityText: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    infoContainer: {
        marginTop: 30,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 5,
    },
    infoHeader: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    infoLabel: {
        fontSize: 16,
        color: '#555',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 5,
    },
    closeButton: {
        marginTop: 20,
    },
});

export default ItemDetailsModal;
