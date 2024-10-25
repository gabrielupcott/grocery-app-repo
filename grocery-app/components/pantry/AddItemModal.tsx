import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Input } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URLS } from '@/constants/constants';
import { router } from 'expo-router';

type AddItemModalProps = {
    visible: boolean;
    onClose: () => void;
    onAdd: () => void;
    token: string | null;
    userId: string | null;
};

const AddItemModal: React.FC<AddItemModalProps & { initialValues?: any, setBarcodeScanning: (flag: boolean) => void }> = ({
    visible,
    onClose,
    onAdd,
    token,
    userId,
    initialValues = {},
    setBarcodeScanning,  // Receive setBarcodeScanning as a prop
}) => {
    const isScannedItem = Boolean(initialValues && Object.keys(initialValues).length > 0);
    const [quantity, setQuantity] = useState<number>(1);
    const [title, setTitle] = useState(initialValues.title || '');
    const [description, setDescription] = useState(initialValues.description || '');
    const [price, setPrice] = useState<string>('');
    const [nutrition, setNutrition] = useState<{ [key: string]: string }>(initialValues.nutrition || {});
    const [newNutrientName, setNewNutrientName] = useState('');
    const [newNutrientValue, setNewNutrientValue] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(initialValues.imageUri || null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isFormValid, setIsFormValid] = useState(false); // New state to track form validity
    const [isNutritionVisible, setIsNutritionVisible] = useState(false); // State to control nutrition section visibility

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

        // // if item uri is not null but imageBase64 is null, set imageBase64 to uri
        // if (imageUri && !imageBase64) {
        //     console.log('Setting imageBase64 to imageUri');
        //     setImageBase64(imageUri);
        // }

        try {
            await axios.post(
                API_URLS.ADD_ITEM,
                {
                    item_name: title,
                    item_description: description,
                    // Remove the "$" sign from the price before parsing
                    item_price: parseFloat(price.replace('$', '')),
                    item_nutrition,
                    item_image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUri? imageUri : null,
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
            setBarcodeScanning(false);  // Call setBarcodeScanning to stop scanning
            onClose();
        } catch (error : any) {
            console.error('Error adding item:', error.response.data);
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
        const isValid = title.trim() !== '' && description.trim() !== '' && price.trim() !== '' && quantity > 0;
        setIsFormValid(isValid);
    }, [title, description, price, quantity]);

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <ScrollView style={styles.modalContent}>
                    <Text style={styles.editHeader}>{isScannedItem ? 'Add Scanned Item' : 'Add New Item'}</Text>

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

                    <Input
                        style={styles.input}
                        placeholder="Title"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <Input
                        style={[
                            styles.input,
                            isScannedItem && description.trim() === '' ? styles.highlightedInput : null, // Highlight description field if empty
                        ]}
                        placeholder="Description"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <Input
                        style={[
                            styles.input,
                            isScannedItem && price.trim() === '' ? styles.highlightedInput : null, // Highlight price field if empty
                        ]}
                        placeholder="Price"
                        value={price}
                        keyboardType="numeric"
                        onChangeText={(text) => {
                            // Ensure the price field starts with a "$"
                            const formattedText = text.startsWith('$') ? text : `$${text}`;
                            setPrice(formattedText);
                        }}
                    />

                    {/* Toggle button for Nutrition Section */}
                    <TouchableOpacity
                        style={styles.nutritionToggle}
                        onPress={() => setIsNutritionVisible(!isNutritionVisible)}
                    >
                        <Text style={styles.nutritionToggleText}>Nutrition Info</Text>
                        <Icon
                            name={isNutritionVisible ? 'chevron-up-outline' : 'chevron-down-outline'}
                            size={24}
                            color="black"
                        />
                    </TouchableOpacity>

                    {/* Nutrition Section */}
                    {isNutritionVisible && (
                        <View>
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
                            <Button style={styles.input} onPress={handleAddNewNutrient}>
                                Add New Nutrient
                            </Button>
                        </View>
                    )}

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
    highlightedInput: {
        borderColor: 'red',
        borderWidth: 2,
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
    nutritionToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    nutritionToggleText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddItemModal;
