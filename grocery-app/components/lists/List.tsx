import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, OverflowMenu, MenuItem } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Calendar from 'expo-calendar';
import DateTimePicker from '@react-native-community/datetimepicker';

export type ListType = {
    list_id: string;
    list_name: string;
    list_image?: string | null;
    item_count: number; // You'll need to calculate this from list_item_lines in the backend
};

type ListProps = {
    list: ListType;
    onEdit: (list: ListType) => void;
    onDelete: (list: ListType) => void;
};

const List: React.FC<ListProps> = ({ list, onEdit, onDelete }) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());


    // Request calendar permissions
    const requestCalendarPermission = async () => {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status === 'granted') {
            return true;
        } else {
            Alert.alert('Permission Denied', 'Calendar permission is required to add events.');
            return false;
        }
    };

    // Add list to the calendar as an event
    const addToCalendar = async () => {
        const hasPermission = await requestCalendarPermission();
        if (!hasPermission) return;

        // Get the default calendar (on iOS) or create a local one (on Android)
        const defaultCalendarSource = Platform.OS === 'ios'
            ? (await Calendar.getDefaultCalendarAsync()).id
            : (await Calendar.createCalendarAsync({
                title: 'Shopping Lists',
                color: 'blue',
                entityType: Calendar.EntityTypes.EVENT,
                source: { isLocalAccount: true, name: 'Grocery Shopping', type: Calendar.SourceType.LOCAL },
                name: 'Grocery Shopping',
                ownerAccount: 'personal',
                accessLevel: Calendar.CalendarAccessLevel.OWNER,
            }));

        // Create a calendar if needed
        const calendarId = await Calendar.createCalendarAsync({
            title: 'Shopping Lists',
            color: 'blue',
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: Platform.OS === 'ios' ? defaultCalendarSource : undefined,
            source: { id: defaultCalendarSource, type: Calendar.SourceType.LOCAL, name: 'Shopping Lists' },
            name: 'Shopping Lists',
            ownerAccount: 'personal',
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });

              // Merge selected date and time
              const startDate = new Date(selectedDate);
              startDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      
              const endDate = new Date(startDate);
              endDate.setHours(startDate.getHours() + 1); // 1-hour duration
      
        console.log('Selected date:', startDate);
        // Create an event with the selected date and list name
        const eventId = await Calendar.createEventAsync(calendarId, {
            title: list.list_name,
            startDate,  // Use selected date for the event start
            endDate,    // Set event end time 1 hour later
            timeZone: 'EST', // Ensure correct time zone is set
            notes: `List contains ${list.item_count} items.`,
        });

        Alert.alert('Success', `Event added to the calendar with ID: ${eventId}`);
    };

  // Handle date selection
    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            setShowTimePicker(true); // Open time picker after selecting date
        }
    };

    // Handle time selection
    const handleTimeChange = (event: any, time?: Date) => {
        setShowTimePicker(false);
        if (time) {
            setSelectedTime(time);
            addToCalendar(); // Add the event after both date and time are selected
        }
    };

    return (
        <View style={styles.container}>
            {/* Left: List Image */}
            {list.list_image ? (
                <Image source={{ uri: list.list_image }} style={styles.image} />
            ) : (
                <Image source={require('../../assets/images/no-image.png')} style={styles.image} />
            )}

            {/* Center: List name and item count */}
            <View style={styles.details}>
                <Text category="s1" style={styles.listName}>
                    {list.list_name}
                </Text>
                <Text category="p2" appearance="hint">
                    {list.item_count} items
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
                <MenuItem title="Edit" onPress={() => { setMenuVisible(false); onEdit(list); }} />
                <MenuItem title="Delete" onPress={() => { setMenuVisible(false); onDelete(list); }} />
                <MenuItem
                    title="Add to Calendar"
                    onPress={() => {
                        setMenuVisible(false);
                        setShowDatePicker(true); // Show date picker when "Add to Calendar" is selected
                    }}
                />
            </OverflowMenu>

            {/* DateTimePicker for selecting date */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* DateTimePicker for selecting time */}
            {showTimePicker && (
                <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
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
    listName: {
        fontWeight: 'bold',
    },
});

export default List;
