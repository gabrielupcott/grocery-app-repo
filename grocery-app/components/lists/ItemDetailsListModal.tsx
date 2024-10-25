import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Input } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URLS } from '@/constants/constants';
import { ListItem } from './ListDetailsModal';

type ItemDetailsModalProps = {
    visible: boolean;
    item: ListItem;
    onClose: () => void;
    onItemAmountChange: (item: ListItem, amount: number) => void;
    editable?: boolean;
    amount?: number;
};

const ItemDetailsListModal: React.FC<ItemDetailsModalProps> = ({ visible, item, onClose, onItemAmountChange, editable }) => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [title, setTitle] = useState(item?.item_name || '');
    const [description, setDescription] = useState(item?.item_description || '');
    const [price, setPrice] = useState<string>(item?.item_price.toFixed(2) || '');
    const [nutrition, setNutrition] = useState<{ [key: string]: string }>({});
    // const [newAmount, setNewAmount] = useState<number>(item.amount);


    useEffect(() => {
        if (item?.item_image) {
            setImageUri(item.item_image);
        }
        if (item?.item_nutrition) {
            try {
                setNutrition(JSON.parse(item.item_nutrition));
            } catch (error) {
                console.error("Error parsing nutrition info:", error);
            }
        }
        if (item?.item_price) {
            setPrice(item.item_price.toFixed(2));
        }
        if (item?.item_name) {
            setTitle(item.item_name);
        }
        if (item?.item_description) {
            setDescription(item.item_description);
        }
    }, [item]);

    const handleClose = () => {
        onClose();
    };

    const handleItemAmountChange = (add: boolean) => {
        if (item && editable) {
            if (add) {
                onItemAmountChange(item, item.amount + 1);

            } else {
                onItemAmountChange(item, item.amount - 1);
                if (!item || item.amount === 0) {
                    onClose();
                }
            }
        }
    }

    if (!item) return null;
    else console.log("asdasdasdItem:", item);

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
                    <Icon name="close-outline" size={24} color="white" />
                </TouchableOpacity>
                <ScrollView style={styles.modalContent}>

                    <>
                        <View style={styles.imageContainer}>
                            <Image source={imageUri ? { uri: imageUri } : require('../../assets/images/no-image.png')} style={styles.itemImage} />
                            {/* Edit icon moved to the bottom-right */}
                        </View>

                        <Text style={styles.itemName}>{item.item_name}</Text>
                        <Text style={styles.itemDescription}>{item.item_description}</Text>

                        <View style={styles.quantityContainer}>
                            <Text style={styles.infoHeader}>Amount Currently in List</Text>
                            <View style={styles.quantityControl}>
                                <Button testID='decrease-button' style={styles.quantityButton} onPress={() => handleItemAmountChange(false)} disabled={item.amount <= 0 || !editable || item.amount == null || Number.isNaN(item.amount)}>
                                    <Icon name="remove-outline" size={24} color={item.amount === 0 ? '#ccc' : '#000'} />
                                </Button>
                                <Input
                                    style={styles.quantityInput}
                                    value={item.amount.toString()}
                                    keyboardType="numeric"
                                    onChangeText={(value) => {
                                        if (editable) {
                                            if (value === '') {
                                                onItemAmountChange(item, 0);
                                                return;
                                            }
                                            const parsedAmount = parseInt(value, 10); // Parse the input value as a number
                                            if (!isNaN(parsedAmount)) { // Ensure it is a valid number
                                                onItemAmountChange(item, parsedAmount); // Call the parent function with the new value
                                            }
                                        }
                                    }}
                                />
                                <Button testID='add-button' style={styles.quantityButton} onPress={() => handleItemAmountChange(true)} disabled={!editable}>
                                    <Icon name="add-outline" size={24} color="#000" />
                                </Button>
                            </View>
                        </View>

                        <View style={styles.infoContainer}>
                            <Text style={styles.infoHeader}>Information</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Current Stock</Text>
                                <Text style={styles.infoValue}>{item.item_stock}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Price</Text>
                                <Text style={styles.infoValue}>${item.item_price.toFixed(2)}</Text>
                            </View>
                            {Object.entries(nutrition).map(([key, value], index) => (
                                <View key={index} style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{key}</Text>
                                    <Text style={styles.infoValue}>{value}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                </ScrollView>
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
    closeIcon: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: '#000',
        borderRadius: 50,
        padding: 15,

        zIndex: 1, // Ensure it appears on top of everything
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
        top: 0,
        left: 0,
        backgroundColor: '#000',
        borderRadius: 50,
        padding: 15,
        elevation: 5, // Add shadow/elevation for a floating action button look
    },
    uploadButton: {
        marginBottom: 20,
    },
    editHeader: {
        fontWeight: 'bold',
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 20,
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
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityButton: {
        borderRadius: 50,
        marginHorizontal: 10,
    },
    quantityInput: {
        width: 60,
        textAlign: 'center',
        marginHorizontal: 10,
        fontSize: 18,
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
    nutrientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    removeIcon: {
        marginLeft: 10,
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
    input: {
        marginBottom: 10,
    },
});

export default ItemDetailsListModal;