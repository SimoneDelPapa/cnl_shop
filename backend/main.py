import os
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

from pydantic import BaseModel, EmailStr
from typing import List, Optional
import jwt
import bcrypt  

from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError("DATABASE_URL non configurata!")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- CONFIGURAZIONE JWT ---
SECRET_KEY = os.getenv("SECRET_KEY", "chiave_segreta_super_sicura_da_cambiare_in_produzione")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- CONFIGURAZIONE PASSWORD HASHING (NATIVA CON BCRYPT) ---
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- MODELLI DATABASE (Tabelle) ---
class Utente(Base):
    __tablename__ = "utenti"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_attivo = Column(Boolean, default=True)

class Ordine(Base):
    __tablename__ = "ordini"
    id = Column(Integer, primary_key=True, index=True)
    totale = Column(Float, nullable=False)
    stato_pagamento = Column(String, default="In attesa")
    utente_id = Column(Integer, ForeignKey("utenti.id"), nullable=True) 
    
    articoli = relationship("ArticoloOrdine", back_populates="ordine")

class ArticoloOrdine(Base):
    __tablename__ = "articoli_ordine"
    id = Column(Integer, primary_key=True, index=True)
    ordine_id = Column(Integer, ForeignKey("ordini.id"))
    prodotto_id = Column(Integer) 
    nome_prodotto = Column(String, nullable=False)
    prezzo = Column(Float, nullable=False)
    atleta = Column(String, nullable=False)
    taglia = Column(String, nullable=False)
    nome_personalizzato = Column(String, nullable=True)

    ordine = relationship("Ordine", back_populates="articoli")

Base.metadata.create_all(bind=engine)

# --- SCHEMI PYDANTIC ---
class UtenteCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str

class UtenteLogin(BaseModel):
    email: EmailStr
    password: str

class UtenteResponse(BaseModel):
    id: int
    email: EmailStr
    nome: str
    is_attivo: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ArticoloCarrello(BaseModel):
    prodottoId: int
    nomeProdotto: str
    prezzo: float
    atleta: str
    taglia: str
    nomePersonalizzato: Optional[str] = None

class OrdineCreate(BaseModel):
    totale: float
    carrello: List[ArticoloCarrello]

# --- INIZIALIZZAZIONE FASTAPI ---
app = FastAPI(title="CNL Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://simonedelpapa.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- DIPENDENZA: Verifica chi è l'utente loggato ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenziali non valide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(Utente).filter(Utente.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


# --- ROTTE API ---

@app.post("/api/register", response_model=UtenteResponse, status_code=status.HTTP_201_CREATED)
def registra_utente(utente: UtenteCreate, db: Session = Depends(get_db)):
    db_user = db.query(Utente).filter(Utente.email == utente.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    hashed_pwd = get_password_hash(utente.password)
    nuovo_utente = Utente(email=utente.email, nome=utente.nome, hashed_password=hashed_pwd)
    
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)
    return nuovo_utente


@app.post("/api/login")
def login_utente(credenziali: UtenteLogin, db: Session = Depends(get_db)):
    utente = db.query(Utente).filter(Utente.email == credenziali.email).first()
    
    if not utente or not verify_password(credenziali.password, utente.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password errati",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(utente.id)})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "utente": {"id": utente.id, "email": utente.email, "nome": utente.nome}
    }


# NUOVA ROTTA: Recupera i dati dell'utente dal token
@app.get("/api/users/me", response_model=UtenteResponse)
def ottieni_utente_corrente(current_user: Utente = Depends(get_current_user)):
    return current_user


@app.get("/api/products")
def get_products():
    return [
        {"id": 1, "nome": "Accappatoio Pallanuoto", "prezzo": 45.00, "personalizzabile": True},
        {"id": 2, "nome": "Costume Gara Pallanuoto", "prezzo": 35.00, "personalizzabile": False},
        {"id": 3, "nome": "T-Shirt Rappresentanza", "prezzo": 15.00, "personalizzabile": True},
        {"id": 4, "nome": "Cuffia in silicone", "prezzo": 8.00, "personalizzabile": False}
    ]

@app.post("/api/orders")
def crea_ordine(ordine_in: OrdineCreate, db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    try:
        nuovo_ordine = Ordine(totale=ordine_in.totale, utente_id=current_user.id)
        db.add(nuovo_ordine)
        db.commit()
        db.refresh(nuovo_ordine)
        
        for item in ordine_in.carrello:
            nuovo_articolo = ArticoloOrdine(
                ordine_id=nuovo_ordine.id,
                prodotto_id=item.prodottoId,
                nome_prodotto=item.nomeProdotto,
                prezzo=item.prezzo,
                atleta=item.atleta,
                taglia=item.taglia,
                nome_personalizzato=item.nomePersonalizzato
            )
            db.add(nuovo_articolo)
        
        db.commit()
        return {"messaggio": "Ordine salvato", "ordine_id": nuovo_ordine.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))