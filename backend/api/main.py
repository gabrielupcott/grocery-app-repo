from fastapi import FastAPI, Depends, HTTPException, status, Security
from pydantic import BaseModel
from jose import JWTError, jwt
import boto3
from botocore.exceptions import ClientError
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.openapi.models import OAuthFlowPassword
from fastapi.security import OAuth2
from typing import Optional
import httpx
from dotenv import load_dotenv
import os
import hmac
import base64

# FastAPI app
app = FastAPI()

# Load environment variables from secrets.env for AWS Cognito configuration
load_dotenv()
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")
COGNITO_REGION = os.getenv("COGNITO_REGION")

# Dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Boto3 client
cognito_client = boto3.client('cognito-idp', region_name=COGNITO_REGION)

# Models
class UserRegister(BaseModel):
    username: str
    password: str
    email: str

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
@app.post("/register")
def register(user: UserRegister):
    try:
        cognito_client.sign_up(
            ClientId=COGNITO_CLIENT_ID,
            SecretHash=get_secret_hash(user.username),
            Username=user.username,
            Password=user.password,
            UserAttributes=[
                {'Name': 'email', 'Value': user.email},
            ],
        )
        return {"message": "User registered successfully"}
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

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

@app.post("/confirm-registration")
def confirm_registration(user: UserConfirm):
    try:
        cognito_client.confirm_sign_up(
            ClientId=COGNITO_CLIENT_ID,
            SecretHash=get_secret_hash(user.username),
            Username=user.username,
            ConfirmationCode=user.confirmation_code,
        )
        return {"message": "User registration confirmed successfully"}
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.response['Error']['Message'],
        )

# Main function to run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
