import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Input } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URLS } from '@/constants/constants';

type AddItemModalProps = {
    visible: boolean;
    onClose: () => void;
    onAdd: () => void;
    token: string | null;
    userId: string | null;
};

const AddItemModal: React.FC<AddItemModalProps> = ({ visible, onClose, onAdd, token, userId }) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<string>('');
    const [nutrition, setNutrition] = useState<{ [key: string]: string }>({});
    const [newNutrientName, setNewNutrientName] = useState('');
    const [newNutrientValue, setNewNutrientValue] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isFormValid, setIsFormValid] = useState(false); // New state to track form validity

    // Image picker function
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

    const handleAddNewItem = async () => {
        const item_nutrition = JSON.stringify(nutrition);

        try {
            await axios.post(
                API_URLS.ADD_ITEM,
                {
                    item_name: title,
                    item_description: description,
                    item_price: parseFloat(price),
                    item_nutrition,
                    item_image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null,
                    item_stock: quantity,
                    item_type: 'Custom',
                    user_id: userId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            onAdd();
            clearForm();
            onClose();
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const increaseQuantity = () => setQuantity(quantity + 1);
    const decreaseQuantity = () => setQuantity(Math.max(0, quantity - 1));

    const handleNutritionChange = (key: string, value: string) => {
        setNutrition((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const clearForm = () => {
        setTitle('');
        setDescription('');
        setPrice('');
        setNutrition({});
        setNewNutrientName('');
        setNewNutrientValue('');
        setImageUri(null);
        setImageBase64(null);
        setQuantity(1);
    };

    const handleClose = () => {
        clearForm();
        onClose();
    };

    const handleAddNewNutrient = () => {
        if (newNutrientName && newNutrientValue) {
            setNutrition((prev) => ({
                ...prev,
                [newNutrientName]: newNutrientValue,
            }));
            setNewNutrientName('');
            setNewNutrientValue('');
        }
    };

    // Effect to check if form is valid
    useEffect(() => {
        // Check if title, description, and price are all filled out
        const isValid = title.trim() !== '' && description.trim() !== '' && price.trim() !== '';
        setIsFormValid(isValid);
    }, [title, description, price]);

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <ScrollView style={styles.modalContent}>
                    <Text style={styles.editHeader}>Add New Item</Text>

                    {/* Image Section */}
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

                    <Input style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
                    <Input style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
                    <Input style={styles.input} placeholder="Price" value={price} keyboardType="numeric" onChangeText={setPrice} />

                    {Object.entries(nutrition).map(([key, value], index) => (
                        <View key={index} style={styles.nutrientContainer}>
                            <Input
                                style={[styles.input, { flex: 1 }]}
                                label={key}
                                value={value}
                                onChangeText={(text) => handleNutritionChange(key, text)}
                            />
                            <TouchableOpacity onPress={() => handleNutritionChange(key, '')}>
                                <Icon name="close-circle-outline" size={24} color="#FF0000" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <Text style={styles.infoHeader}>Add Nutrients</Text>
                    <Input style={styles.input} placeholder="Nutrient Name" value={newNutrientName} onChangeText={setNewNutrientName} />
                    <Input style={styles.input} placeholder="Nutrient Value" value={newNutrientValue} onChangeText={setNewNutrientValue} />
                    <Button style={styles.input} onPress={handleAddNewNutrient}>
                        Add New Nutrient
                    </Button>

                    <Text style={styles.infoHeader}>Quantity</Text>
                    <View style={styles.quantityControl}>
                        <Button testID="decrease-button" onPress={decreaseQuantity} disabled={quantity <= 0}>
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
                        <Button testID="add-button" onPress={increaseQuantity}>
                            <Icon name="add-outline" size={24} color="#000" />
                        </Button>
                    </View>

                    <View style={styles.actionButtons}>
                        <Button style={styles.cancelButton} appearance="outline" onPress={handleClose}>
                            Cancel
                        </Button>
                        {/* Disable Add Item button if form is not valid */}
                        <Button style={styles.saveButton} onPress={handleAddNewItem} disabled={!isFormValid}>
                            Add Item
                        </Button>
                    </View>
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
    input: {
        marginBottom: 10,
    },
    editHeader: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
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
    uploadButton: {
        marginBottom: 20,
    },
    infoHeader: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    nutrientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    quantityText: {
        marginHorizontal: 20,
        fontSize: 18,
        marginTop: 10,
    },
    quantityInput: {
        width: 60,
        textAlign: 'center',
        marginHorizontal: 10,
        fontSize: 18,
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

export default AddItemModal;
