from fastapi import FastAPI, Depends, HTTPException, status, Security
from pydantic import BaseModel
from jose import JWTError, jwt
import boto3
from botocore.exceptions import ClientError
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.openapi.models import OAuthFlowPassword
from fastapi.security import OAuth2
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import httpx
from dotenv import load_dotenv
import os
import hmac
import base64
import sqlite3
import uuid  # Add this at the top of the file to generate user IDs
from typing import Optional
import bcrypt

# FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite setup using sqlite3
DATABASE_FILE = "test.db"

# Load environment variables from secrets.env for AWS Cognito configuration
load_dotenv()
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")
COGNITO_REGION = os.getenv("COGNITO_REGION")
OPEN_FOOD_FACTS_API_URL = os.getenv("OPEN_FOOD_FACTS_API_URL")

# Dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Boto3 client
cognito_client = boto3.client('cognito-idp', region_name=COGNITO_REGION)

# Models
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
    
class UserResendConfirm(BaseModel):
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    
# Models for item operations
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
    # items should be a list of dicts with item_id and quantity
    items: Optional[list[dict[str, int]]] = None

class ListUpdate(BaseModel):
    list_name: Optional[str]
    list_image: Optional[str]
    user_id: Optional[str]
    items: Optional[list[dict[str, int]]] = None
    
def init_db():
    """Initialize the SQLite database and create a users table if it doesn't exist."""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
     # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR PRIMARY KEY,
        user_email VARCHAR NOT NULL UNIQUE,
        user_password VARCHAR NOT NULL,
        user_type VARCHAR NOT NULL
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
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )''')

    # Create items table with auto-incrementing item_id
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- This line is modified
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
    

# Helper function to connect to the database
def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # To return dict-like rows
    return conn

# Initialize the database on app startup
@app.on_event("startup")
def on_startup():
    init_db()

# Utility functions
def get_cognito_jwks():
    jwks_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}/.well-known/jwks.json"
    print(f"Fetching JWKS from: {jwks_url}")  # Debugging output
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
    payload = decode_token(token)
    username: str = payload.get("username")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return User(username=username)

def get_secret_hash(username):
    message = username + COGNITO_CLIENT_ID
    dig = hmac.new(COGNITO_CLIENT_SECRET.encode(), message.encode(), digestmod='sha256').digest()
    return base64.b64encode(dig).decode()

# Routes

# Endpoint to test if API is running
@app.get("/")
def read_root():
    return {"message": "API up and running"}


@app.post("/register")
def register(user: UserRegister):
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

@app.get("/users")
def get_users():
    """Get users from the SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    conn.close()
    return {"users": users}

@app.post("/token", response_model=dict)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
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

@app.post("/app-login", response_model=dict)
def app_login(user: UserLogin):
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

@app.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
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

@app.get("/protected", response_model=dict)
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}, you have access to this protected route!"}

@app.post("/resend-confirmation-code")
def resend_confirmation_code(user: UserResendConfirm):
    try:
        cognito_client.resend_confirmation_code(
            ClientId=COGNITO_CLIENT_ID,
            SecretHash=get_secret_hash(user.username),
            Username=user.username
        )
        return {"message": "Confirmation code resent successfully"}
    except ClientError as e:
        print(e.response)  # For debugging
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

@app.post("/confirm-registration")
def confirm_registration(user: UserConfirm):
    print(user.username, user.confirmation_code)
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
        
        
# Add a route to get the current user id by email
@app.get("/user-id")
async def get_user_id(email: str, current_user: User = Depends(get_current_user)):
    
    # Need to account for @ turning into %40 in the URL
    email = email.replace("%40", "@")
    print(email)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE user_email = ?", (email,))
    user_id = cursor.fetchone()
    conn.close()

    if user_id is None:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user_id": user_id[0]}


@app.post("/populate-items")
def populate_items():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Sample items data with nutritional information stored as JSON strings
    sample_items = [
        {
            "item_name": "Apple",
            "item_description": "Fresh red apples",
            "item_nutrition": '{"Calories": "52", "Carbohydrates": "14g", "Protein": "0.3g", "Fat": "0.2g"}',  # Nutritional information as JSON
            "item_price": 0.99,
            "item_stock": 100,
            "item_type": "Fruit",
            "item_image": "apple_image_url",
            "user_id": "f1b11837-7fbb-4a87-8848-b296dafe3d9b"  # Replace with an existing user_id
        },
        {
            "item_name": "Banana",
            "item_description": "Yellow ripe bananas",
            "item_nutrition": '{"Calories": "89", "Carbohydrates": "23g", "Protein": "1.1g", "Fat": "0.3g"}',  # Nutritional information as JSON
            "item_price": 0.69,
            "item_stock": 200,
            "item_type": "Fruit",
            "item_image": "banana_image_url",
            "user_id": "f1b11837-7fbb-4a87-8848-b296dafe3d9b"  # Replace with an existing user_id
        },
        {
            "item_name": "Chicken Breast",
            "item_description": "Boneless skinless chicken breast",
            "item_nutrition": '{"Calories": "165", "Protein": "31g", "Fat": "3.6g", "Carbohydrates": "0g"}',  # Nutritional information as JSON
            "item_price": 5.99,
            "item_stock": 50,
            "item_type": "Meat",
            "item_image": "chicken_breast_image_url",
            "user_id": "f1b11837-7fbb-4a87-8848-b296dafe3d9b"  # Replace with an existing user_id
        },
        {
            "item_name": "Almonds",
            "item_description": "Roasted unsalted almonds",
            "item_nutrition": '{"Calories": "576", "Protein": "21g", "Fat": "49g", "Carbohydrates": "22g", "Fiber": "12g"}',  # Nutritional information as JSON
            "item_price": 10.99,
            "item_stock": 150,
            "item_type": "Nuts",
            "item_image": "almonds_image_url",
            "user_id": "f1b11837-7fbb-4a87-8848-b296dafe3d9b"  # Replace with an existing user_id
        }
    ]

    # Insert each item into the database
    for item in sample_items:
        try:
            cursor.execute(
                """
                INSERT INTO items (item_name, item_description, item_nutrition, item_price, item_stock, item_type, item_image, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item['item_name'],
                    item['item_description'],
                    item['item_nutrition'],  # Nutritional information stored as JSON string
                    item['item_price'],
                    item['item_stock'],
                    item['item_type'],
                    item['item_image'],
                    item['user_id']
                )
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail=f"Item {item['item_name']} already exists")
    
    conn.commit()
    conn.close()

    return {"message": "Sample items populated successfully"}

        
# Create a new item
@app.post("/items", status_code=201)
def create_item(item: ItemCreate):
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


# Get items by user id
@app.get("/items/user/{user_id}")
def read_items_by_user(user_id: str, current_user: User = Depends(get_current_user)):
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE user_id = ?", (user_id,))
    items = cursor.fetchall()
    conn.close()

    # if not items:
    #     raise HTTPException(status_code=404, detail="No items found")

    return {"items": [dict(item) for item in items]}

# Read all items
@app.get("/items")
def read_items(current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items")
    items = cursor.fetchall()
    conn.close()

    if not items:
        raise HTTPException(status_code=404, detail="No items found")

    return {"items": [dict(item) for item in items]}

# Read specific item by ID
@app.get("/items/{item_id}")
def read_item(item_id: str, current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE item_id = ?", (item_id,))
    item = cursor.fetchone()
    conn.close()

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return dict(item)

# Update an item by ID
@app.put("/items/{item_id}")
def update_item(item_id: str, item: ItemUpdate, current_user: User = Depends(get_current_user)):
    print(item)
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

# Delete an item by ID
@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, current_user: User = Depends(get_current_user)):
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

@app.get("/product-info/{barcode}", response_model=dict)
async def get_product_info(barcode: str, current_user: Optional[User] = Depends(get_current_user)):
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

@app.post("/populate-example-list", status_code=201)
def populate_example_list(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate a unique list_id
    list_id = str(uuid.uuid4())

    # Insert a new list into the lists table
    try:
        cursor.execute(
            """
            INSERT INTO lists (list_id, list_name, list_image, user_id)
            VALUES (?, ?, ?, ?)
            """,
            (
                list_id,
                "Example Food List",  # List name
                None,  # No image
                user_id  # The user who owns the list
            )
        )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Failed to create the example list")

    # Define a few example items
    example_items = [
        {
            "item_name": "Milk",
            "item_description": "1 gallon of whole milk",
            "item_nutrition": '{"Calories": "150", "Protein": "8g", "Carbohydrates": "12g", "Fat": "8g"}',
            "item_price": 3.50,
            "item_stock": 10,
            "item_type": "Dairy",
            "item_image": "milk_image_url"
        },
        {
            "item_name": "Bread",
            "item_description": "Whole wheat bread",
            "item_nutrition": '{"Calories": "110", "Protein": "4g", "Carbohydrates": "20g", "Fat": "2g"}',
            "item_price": 2.00,
            "item_stock": 25,
            "item_type": "Grain",
            "item_image": "bread_image_url"
        },
        {
            "item_name": "Eggs",
            "item_description": "1 dozen eggs",
            "item_nutrition": '{"Calories": "70", "Protein": "6g", "Carbohydrates": "1g", "Fat": "5g"}',
            "item_price": 1.99,
            "item_stock": 30,
            "item_type": "Protein",
            "item_image": "eggs_image_url"
        }
    ]

    # Insert each example item into the items table and associate it with the list
    for item in example_items:
        try:
            cursor.execute(
                """
                INSERT INTO items (item_name, item_description, item_nutrition, item_price, item_stock, item_type, item_image, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item['item_name'],
                    item['item_description'],
                    item['item_nutrition'],
                    item['item_price'],
                    item['item_stock'],
                    item['item_type'],
                    item['item_image'],
                    user_id
                )
            )

            # Get the last inserted item's ID
            item_id = cursor.lastrowid

            # Insert into list_item_lines to associate the item with the list
            cursor.execute(
                """
                INSERT INTO list_item_lines (list_item_line_id, list_id, item_id, list_item_quantity)
                VALUES (?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),  # Unique list_item_line_id
                    list_id,
                    item_id,
                    1  # Quantity of the item in the list
                )
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail=f"Failed to add {item['item_name']} to the list")

    conn.commit()
    conn.close()

    return {"message": "Example list and items populated successfully", "list_id": list_id}

# Create a new list
@app.post("/lists", status_code=201)
def create_list(list_data: ListCreate):
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


# Get all lists
@app.get("/lists")
def get_lists_by_user(current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lists")
    lists = cursor.fetchall()
    conn.close()

    if not lists:
        raise HTTPException(status_code=404, detail="No lists found")

    return {"lists": [dict(list_row) for list_row in lists]}


# Get all lists by a user ID
@app.get("/lists/user/{user_id}")
def get_lists_by_user(user_id: str, current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lists WHERE user_id = ?", (user_id,))
    lists = cursor.fetchall()
    conn.close()

    if not lists:
        return {"message": "No lists found for the user"}

# return {"items": [dict(item) for item in items]}
    return {"lists": [dict(list_row) for list_row in lists]}


# Get a specific list by ID with its items and their amounts
@app.get("/lists/{list_id}")
def get_list_by_id(list_id: str, current_user: User = Depends(get_current_user)):
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

# Read list_item_lines by list ID
@app.get("/list-item-lines/{list_id}")
def read_list_item_lines(list_id: str, current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT list_item_lines.*, items.item_name, items.item_description
        FROM list_item_lines
        INNER JOIN items ON list_item_lines.item_id = items.item_id
        WHERE list_item_lines.list_id = ?
    ''', (list_id,))
    list_item_lines = cursor.fetchall()
    conn.close()

    if not list_item_lines:
        raise HTTPException(status_code=404, detail="No list item lines found")

    return {"list_item_lines": [dict(line) for line in list_item_lines]}



# Update an existing list, including updating or adding items in list_item_lines
@app.put("/lists/{list_id}")
def update_list(list_id: str, list_data: ListUpdate, current_user: User = Depends(get_current_user)):
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

        # Step 2: Update the items in list_item_lines
        if list_data.items is not None:
            for item in list_data.items:
                item_id, quantity = list(item.items())[0]  # Assuming each item is a dict {item_id: quantity}

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

        # Commit the transaction
        conn.commit()

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update the list: {str(e)}")

    finally:
        conn.close()

    return {"message": "List updated successfully"}



# Delete a list by ID
@app.delete("/lists/{list_id}", status_code=204)
def delete_list(list_id: str, current_user: User = Depends(get_current_user)):
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


# Endpoint to get all users
@app.get("/users", response_model=list[dict])
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


# Endpoint to delete a user by ID
@app.delete("/users/{user_id}", status_code=204)
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



# Main function to run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
