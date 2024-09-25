// Mock react-native-vector-icons/Ionicons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@react-native-segmented-control/segmented-control', () => {
    return {
      __esModule: true,
      default: 'SegmentedControl', // Mock component
    };
  });

jest.mock('react-native-floating-action', () => {
    return {
      FloatingAction: 'FloatingAction', // Mock component
    };
  });

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    cancelled: false,
    assets: [{ uri: 'mockImageUri', base64: 'mockBase64' }],
  }),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: 'Camera',
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

// Mock axios for network requests
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));
