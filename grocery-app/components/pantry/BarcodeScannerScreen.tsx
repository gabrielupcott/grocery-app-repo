import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '@ui-kitten/components';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import axios from 'axios'; // Import axios for API calls
import * as SecureStore from 'expo-secure-store'; // Import SecureStore for secure storage
import { useNavigation } from '@react-navigation/native'; // Assuming you're using react-navigation
import { API_URLS } from '@/constants/constants'; // Assuming this is your constants file for API URLs
import AddItemModal from './AddItemModal'; // Import AddItemModal
type BarcodeScannerScreenProps = {
    onClose: () => void;
};

const BarcodeScannerScreen: React.FC<BarcodeScannerScreenProps> = ( {onClose} ) => {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false); // Loading state for API call
    const [productInfo, setProductInfo] = useState<any | null>(null); // State to hold product info
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false); // State for AddItemModal visibility
    const [title, setTitle] = useState<string>(''); // State for product title
    const [nutrition, setNutrition] = useState<any | null>(null); // State for product nutrition

    const navigation = useNavigation();

    const loadUserData = async () => {
        const storedToken = await SecureStore.getItemAsync("token");
        const storedUserId = await SecureStore.getItemAsync("user_id");

        setToken(storedToken);
        setUserId(storedUserId);
    };

    useEffect(() => {
        loadUserData();

        // Clear the scanned state when the component is unmounted
        return () => {
            setScanned(false);
        };
    }, []);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission}>
                    Allow Camera Access
                </Button>
            </View>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        setLoading(true);
        setProductInfo(null);
    
        console.log(`Barcode with type ${type} and data ${data} has been scanned!`);
    
        try {
            const response = await axios.get(`${API_URLS.PRODUCT_INFO}/${data}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            const product = response.data.product;
    
            // Extract the product name, first brand, and first category
            const productName = product.product_name || 'Unknown';
            const firstBrand = product.brands ? product.brands.split(',')[0] : '';
            const firstCategory = product.categories ? product.categories.split(',')[0] : '';
    
            // Create the new title by appending brand and category
            const title = `${firstBrand ? firstBrand : ''} ${firstCategory ? '- ' + firstCategory : ''}`;
            setTitle(title);
    
            // Extract relevant nutrient fields and convert them to strings
            const relevantNutrients = {
                energy: product.nutriments['energy-kcal_100g'] || 'N/A',
                fat: product.nutriments['fat_100g'] || 'N/A',
                saturatedFat: product.nutriments['saturated-fat_100g'] || 'N/A',
                carbohydrates: product.nutriments['carbohydrates_100g'] || 'N/A',
                sugars: product.nutriments['sugars_100g'] || 'N/A',
                fiber: product.nutriments['fiber_100g'] || 'N/A',
                protein: product.nutriments['proteins_100g'] || 'N/A',
                salt: product.nutriments['salt_100g'] || 'N/A',
            };
    
            // Convert the numeric nutrient values to strings for input fields
            const nutrition = Object.entries(relevantNutrients).reduce((acc: { [key: string]: string }, [key, value]) => {
                // If value is "N/A", remove key and value from the object
                if (value === 'N/A') return acc;
                // Set first letter to uppercase and add space before capital letters
                key = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                // If key is "Energy", add "kcal" to the value
                if (key === 'Energy') value += ' kcal';
                acc[key] = value.toString();
                return acc;
            }, {});
    
            console.log('Nutrition:', nutrition);
    
            // Set the product info with modified nutrients
            setProductInfo({ ...product, nutriments: nutrition });
            setIsAddModalVisible(true); // Show AddItemModal with pre-filled data
    
        } catch (error) {
            console.error('Error fetching product information:', error);
            Alert.alert('Error', 'Could not fetch product information.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Camera view */}
            {!scanned && !loading && (
                <CameraView style={styles.camera} facing={facing} onBarcodeScanned={handleBarCodeScanned}>
                    <View style={styles.buttonContainer}>
                        {/* Show text at top */}
                        <TouchableOpacity style={styles.button} onPress={() => null}>
                            <Text style={styles.text}>Scan Barcode</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            )}

            {/* Loading indicator */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.loadingText}>Looking for product information...</Text>
                </View>
            )}

            {/* AddItemModal for scanned product */}
            {productInfo && (
                <AddItemModal
                    visible={isAddModalVisible}
                    onClose={() => setIsAddModalVisible(false)}
                    onAdd={() => {
                        setIsAddModalVisible(false);
                        setScanned(false);
                    }}
                    token={token}
                    userId={userId}
                    initialValues={{
                        title,
                        // description: productInfo.ingredients_text || '',
                        nutrition: productInfo.nutriments || {},
                        imageUri: productInfo.selected_images.front.display.en? productInfo.selected_images.front.display.en : null
                    }}
                    setBarcodeScanning={onClose}  // Pass the function here
                />
            )}

            {/* Scan again button */}
            {/* {scanned && !loading && (
                <Button style={styles.button} onPress={() => setScanned(false)}>
                    Tap to Scan Again
                </Button>
            )} */}

            {/* Back button */}
            {/* <Button style={styles.backButton} onPress={onClose}>
                Go Back
            </Button> */}
        </View>
    );
};

const styles = StyleSheet.create({
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-end',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 10,
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    camera: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 18,
    },
    productInfoContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        margin: 20,
    },
    productInfoText: {
        fontSize: 16,
        marginVertical: 5,
    },
});

export default BarcodeScannerScreen;
