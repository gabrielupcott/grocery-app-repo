# Standard library imports
import os
import hmac
import base64
import sqlite3
import uuid
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from typing import Optional, List, Dict

# Third-party imports
import bcrypt
import requests
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
import boto3
from botocore.exceptions import ClientError

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration constants
DATABASE_FILE = "test.db"

# Load environment variables
load_dotenv()
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")
COGNITO_REGION = os.getenv("COGNITO_REGION")
OPEN_FOOD_FACTS_API_URL = os.getenv("OPEN_FOOD_FACTS_API_URL")
GEOCODING_API_KEY = os.getenv("GEOCODING_API_KEY")
GEOCODING_API_URL = "https://api.opencagedata.com/geocode/v1/json"

# Dependencies and clients
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
cognito_client = boto3.client('cognito-idp', region_name=COGNITO_REGION)

# ---------------------------
# Pydantic Models
# ---------------------------

class UserRegister(BaseModel):
    username: str
    password: str
    email: str
    role: int

class UserLogin(BaseModel):
    username: str
    password: str

class UserConfirm(BaseModel):
    username: str
    confirmation_code: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    user_location: Optional[str] = None
    name: Optional[str] = None
    role: Optional[int] = None

class ItemCreate(BaseModel):
    item_name: str
    item_description: Optional[str] = None
    item_nutrition: Optional[str] = None
    item_price: float
    item_stock: int
    item_type: Optional[str] = None
    item_image: Optional[str] = None
    user_id: str

class ItemUpdate(BaseModel):
    item_name: Optional[str]
    item_description: Optional[str]
    item_nutrition: Optional[str]
    item_price: Optional[float]
    item_stock: Optional[int]
    item_type: Optional[str]
    item_image: Optional[str]
    user_id: Optional[str]

class ListCreate(BaseModel):
    list_name: str
    list_image: Optional[str] = None
    user_id: str
    items: Optional[List[Dict[str, int]]] = None  # List of items with quantities

class ListUpdate(BaseModel):
    list_name: Optional[str]
    list_image: Optional[str]
    user_id: Optional[str]
    items: Optional[List[Dict[str, int]]] = None

class StoreCreate(BaseModel):
    store_name: str
    store_location: str
    store_owner_id: str
    store_flyer_link: Optional[str] = None

class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    store_location: Optional[str] = None
    store_flyer_link: Optional[str] = None

class Store(BaseModel):
    store_id: str
    store_name: str
    store_location: str
    store_owner_id: str
    store_flyer_link: str
    latitude: float
    longitude: float

# ---------------------------
# Database Initialization
# ---------------------------

def init_db():
    """
    Initialize the SQLite database and create tables if they do not exist.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR PRIMARY KEY,
        user_email VARCHAR NOT NULL UNIQUE,
        user_password VARCHAR NOT NULL,
        user_type VARCHAR NOT NULL,
        user_location TEXT
    )''')

    # Create stores table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stores (
        store_id VARCHAR PRIMARY KEY,
        store_name VARCHAR NOT NULL,
        store_location VARCHAR NOT NULL,
        store_owner_id VARCHAR,
        store_flyer_link VARCHAR,
        FOREIGN KEY (store_owner_id) REFERENCES users(user_id)
    )''')

    # Create lists table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS lists (
        list_id VARCHAR PRIMARY KEY,
        list_name VARCHAR NOT NULL,
        list_image VARCHAR,
        user_id VARCHAR NOT NULL,
        last_shopped DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )''')

    # Create items table with auto-incrementing item_id
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name VARCHAR NOT NULL,
        item_description VARCHAR,
        item_nutrition VARCHAR,
        item_price DECIMAL(10, 2),
        item_stock INT,
        item_type VARCHAR,
        item_image VARCHAR,
        user_id VARCHAR NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )''')

    # Create list_item_lines table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS list_item_lines (
        list_item_line_id VARCHAR PRIMARY KEY,
        list_id VARCHAR NOT NULL,
        item_id VARCHAR NOT NULL,
        list_item_quantity INT,
        FOREIGN KEY (list_id) REFERENCES lists(list_id),
        FOREIGN KEY (item_id) REFERENCES items(item_id)
    )''')
    conn.commit()
    conn.close()

def get_db_connection():
    """
    Create a database connection and set row_factory to sqlite3.Row.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # To return dict-like rows
    return conn

@app.on_event("startup")
def on_startup():
    """
    Initialize the database when the application starts.
    """
    init_db()

# ---------------------------
# Utility Functions
# ---------------------------

def get_cognito_jwks():
    """
    Retrieve JSON Web Key Set (JWKS) from AWS Cognito.
    """
    jwks_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url)
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as exc:
        print(f"An error occurred while requesting {exc.request.url!r}.")
        raise
    except httpx.HTTPStatusError as exc:
        print(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
        raise

jwks = get_cognito_jwks()

def decode_token(token: str):
    """
    Decode and verify a JWT token using AWS Cognito's JWKS.
    """
    try:
        header = jwt.get_unverified_header(token)
        key = next(
            key for key in jwks['keys'] if key['kid'] == header['kid']
        )
        return jwt.decode(token, key, algorithms=key['alg'], audience=COGNITO_CLIENT_ID)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Get the current user from the JWT token.
    """
    payload = decode_token(token)
    username: str = payload.get("username")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return User(username=username)

def get_secret_hash(username: str):
    """
    Generate the secret hash for AWS Cognito authentication.
    """
    message = username + COGNITO_CLIENT_ID
    dig = hmac.new(COGNITO_CLIENT_SECRET.encode(), message.encode(), digestmod='sha256').digest()
    return base64.b64encode(dig).decode()

def get_coordinates(address: str) -> Optional[Dict[str, float]]:
    """
    Get latitude and longitude coordinates for a given address using the geocoding API.
    """
    params = {
        'q': address,
        'key': GEOCODING_API_KEY,
        'limit': 1
    }
    response = requests.get(GEOCODING_API_URL, params=params)
    data = response.json()

    if response.status_code == 200 and data['results']:
        return {
            'latitude': data['results'][0]['geometry']['lat'],
            'longitude': data['results'][0]['geometry']['lng']
        }
    else:
        print(f"Error retrieving coordinates for address: {address}")
        return None

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the distance between two coordinates using the Haversine formula.
    """
    # Convert latitude and longitude from degrees to radians
    rlat1, rlon1, rlat2, rlon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlon = rlon2 - rlon1
    dlat = rlat2 - rlat1
    a = sin(dlat / 2)**2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = 6371 * c  # Radius of earth in kilometers (6371)

    return distance

# ---------------------------
# Routes
# ---------------------------

@app.get("/", tags=["Utilities"])
def read_root():
    """
    Endpoint to test if API is running.
    """
    return {"message": "API up and running"}

# Authentication Routes

@app.post("/register", tags=["Authentication"])
def register(user: UserRegister):
    """
    Register a new user with AWS Cognito and store in SQLite database.
    """
    try:
        # Hash the password before saving it
        hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        cognito_client.sign_up(
            ClientId=COGNITO_CLIENT_ID,
            SecretHash=get_secret_hash(user.username),
            Username=user.username,
            Password=user.password,  # Cognito stores the raw password
            UserAttributes=[
                {'Name': 'email', 'Value': user.email},
                {'Name': 'custom:role', 'Value': str(user.role)},
            ],
        )
    except ClientError as e:
        print(e.response)  # For debugging
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )
        
    # Add user details to SQLite DB
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()

        # Generate a unique user_id using UUID
        user_id = str(uuid.uuid4())

        # Insert the new user into the users table with hashed password
        cursor.execute(
            """
            INSERT INTO users (user_id, user_email, user_password, user_type)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, user.email, hashed_password, user.role)
        )
        
        conn.commit()
        conn.close()
    except sqlite3.IntegrityError:
        print("Username or email already exists in SQLite")  # For debugging
        raise HTTPException(status_code=400, detail="Username or email already exists in SQLite")

    return {"message": "User registered successfully"}

@app.post("/confirm-registration", tags=["Authentication"])
def confirm_registration(user: UserConfirm):
    """
    Confirm user registration with AWS Cognito using a confirmation code.
    """
    try:
        cognito_client.confirm_sign_up(
            ClientId=COGNITO_CLIENT_ID,
            SecretHash=get_secret_hash(user.username),
            Username=user.username,
            ConfirmationCode=user.confirmation_code,
        )
        return {"message": "User registration confirmed successfully"}
    except ClientError as e:
        print(e.response)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

@app.post("/token", response_model=dict, tags=["Authentication"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    User login endpoint using OAuth2PasswordRequestForm.
    """
    try:
        response = cognito_client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': form_data.username,
                'PASSWORD': form_data.password,
                'SECRET_HASH': get_secret_hash(form_data.username),
            },
        )
        return {"access_token": response['AuthenticationResult']['AccessToken'], "token_type": "bearer"}
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

@app.post("/app-login", response_model=dict, tags=["Authentication"])
def app_login(user: UserLogin):
    """
    App login endpoint for users.
    """
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()

        # Retrieve the hashed password from the database
        cursor.execute("SELECT user_password FROM users WHERE user_email = ?", (user.username,))
        result = cursor.fetchone()
        conn.close()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        hashed_password = result[0]

        # Verify the password
        if not bcrypt.checkpw(user.password.encode('utf-8'), hashed_password.encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )

        # Assuming authentication via AWS Cognito (if applicable)
        response = cognito_client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': user.username,
                'PASSWORD': user.password,
                'SECRET_HASH': get_secret_hash(user.username),
            },
        )
        return {"access_token": response['AuthenticationResult']['AccessToken'], "token_type": "bearer"}
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

@app.post("/logout", tags=["Authentication"])
def logout(token: str = Depends(oauth2_scheme)):
    """
    Logout endpoint to sign out the user globally.
    """
    try:
        cognito_client.global_sign_out(
            AccessToken=token,
        )
        return {"message": "User logged out successfully"}
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

@app.get("/protected", response_model=dict, tags=["Authentication"])
async def protected_route(current_user: User = Depends(get_current_user)):
    """
    A protected route that requires authentication.
    """
    return {"message": f"Hello {current_user.username}, you have access to this protected route!"}

# User Routes

@app.put("/users/{user_id}", tags=["Users"])
def update_user(user_id: str, user_update: UserUpdate, user: User = Depends(get_current_user)):
    """
    Update user details in the users table.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if the user exists
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    existing_user = cursor.fetchone()
    if not existing_user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    # Prepare fields to be updated
    update_data = {}
    if user_update.email:
        update_data["user_email"] = user_update.email
    if user_update.password:
        hashed_password = bcrypt.hashpw(user_update.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        update_data["user_password"] = hashed_password
    if user_update.user_location:
        update_data["user_location"] = user_update.user_location
    if user_update.name:
        update_data["user_name"] = user_update.name
    if user_update.role is not None:
        update_data["user_type"] = user_update.role

    # Build the SQL statement
    if update_data:
        update_fields = ', '.join([f"{key} = ?" for key in update_data.keys()])
        update_values = list(update_data.values()) + [user_id]

        cursor.execute(f"UPDATE users SET {update_fields} WHERE user_id = ?", update_values)
        conn.commit()

    conn.close()
    
    return {"message": "User updated successfully"}

@app.get("/user-type/{username}", tags=["Users"])
async def get_user_type(username: str, current_user: User = Depends(get_current_user)):
    """
    Retrieve the user type for the given username.
    Requires authentication.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query to fetch user_type based on the username
    cursor.execute("SELECT user_type FROM users WHERE user_email = ?", (username,))
    user_type = cursor.fetchone()
    conn.close()

    if not user_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"username": username, "user_type": user_type[0]}

@app.get("/user-location/{username}", tags=["Users"])
async def get_user_location(username: str, current_user: User = Depends(get_current_user)):
    """
    Retrieve the location for the given username.
    Requires authentication.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query to fetch user_location based on the username
    cursor.execute("SELECT user_location FROM users WHERE user_email = ?", (username,))
    user_location = cursor.fetchone()
    conn.close()

    if not user_location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"username": username, "user_location": user_location[0]}

@app.get("/user-location-coordinates", tags=["Users"])
async def get_user_location_coordinates(address: str, current_user: User = Depends(get_current_user)):
    """
    Retrieve the latitude and longitude coordinates for a given address.
    Requires authentication.
    """
    print(f"Address received: {address}")
    
    coordinates = get_coordinates(address)
    
    if not coordinates:
        raise HTTPException(status_code=404, detail="Coordinates not found for the provided location")

    return {"latitude": coordinates['latitude'], "longitude": coordinates['longitude']}

@app.get("/user-id", tags=["Users"])
async def get_user_id(email: str):
    """
    Get the user ID by email.
    """

    email = email.replace("%40", "@")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE user_email = ?", (email,))
    user_id = cursor.fetchone()
    conn.close()

    if user_id is None:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user_id": user_id[0]}

@app.get("/users", tags=["Users"])
def get_all_users(current_user: User = Depends(get_current_user)):
    """
    Retrieve all users from the SQLite database.
    Requires authentication.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, user_email, user_type FROM users")
    users = cursor.fetchall()
    conn.close()

    if not users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No users found")

    # Convert SQLite Row to dictionary
    return [{"user_id": user["user_id"], "email": user["user_email"], "role": user["user_type"]} for user in users]

@app.delete("/users/{user_id}", status_code=204, tags=["Users"])
def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a user from the SQLite database by user_id.
    Requires authentication.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    cursor.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

    return {"message": "User deleted successfully"}

# Item Routes

@app.post("/items", status_code=201, tags=["Items"])
def create_item(item: ItemCreate, user: User = Depends(get_current_user)):
    """
    Create a new item.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO items (item_name, item_description, item_nutrition, item_price, item_stock, item_type, item_image, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.item_name,
                item.item_description,
                item.item_nutrition,
                item.item_price,
                item.item_stock,
                item.item_type,
                item.item_image,
                item.user_id
            )
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Item with the same name already exists")
    finally:
        conn.close()

    return {"message": "Item created successfully"}

@app.get("/items/user/{user_id}", tags=["Items"])
def read_items_by_user(user_id: str, current_user: User = Depends(get_current_user)):
    """
    Get items by user ID.
    """

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE user_id = ?", (user_id,))
    items = cursor.fetchall()
    conn.close()

    return {"items": [dict(item) for item in items]}

@app.get("/items", tags=["Items"])
def read_items(current_user: User = Depends(get_current_user)):
    """
    Get all items.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items")
    items = cursor.fetchall()
    conn.close()

    if not items:
        raise HTTPException(status_code=404, detail="No items found")

    return {"items": [dict(item) for item in items]}

@app.get("/items/{item_id}", tags=["Items"])
def read_item(item_id: str, current_user: User = Depends(get_current_user)):
    """
    Get a specific item by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE item_id = ?", (item_id,))
    item = cursor.fetchone()
    conn.close()

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return dict(item)

@app.put("/items/{item_id}", tags=["Items"])
def update_item(item_id: str, item: ItemUpdate, current_user: User = Depends(get_current_user)):
    """
    Update an item by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get the existing item
    cursor.execute("SELECT * FROM items WHERE item_id = ?", (item_id,))
    existing_item = cursor.fetchone()

    if existing_item is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    # Prepare update values
    update_data = {key: value for key, value in item.dict().items() if value is not None}

    update_fields = ', '.join([f"{key} = ?" for key in update_data.keys()])
    update_values = list(update_data.values())
    update_values.append(item_id)

    cursor.execute(f"UPDATE items SET {update_fields} WHERE item_id = ?", update_values)
    conn.commit()
    conn.close()

    return {"message": "Item updated successfully"}

@app.delete("/items/{item_id}", status_code=204, tags=["Items"])
def delete_item(item_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete an item by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM items WHERE item_id = ?", (item_id,))
    item = cursor.fetchone()

    if item is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    cursor.execute("DELETE FROM items WHERE item_id = ?", (item_id,))
    conn.commit()
    conn.close()

    return {"message": "Item deleted successfully"}

# List Routes

@app.post("/lists", status_code=201, tags=["Lists"])
def create_list(list_data: ListCreate, current_user: User = Depends(get_current_user)):
    """
    Create a new list with items.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    list_id = str(uuid.uuid4())  # Generate a unique ID for the list

    try:
        # Insert the list into the lists table
        cursor.execute(
            """
            INSERT INTO lists (list_id, list_name, list_image, user_id)
            VALUES (?, ?, ?, ?)
            """,
            (
                list_id,
                list_data.list_name,
                list_data.list_image,
                list_data.user_id
            )
        )

        # Insert each item and its quantity into the list_item_lines table
        if list_data.items:
            for item in list_data.items:
                item_id = item.get('item_id')
                quantity = item.get('quantity', 1)  # Default quantity is 1 if not provided
                
                try:
                    cursor.execute(
                        """
                        INSERT INTO list_item_lines (list_item_line_id, list_id, item_id, list_item_quantity)
                        VALUES (?, ?, ?, ?)
                        """,
                        (
                            str(uuid.uuid4()),  # Unique list_item_line_id
                            list_id,
                            item_id,
                            quantity  # Use the provided quantity for the item
                        )
                    )
                except sqlite3.IntegrityError:
                    raise HTTPException(status_code=400, detail=f"Failed to add item {item_id} to the list")

        # Commit the transaction once after all inserts
        conn.commit()

    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Failed to create the list: {str(e)}")

    finally:
        conn.close()

    return {"message": "List created successfully", "list_id": list_id, "items": list_data.items}

@app.get("/lists", tags=["Lists"])
def get_all_lists(current_user: User = Depends(get_current_user)):
    """
    Get all lists.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lists")
    lists = cursor.fetchall()
    conn.close()

    if not lists:
        raise HTTPException(status_code=404, detail="No lists found")

    return {"lists": [dict(list_row) for list_row in lists]}

@app.get("/lists/user/{user_id}", tags=["Lists"])
def get_lists_by_user(user_id: str, current_user: User = Depends(get_current_user)):
    """
    Get all lists by a user ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lists WHERE user_id = ?", (user_id,))
    lists = cursor.fetchall()
    conn.close()

    if not lists:
        return {"message": "No lists found for the user"}

    return {"lists": [dict(list_row) for list_row in lists]}

@app.get("/lists/{list_id}", tags=["Lists"])
def get_list_by_id(list_id: str, current_user: User = Depends(get_current_user)):
    """
    Get a specific list by ID with its items and their quantities.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch the list details
    cursor.execute("SELECT * FROM lists WHERE list_id = ?", (list_id,))
    list_data = cursor.fetchone()

    if list_data is None:
        conn.close()
        raise HTTPException(status_code=404, detail="List not found")

    # Fetch all items associated with the list from list_item_lines and items, including the quantity
    cursor.execute('''
        SELECT items.*, list_item_lines.list_item_quantity as amount
        FROM items
        INNER JOIN list_item_lines ON items.item_id = list_item_lines.item_id
        WHERE list_item_lines.list_id = ?
    ''', (list_id,))
    items_data = cursor.fetchall()
    conn.close()

    # Convert list_data to a dictionary
    list_dict = dict(list_data)

    # Convert items_data to a list of dictionaries, including the amount field
    items_list = []
    for item in items_data:
        item_dict = dict(item)
        item_dict['amount'] = item['amount']  # Add the amount field from list_item_lines
        items_list.append(item_dict)

    # Add the items to the list dictionary
    list_dict['items'] = items_list

    return list_dict

@app.put("/lists/{list_id}", tags=["Lists"])
# def update_list(list_id: str, list_data: ListUpdate, current_user: User = Depends(get_current_user)):
def update_list(list_id: str, list_data: ListUpdate):
  
    """
    Update an existing list, including updating, adding, or removing items.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get the existing list
    cursor.execute("SELECT * FROM lists WHERE list_id = ?", (list_id,))
    existing_list = cursor.fetchone()

    if existing_list is None:
        conn.close()
        raise HTTPException(status_code=404, detail="List not found")

    # Begin transaction
    try:
        # Step 1: Update the fields in the lists table
        update_data = {key: value for key, value in list_data.dict(exclude_unset=True).items() if key != "items"}
        if update_data:
            update_fields = ', '.join([f"{key} = ?" for key in update_data.keys()])
            update_values = list(update_data.values()) + [list_id]
            cursor.execute(f"UPDATE lists SET {update_fields} WHERE list_id = ?", update_values)

        # Step 2: Fetch current items in the list
        cursor.execute("SELECT item_id FROM list_item_lines WHERE list_id = ?", (list_id,))
        current_item_ids = {row[0] for row in cursor.fetchall()}

        # Step 3: Process the items in list_data.items
        if list_data.items is not None:
            incoming_item_ids = set()

            for item_dict in list_data.items:  # Each `item_dict` is a dictionary like {'2': 1, '3': 1}
                for item_id, quantity in item_dict.items():  # Iterate over key-value pairs
                    print(f"Processing item_id: {item_id}, quantity: {quantity}")
                    incoming_item_ids.add(item_id)

                    # Check if the item already exists in the list
                    cursor.execute(
                        "SELECT * FROM list_item_lines WHERE list_id = ? AND item_id = ?",
                        (list_id, item_id)
                    )
                    existing_item = cursor.fetchone()

                    if existing_item:
                        # If the item exists, update its quantity
                        cursor.execute(
                            """
                            UPDATE list_item_lines
                            SET list_item_quantity = ?
                            WHERE list_id = ? AND item_id = ?
                            """,
                            (quantity, list_id, item_id)
                        )
                    else:
                        # If the item doesn't exist, insert it
                        cursor.execute(
                            """
                            INSERT INTO list_item_lines (list_item_line_id, list_id, item_id, list_item_quantity)
                            VALUES (?, ?, ?, ?)
                            """,
                            (str(uuid.uuid4()), list_id, item_id, quantity)
                        )

            # Step 4: Identify and delete items removed from the list
            items_to_remove = current_item_ids - incoming_item_ids
            if items_to_remove:
                cursor.executemany(
                    "DELETE FROM list_item_lines WHERE list_id = ? AND item_id = ?",
                    [(list_id, item_id) for item_id in items_to_remove]
                )
        

        # Commit the transaction
        conn.commit()

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update the list: {str(e)}")

    finally:
        conn.close()

    return {"message": "List updated successfully"}

@app.delete("/lists/{list_id}", status_code=204, tags=["Lists"])
def delete_list(list_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a list by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM lists WHERE list_id = ?", (list_id,))
    list_data = cursor.fetchone()

    if list_data is None:
        conn.close()
        raise HTTPException(status_code=404, detail="List not found")

    cursor.execute("DELETE FROM lists WHERE list_id = ?", (list_id,))
    conn.commit()
    conn.close()

    return {"message": "List deleted successfully"}

@app.put("/lists/{list_id}/shop", tags=["Lists"])
def shop_list(list_id: str, current_user: User = Depends(get_current_user)):
    """
    Update the last_shopped date for the specified list to the current date and time.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if the list exists
    cursor.execute("SELECT * FROM lists WHERE list_id = ?", (list_id,))
    list_data = cursor.fetchone()
    if list_data is None:
        conn.close()
        raise HTTPException(status_code=404, detail="List not found")

    # Update the last_shopped date to the current datetime
    last_shopped_date = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    try:
        cursor.execute(
            "UPDATE lists SET last_shopped = ? WHERE list_id = ?",
            (last_shopped_date, list_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update last_shopped date: {str(e)}")
    finally:
        conn.close()

    return {"message": "List shopped successfully", "last_shopped": last_shopped_date}

# Store Routes

@app.post("/stores", status_code=201, tags=["Stores"])
def create_store(store: StoreCreate, current_user: User = Depends(get_current_user)):
    """
    Create a new store.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    store_id = str(uuid.uuid4())
    try:
        # Check if store with same location exists
        cursor.execute(
            'SELECT store_id FROM stores WHERE store_location = ?',
            (store.store_location,)
        )
        existing_store = cursor.fetchone()
        if existing_store:
            raise HTTPException(
                status_code=400, 
                detail="A store at this location already exists"
            )

        # If no duplicate, proceed with insertion
        cursor.execute(
            '''
            INSERT INTO stores (store_id, store_name, store_location, store_owner_id, store_flyer_link)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (store_id, store.store_name, store.store_location, store.store_owner_id, store.store_flyer_link)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Failed to create the store")
    finally:
        conn.close()
    return {"message": "Store created successfully", "store_id": store_id}

@app.get("/stores/{store_id}", tags=["Stores"])
def read_store(store_id: str, current_user: User = Depends(get_current_user)):
    """
    Read a store by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stores WHERE store_id = ?", (store_id,))
    store = cursor.fetchone()
    conn.close()
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")
    return dict(store)

@app.get("/stores", tags=["Stores"])
def read_all_stores(current_user: User = Depends(get_current_user)):
    """
    Read all stores.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stores")
    stores = cursor.fetchall()
    conn.close()
    if not stores:
        raise HTTPException(status_code=404, detail="No stores found")
    return {"stores": [dict(store) for store in stores]}

@app.get("/stores/owner/{owner_id}", tags=["Stores"])
def read_stores_by_owner(owner_id: str, current_user: User = Depends(get_current_user)):
    """
    Read stores by owner ID.
    """

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stores WHERE store_owner_id = ?", (owner_id,))
    stores = cursor.fetchall()
    conn.close()
    if not stores:
        raise HTTPException(status_code=404, detail="No stores found for the owner")
    return {"stores": [dict(store) for store in stores]}

@app.put("/stores/{store_id}", tags=["Stores"])
def update_store(store_id: str, store: StoreUpdate, current_user: User = Depends(get_current_user)):
    """
    Update a store by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stores WHERE store_id = ?", (store_id,))
    existing_store = cursor.fetchone()
    if existing_store is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Store not found")

    if current_user.username != existing_store["store_owner_id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden")

    # Prepare update statement based on fields provided
    update_data = {k: v for k, v in store.dict(exclude_unset=True).items()}
    if update_data:
        update_fields = ', '.join([f"{key} = ?" for key in update_data.keys()])
        update_values = list(update_data.values())
        update_values.append(store_id)
        cursor.execute(f"UPDATE stores SET {update_fields} WHERE store_id = ?", update_values)
        conn.commit()
    conn.close()
    return {"message": "Store updated successfully"}

@app.delete("/stores/{store_id}", status_code=204, tags=["Stores"])
def delete_store(store_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a store by ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stores WHERE store_id = ?", (store_id,))
    store = cursor.fetchone()
    if store is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Store not found")

    if current_user.username != store["store_owner_id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden")

    cursor.execute("DELETE FROM stores WHERE store_id = ?", (store_id,))
    conn.commit()
    conn.close()
    return {"message": "Store deleted successfully"}

# Utilities Routes

@app.get("/product-info/{barcode}", response_model=dict, tags=["Utilities"])
async def get_product_info(barcode: str, current_user: User = Depends(get_current_user)):
    """
    Fetch product info from Open Food Facts based on the barcode (UPC).
    Requires authentication.
    """
    try:
        # Make the request to Open Food Facts API
        async with httpx.AsyncClient() as client:
            url = OPEN_FOOD_FACTS_API_URL.format(barcode=barcode)
            response = await client.get(url)
            response.raise_for_status()  # Raise an error if the request failed

        # Check if the product was found
        product_data = response.json()
        if product_data.get('status') == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        return product_data

    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to contact external API")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch product information")

@app.get("/nearby-stores", tags=["Utilities"])
def get_nearby_stores(current_location: str, current_user: User = Depends(get_current_user)) -> List[Store]:
    """
    Get nearby stores within 50 km of a specified location.
    """
    # Convert current location to coordinates
    current_coords = get_coordinates(current_location)
    if not current_coords:
        raise HTTPException(status_code=404, detail="Could not find coordinates for the provided location.")

    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stores")
    stores = cursor.fetchall()
    conn.close()

    nearby_stores = []
    for store in stores:
        # Get coordinates for each store location
        store_coords = get_coordinates(store["store_location"])
        
        if store_coords:
            # Calculate distance and check if within 50 km
            distance = calculate_distance(current_coords['latitude'], current_coords['longitude'],
                                          store_coords['latitude'], store_coords['longitude'])
            if distance <= 50:
                nearby_stores.append({
                    "store_id": store["store_id"],
                    "store_name": store["store_name"],
                    "store_location": store["store_location"],
                    "store_owner_id": store["store_owner_id"],
                    "store_flyer_link": store["store_flyer_link"],
                    "latitude": store_coords["latitude"],
                    "longitude": store_coords["longitude"]
                })
        else:
            print(f"Skipping store due to missing coordinates: {store['store_name']} at {store['store_location']}")

    if not nearby_stores:
        raise HTTPException(status_code=404, detail="No stores found within 50 km.")

    return nearby_stores

@app.post("/verify-location", tags=["Utilities"])
def verify_location(address: str, current_user: User = Depends(get_current_user)):
    """
    Verify if a location can be found based on its address.
    """
    coordinates = get_coordinates(address)
    if coordinates:
        return {
            "found": True,
            "message": "Location found",
            "latitude": coordinates["latitude"],
            "longitude": coordinates["longitude"]
        }
    else:
        raise HTTPException(status_code=404, detail="Location not found")

# Main Entry Point

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
