from pydantic import BaseModel, EmailStr

# Dati che il frontend ci invia durante la registrazione
class UtenteCreate(BaseModel):
    nome: str
    email: EmailStr  # Richiede: pip install "pydantic[email]"
    password: str

# Dati che restituiamo al frontend (SENZA la password)
class UtenteResponse(BaseModel):
    id: int
    email: EmailStr
    nome: str
    is_attivo: bool

    class Config:
        orm_mode = True # Per Pydantic v1 (usa model_config = {'from_attributes': True} per Pydantic v2)

# Dati inviati da React per fare il login (potresti anche usare OAuth2PasswordRequestForm di FastAPI, 
# ma un JSON semplice è più comodo per React)
class UtenteLogin(BaseModel):
    email: EmailStr
    password: str

# Schema del Token di risposta
class Token(BaseModel):
    access_token: str
    token_type: str