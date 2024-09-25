import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, OverflowMenu, MenuItem } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';

export type Item = {
    item_id: string;
    item_name: string;
    item_description: string;
    item_nutrition: string;
    item_price: number;
    item_stock: number;
    item_type: string;
    item_image: string;
    user_id: string;
  };

type PantryItemProps = {
    item: {
        item_id: string;
        item_name: string;
        item_stock: number;
        item_image?: string;
    };
    onEdit: (item: any) => void;
    onDelete: (item: any) => void;
};

const PantryItem: React.FC<PantryItemProps> = ({ item, onEdit, onDelete }) => {
    const [menuVisible, setMenuVisible] = useState(false);

    return (
        <View style={styles.container}>
            {/* Left: Image */}
            {/* <Image
        source={item.item_image ? { uri: item.item_image } : require('../../assets/images/no_image.svg')}
        style={styles.image}
      /> */}

{item.item_image ? (
                                    <Image source={{ uri: item.item_image }} style={styles.image}  />
                                ) : (
                                    <Image source={require('../../assets/images/no-image.png')} style={styles.image} />
                                )}

            {/* Center: Item name and stock count */}
            <View style={styles.details}>
                <Text category="s1" style={styles.itemName}>
                    {item.item_name}
                </Text>
                <Text category="p2" appearance="hint">
                    {item.item_stock} in stock
                </Text>
            </View>

            {/* Right: Vertical Ellipsis Icon */}
            <OverflowMenu
                anchor={() => (
                    <TouchableOpacity onPress={() => setMenuVisible(true)}>
                        <Icon name="ellipsis-vertical" size={24} color="black" />
                    </TouchableOpacity>
                )}
                visible={menuVisible}
                onBackdropPress={() => setMenuVisible(false)}
            >
                <MenuItem title="Edit" onPress={() => { setMenuVisible(false); onEdit(item); }} />
                <MenuItem title="Delete" onPress={() => { setMenuVisible(false); onDelete(item); }} />
            </OverflowMenu>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderColor: '#e0e0e0',
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 10,
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    itemName: {
        fontWeight: 'bold',
    },
});

export default PantryItem;
