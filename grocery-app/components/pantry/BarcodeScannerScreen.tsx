import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '@ui-kitten/components';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { API_URLS } from '../../constants/constants';
import AddItemModal from './AddItemModal';
import { useAuth } from '@/context/AuthContext';

type BarcodeScannerScreenProps = {
    onClose: () => void;
};

const BarcodeScannerScreen: React.FC<BarcodeScannerScreenProps> = ({ onClose }) => {
    const { token, userId } = useAuth();
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [productInfo, setProductInfo] = useState<any | null>(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [title, setTitle] = useState<string>('');
    const [delayScanning, setDelayScanning] = useState(false); // New state for delay control

    useEffect(() => {
        const timer = setTimeout(() => setDelayScanning(true), 3000);
        return () => {
          clearTimeout(timer);
          setScanned(false);
        };
      }, []);
    

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission}>Allow Camera Access</Button>
            </View>
        );
    }

    function toggleCameraFacing() {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (!delayScanning) return; // Only proceed if delay has passed
        setScanned(true);
        setLoading(true);
        setProductInfo(null);
    
        try {
            const response = await axios.get(`${API_URLS.PRODUCT_INFO}/${data}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            const product = response.data.product;
            const productName = product.product_name || 'Unknown';
            const firstBrand = product.brands ? product.brands.split(',')[0] : '';
            const firstCategory = product.categories ? product.categories.split(',')[0] : '';
            const title = `${firstBrand ? firstBrand : ''} ${firstCategory ? '- ' + firstCategory : ''}`;
            setTitle(title);
    
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
    
            const nutrition = Object.entries(relevantNutrients).reduce((acc: { [key: string]: string }, [key, value]) => {
                if (value === 'N/A') return acc;
                // Capitalize first letter
                key = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()); 
                if (key === 'Energy') value += ' kcal';
                acc[key] = value.toString();
                return acc;
            }, {});
    
            setProductInfo({ ...product, nutriments: nutrition });
            setIsAddModalVisible(true);
        } catch (error) {
            console.error('Error fetching product information:', error);
            Alert.alert('Error', 'Could not fetch product information.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {!scanned && !loading && (
                <CameraView style={styles.camera} facing={facing} onBarcodeScanned={handleBarCodeScanned}>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={() => null}>
                            <Text style={styles.text}>Scan Barcode</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.actionButtons}>
                        <Button style={styles.cancelButton} onPress={onClose}>Cancel</Button>
                    </View>
                </CameraView>
            )}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.loadingText}>Looking for product information...</Text>
                </View>
            )}
            {productInfo && (
                <AddItemModal
                    visible={isAddModalVisible}
                    onClose={onClose}
                    onAdd={() => {
                        setIsAddModalVisible(false);
                        setScanned(false);
                    }}
                    token={token}
                    userId={userId}
                    initialValues={{
                        title,
                        nutrition: productInfo.nutriments || {},
                        imageUri: productInfo.selected_images.front.display.en
                            ? productInfo.selected_images.front.display.en
                            : null,
                    }}
                    setBarcodeScanning={onClose}
                />
            )}
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
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        margin: 20,
    },
    cancelButton: {
        flex: 1,
        marginHorizontal: 10,
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
