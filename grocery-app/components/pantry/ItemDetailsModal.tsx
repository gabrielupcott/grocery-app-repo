import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Input } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URLS } from '@/constants/constants';
import { Item } from '@/components/pantry/PantryItem';

type ItemDetailsModalProps = {
    visible: boolean;
    item: Item | null;
    onClose: () => void;
    onEdit: (item: Item) => void;
    token: string | null;
};

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ visible, item, onClose, onEdit, token }) => {
    const [quantity, setQuantity] = useState<number>(item?.item_stock || 0);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [title, setTitle] = useState(item?.item_name || '');
    const [description, setDescription] = useState(item?.item_description || '');
    const [price, setPrice] = useState<string>(item?.item_price.toFixed(2) || '');
    const [nutrition, setNutrition] = useState<{ [key: string]: string }>({});
    const [newNutrientName, setNewNutrientName] = useState('');
    const [newNutrientValue, setNewNutrientValue] = useState('');
    const [isFormValid, setIsFormValid] = useState(false); // New state for form validation

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
        if (item?.item_stock) {
            setQuantity(item.item_stock);
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

    // Effect to check if form is valid (both title and description must be filled)
    useEffect(() => {
        const isValid = title.trim() !== '' && description.trim() !== '';
        setIsFormValid(isValid);
    }, [title, description]);

    const increaseQuantity = async () => {
        const newQuantity = quantity + 1;
        setQuantity(newQuantity);
        if (item && token) {
            try {
                await axios.put(`${API_URLS.ADD_ITEM}/${item.item_id}`, {
                    ...item,
                    item_stock: newQuantity,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Error updating quantity:', error);
            }
            onEdit({ ...item, item_stock: newQuantity });
        }
    };

    const decreaseQuantity = async () => {
        if (quantity > 0) {
            const newQuantity = quantity - 1;
            setQuantity(newQuantity);
            if (item && token) {
                try {
                    await axios.put(`${API_URLS.ADD_ITEM}/${item.item_id}`, {
                        ...item,
                        item_stock: newQuantity,
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } catch (error) {
                    console.error('Error updating quantity:', error);
                }
                onEdit({ ...item, item_stock: newQuantity });
            }
        }
    };

    const handleNutritionChange = (key: string, value: string) => {
        setNutrition(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleRemoveNutrient = (key: string) => {
        setNutrition(prev => {
            const updatedNutrition = { ...prev };
            delete updatedNutrition[key];
            return updatedNutrition;
        });
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
            base64: true,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            if (result.assets[0].base64) {
                setImageBase64(result.assets[0].base64);
            }
        }
    };

    const handleSave = async () => {
        if (item) {
            const updatedNutrition = JSON.stringify(nutrition);

            try {
                onEdit({
                    ...item,
                    item_name: title,
                    item_description: description,
                    item_price: parseFloat(price),
                    item_nutrition: updatedNutrition,
                    item_image: imageBase64 ? imageBase64 : item.item_image,
                    item_stock: quantity,
                    item_type: item.item_type,
                });

                await axios.put(`${API_URLS.ADD_ITEM}/${item.item_id}`, {
                    item_name: title,
                    item_description: description,
                    item_price: parseFloat(price),
                    item_nutrition: updatedNutrition,
                    item_image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : item.item_image,
                    item_stock: quantity,
                    user_id: item.user_id,
                    item_type: item.item_type,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setEditMode(false);
            } catch (error) {
                console.error('Error updating item:', error);
            }
        }
    };

    const handleAddNewNutrient = () => {
        if (newNutrientName && newNutrientValue) {
            setNutrition(prev => ({
                ...prev,
                [newNutrientName]: newNutrientValue
            }));
            setNewNutrientName('');
            setNewNutrientValue('');
        }
    };

    const handleClose = () => {
        setEditMode(false);
        onClose();
    };

    if (!item) return null;
    else console.log("Item:", item);

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
                    <Icon name="close-outline" size={24} color="white" />
                </TouchableOpacity>
                <ScrollView style={styles.modalContent}>
                    {editMode ? (
                        <>
                            <Text style={styles.editHeader}>Edit Item</Text>
                            <View style={styles.imageContainer}>
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={styles.itemImage} />
                                ) : (
                                    <Image source={require('../../assets/images/no-image.png')} style={styles.itemImage} />
                                )}
                                <Button style={styles.uploadButton} onPress={pickImage}>
                                    Upload Picture
                                </Button>
                            </View>

                            <Input testID="title-field" style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
                            <Input style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />

                            <Text style={styles.infoHeader}>Information</Text>
                            <Input style={styles.input} placeholder="Price" value={price} label="Price" keyboardType="numeric" onChangeText={setPrice} />

                            {Object.entries(nutrition).map(([key, value], index) => (
                                <View key={index} style={styles.nutrientContainer}>
                                    <Input
                                        style={[styles.input, { flex: 1 }]}
                                        label={key}
                                        value={value}
                                        onChangeText={(text) => handleNutritionChange(key, text)}
                                    />
                                    <TouchableOpacity onPress={() => handleRemoveNutrient(key)}>
                                        <Icon name="close-circle-outline" size={24} color="#FF0000" style={styles.removeIcon} />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <Text style={styles.infoHeader}>Add New Nutrient</Text>
                            <Input
                                style={styles.input}
                                placeholder="Nutrient Name"
                                value={newNutrientName}
                                onChangeText={setNewNutrientName}
                            />
                            <Input
                                style={styles.input}
                                placeholder="Nutrient Value"
                                value={newNutrientValue}
                                onChangeText={setNewNutrientValue}
                            />
                            <Button onPress={handleAddNewNutrient}>Add New Nutrient</Button>

                            <View style={styles.actionButtons}>
                                <Button style={styles.cancelButton} appearance="outline" onPress={() => setEditMode(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    testID="confirm-button"
                                    style={styles.saveButton}
                                    onPress={handleSave}
                                    disabled={!isFormValid} // Disable button if form is not valid
                                >
                                    Save
                                </Button>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.imageContainer}>
                                <Image source={imageUri ? { uri: imageUri } : require('../../assets/images/no-image.png')} style={styles.itemImage} />
                                {/* Edit icon moved to the bottom-right */}
                                <TouchableOpacity testID="edit-button" style={styles.editIcon} onPress={() => setEditMode(true)}>
                                    <Icon name="pencil-outline" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.itemName}>{item.item_name}</Text>
                            <Text style={styles.itemDescription}>{item.item_description}</Text>

                            <View style={styles.quantityContainer}>
                                <Text style={styles.infoHeader}>Quantity</Text>
                                <View style={styles.quantityControl}>
                                    <Button testID='decrease-button' style={styles.quantityButton} onPress={decreaseQuantity} disabled={quantity <= 0}>
                                        <Icon name="remove-outline" size={24} color={quantity === 0 ? '#ccc' : '#000'} />
                                    </Button>
                                    <Input
                                        style={styles.quantityInput}
                                        value={quantity.toString()}
                                        keyboardType="numeric"
                                        onChangeText={(text) => {
                                            const parsedQuantity = parseInt(text);
                                            if (!isNaN(parsedQuantity) && parsedQuantity >= 0) {
                                                setQuantity(parsedQuantity);
                                            }
                                        }}
                                    />
                                    <Button testID='add-button' style={styles.quantityButton} onPress={increaseQuantity}>
                                        <Icon name="add-outline" size={24} color="#000" />
                                    </Button>
                                </View>
                            </View>

                            <View style={styles.infoContainer}>
                                <Text style={styles.infoHeader}>Information</Text>
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
                    )}
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

export default ItemDetailsModal;
