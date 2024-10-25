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
    last_shopped?: string; // Last shopped date
};

type ListProps = {
    list: ListType;
    onEdit: (list: ListType) => void;
    onDelete: (list: ListType) => void;
};

const List: React.FC<ListProps> = ({ list, onEdit, onDelete }) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [show, setShow] = useState(false); // Controls picker visibility
    const [mode, setMode] = useState<'date' | 'time'>('date'); // Picker mode
    const [selectedDate, setSelectedDate] = useState(new Date()); // Selected date
    const [selectedTime, setSelectedTime] = useState(new Date()); // Selected time

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

    // Get or create the "Shopping Lists" calendar
    const getOrCreateCalendar = async (): Promise<string> => {
        const calendars = await Calendar.getCalendarsAsync();
        const existingCalendar = calendars.find(cal => cal.title === 'Shopping Lists');

        if (existingCalendar) {
            return existingCalendar.id;
        }

        // Get the default calendar source (especially important for iOS)
        const defaultCalendarSource =
            Platform.OS === 'ios'
                ? (await Calendar.getDefaultCalendarAsync()).source
                : { isLocalAccount: true, name: 'Grocery Shopping', type: Calendar.SourceType.LOCAL };

        // Create a new calendar
        const newCalendarId = await Calendar.createCalendarAsync({
            title: 'Shopping Lists',
            color: 'blue',
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: Platform.OS === 'ios' ? defaultCalendarSource.id : undefined,
            source: Platform.OS === 'ios' ? defaultCalendarSource : undefined,
            name: 'Shopping Lists',
            ownerAccount: 'personal',
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });

        return newCalendarId;
    };

    // Add list to the calendar as an event
    const addToCalendar = async (startDate: Date) => {
        const hasPermission = await requestCalendarPermission();
        if (!hasPermission) return;

        try {
            const calendarId = await getOrCreateCalendar();

            // Merge selected date and time correctly
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1); // 1-hour duration

            // Get the device's local time zone
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

            console.log('Selected start date:', startDate);
            console.log('Selected end date:', endDate);
            console.log('Time Zone:', timeZone);

            // Create an event with the selected date and list name
            const eventId = await Calendar.createEventAsync(calendarId, {
                title: list.list_name,
                startDate,  // Use selected date for the event start
                endDate,    // Set event end time 1 hour later
                timeZone,   // Use device's local time zone
                notes: `List contains ${list.item_count} items.`,
            });

            Alert.alert('Success', `Event added to the calendar with ID: ${eventId}`);
        } catch (error) {
            console.error('Error adding event to calendar:', error);
            Alert.alert('Error', 'There was an issue adding the event to your calendar.');
        }
    };

    // Handler for date and time changes
    const onChange = (event: any, selectedValue?: Date) => {
        if (event.type === 'dismissed') {
            setShow(false);
            return;
        }

        if (mode === 'date') {
            const currentDate = selectedValue || selectedDate;
            setSelectedDate(currentDate);
            if (Platform.OS === 'android') {
                // On Android, after selecting date, close the picker first
                setShow(false);
                // Then, open time picker after a short delay
                setTimeout(() => {
                    setMode('time');
                    setShow(true);
                }, 0);
            } else {
                // On iOS, switch to time mode while keeping the picker open
                setMode('time');
            }
        } else if (mode === 'time') {
            const currentTime = selectedValue || selectedTime;
            setSelectedTime(currentTime);
            setShow(false);

            // Combine selected date and time
            const combinedDateTime = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                currentTime.getHours(),
                currentTime.getMinutes()
            );

            // Add to calendar
            addToCalendar(combinedDateTime);
        }
    };

    // Function to show the picker in a specific mode
    const showMode = (currentMode: 'date' | 'time') => {
        setMode(currentMode);
        setShow(true);
    };

    // Function to initiate date selection
    const showDatepicker = () => {
        showMode('date');
    };

    let daysSinceLastShopped = list.last_shopped
        ? Math.floor((new Date().getTime() - new Date(list.last_shopped).getTime()) / (1000 * 60 * 60 * 24))
        : null;

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
                    {list.item_count} items |{' '}
                    {list.last_shopped
                        ? `Last Shopped: ${
                              daysSinceLastShopped && daysSinceLastShopped > 0
                                  ? `${daysSinceLastShopped} days ago`
                                  : 'Today'
                          }`
                        : 'Never Shopped'}
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
                <MenuItem
                    title="Edit"
                    onPress={() => {
                        setMenuVisible(false);
                        onEdit(list);
                    }}
                />
                <MenuItem
                    title="Delete"
                    onPress={() => {
                        setMenuVisible(false);
                        onDelete(list);
                    }}
                />
                <MenuItem
                    title="Add to Calendar"
                    onPress={() => {
                        setMenuVisible(false);
                        showDatepicker(); // Show date picker when "Add to Calendar" is selected
                    }}
                />
            </OverflowMenu>

            {/* DateTimePicker for selecting date and time */}
            {show && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={mode === 'date' ? selectedDate : selectedTime}
                    mode={mode}
                    is24Hour={false}
                    display="default"
                    onChange={onChange}
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
