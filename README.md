# Smart Grocery Management App

This is my capstone project, a grocery management application! It's an Expo app using React Native and TypeScript alongside a Python FastAPI backend that uses SQLite as a database. This code doesn't include all of the necessary credentials to run this locally (AWS credentials for cognito, API keys etc) but it is otherwise completely open-source.

I'm pretty proud of what I was able to create given the time constraints of a single semester. There's definitely areas where the code could be cleaned up and I would certainly do things a bit differently in the future but it was an excellent learning opportunity.

## Features

- 🛒 Shopping List Management
- 🏪 Store Management & Inventory
- 📱 Barcode Scanner Integration
- 🔐 User Authentication
- 📦 Pantry Management
- 🗺️ Store Locator
- 📊 Item Details & Tracking

## Tech Stack

### Frontend
- React Native/Expo
- TypeScript
- UI Kitten Components
- React Navigation
- Formik & Yup for form validation
- Expo Camera for barcode scanning
- React Native Maps

### Backend
- Python
- SQLite Database

## Getting Started

### Prerequisites
- Node.js
- npm or yarn
- Python 3.x
- Expo CLI

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install frontend dependencies:
```bash
cd grocery-app
npm install
```

3. Install backend dependencies:
```bash
cd api
pip install -r requirements.txt
```

### Running the Application

1. Start the backend server:
```bash
cd api
python main.py
```

2. Start the Expo development server:
```bash
cd grocery-app
npx expo start
```

## Testing

The application includes comprehensive test coverage using Jest and React Native Testing Library.

To run tests:
```bash
cd grocery-app
npm test
```

## Project Structure

- `/api` - Python backend server
- `/grocery-app` - React Native frontend application
  - `/app` - Main application screens
  - `/components` - Reusable React components
  - `/constants` - Application constants and theme
  - `/assets` - Images and other static assets
  - `/__tests__` - Test files

## License

This project is licensed under the MIT License - see the LICENSE file for details.
