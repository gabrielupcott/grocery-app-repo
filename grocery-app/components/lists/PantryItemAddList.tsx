import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, OverflowMenu, MenuItem } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ListItem } from './ListDetailsModal';

type PantryItemProps = {
    item: ListItem;
    onAdd: ((item: any) => void) | null;
    onDelete: (item: any) => void;
    inList: boolean;
    editable: boolean;
};

const PantryItemAddList: React.FC<PantryItemProps> = ({ item, onAdd, onDelete, inList, editable }) => {
    const [menuVisible, setMenuVisible] = useState(false);

    return (
        <View style={styles.container}>
            {/* Left: Image */}
            {/* <Image
        source={item.item_image ? { uri: item.item_image } : require('../../assets/images/no_image.svg')}
        style={styles.image}
      /> */}

            {item.item_image ? (
                <Image source={{ uri: item.item_image }} style={styles.image} />
            ) : (
                <Image source={require('../../assets/images/no-image.png')} style={styles.image} />
            )}

            {/* Center: Item name and stock count */}
            <View style={styles.details}>
                <Text category="s1" style={styles.itemName}>
                    {item.item_name}
                </Text>
                <Text category="p2" appearance="hint">
                    {item.amount > 0 ? item.amount + " in list | " : ""}{item.item_stock} in stock
                </Text>
            </View>

            {/* Right: horizontal container with Icons for adding and deleting */}
            {
                onAdd != null && editable ?
                <TouchableOpacity onPress={inList ? onDelete : onAdd} testID={'interact'}>
                    <Icon name={inList ? "playlist-remove" : "playlist-plus"} size={24} color={inList ? "red" : "black"} />
                </TouchableOpacity>
                : editable &&
                <TouchableOpacity onPress={onDelete}>
                    <Icon name={"playlist-remove"} size={24} color={"red"} />
                </TouchableOpacity>
            }

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

export default PantryItemAddList;
