import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '@ui-kitten/components';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import axios from 'axios'; // Import axios for API calls
import * as SecureStore from 'expo-secure-store'; // Import SecureStore for secure storage
import { useNavigation } from '@react-navigation/native'; // Assuming you're using react-navigation
import { API_URLS } from '@/constants/constants'; // Assuming this is your constants file for API URLs

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

    // Handle barcode scanned
    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        setLoading(true); // Start loading when barcode is scanned
        setProductInfo(null); // Clear previous product info

        console.log(`Barcode with type ${type} and data ${data} has been scanned!`);

        try {
            // Fetch product information from the API
            const response = await axios.get(`${API_URLS.PRODUCT_INFO}/${data}`, {
                headers: {
                    Authorization: `Bearer ${token}`, // Replace with the correct auth token
                },
            });

            setProductInfo(response.data); // Set the product info in state
            console.log('Product Info:', response.data);
        } catch (error) {
            console.error('Error fetching product information:', error);
            Alert.alert('Error', 'Could not fetch product information.');
        } finally {
            setLoading(false); // Stop loading when the request finishes
        }
    };

    return (
        <View style={styles.container}>
            {/* Camera view */}
            {!scanned && !loading && (
                <CameraView style={styles.camera} facing={facing} onBarcodeScanned={handleBarCodeScanned}>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                            <Text style={styles.text}>Flip Camera</Text>
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

            {/* Product information */}
            {productInfo && (
                <View style={styles.productInfoContainer}>
                    <Text style={styles.productInfoText}>Product Name: {productInfo.product?.product_name || 'Unknown'}</Text>
                    <Text style={styles.productInfoText}>Brand: {productInfo.product?.brands || 'Unknown'}</Text>
                    <Text style={styles.productInfoText}>Ingredients: {productInfo.product?.ingredients_text || 'N/A'}</Text>
                </View>
            )}

            {/* Scan again button */}
            {scanned && !loading && (
                <Button style={styles.button} onPress={() => setScanned(false)}>
                    Tap to Scan Again
                </Button>
            )}

            {/* Back button */}
            <Button style={styles.backButton} onPress={onClose}>
                Go Back
            </Button>
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
