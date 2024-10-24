import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, CheckBox } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import { ListItem } from './ListDetailsModal';

export type ShoppingItemProps = {
  item: ListItem; // Item details
  onToggleCheck: (itemId: string, isChecked: boolean) => void; // Handle checking/unchecking
};

const ShoppingItem: React.FC<ShoppingItemProps> = ({ item, onToggleCheck }) => {
  const [checked, setChecked] = useState(item.isChecked);

  const handleCheckChange = (isChecked: boolean) => {
    setChecked(isChecked);
    onToggleCheck(item.item_id, isChecked);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => handleCheckChange(!checked)}>
      {/* Left: Image */}
      {item.item_image ? (
        <Image source={{ uri: item.item_image }} style={styles.image} />
      ) : (
        <Image source={require('../../assets/images/no-image.png')} style={styles.image} />
      )}

      {/* Center: Item name and amount */}
      <View style={styles.details}>
        <Text category="s1" style={styles.itemName}>
          {item.item_name}
        </Text>
        <Text category="p2" appearance="hint">
          {item.amount} amount
        </Text>
      </View>

      {/* Right: Checkbox for marking the item as checked/unchecked */}
      <CheckBox
        checked={checked}
        onChange={handleCheckChange}
        style={styles.checkbox}
      />
    </TouchableOpacity>
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
  checkbox: {
    marginLeft: 10,
  },
});

export default ShoppingItem;
