import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- IMPORT AGGIUNTI PER LA REGISTRAZIONE ---
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from passlib.context import CryptContext

from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# Carica le variabili dal file .env se siamo in locale
load_dotenv()

# Prende la variabile d'ambiente (su Render la imposteremo dal loro pannello)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError("DATABASE_URL non configurata!")

# Se la stringa inizia con postgres:// (vecchio standard), SQLAlchemy v2 richiede postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- CONFIGURAZIONE PASSWORD HASHING ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

# --- 2. MODELLI DATABASE (Tabelle) ---

# NUOVO MODELLO: Tabella Utenti
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

# Crea le tabelle nel database (creerà in automatico la nuova tabella 'utenti')
Base.metadata.create_all(bind=engine)


# --- 3. SCHEMI PYDANTIC ---

# NUOVI SCHEMI PER LA REGISTRAZIONE
class UtenteCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str

class UtenteResponse(BaseModel):
    id: int
    email: EmailStr
    nome: str
    is_attivo: bool

    class Config:
        from_attributes = True

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


# --- 4. INIZIALIZZAZIONE FASTAPI ---
app = FastAPI(title="CNL Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://simonedelpapa.github.io" # Il tuo URL futuro di GitHub Pages
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dipendenza per ottenere la sessione del DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- 5. ROTTE API ---

# NUOVA ROTTA: Registrazione Utente
@app.post("/api/register", response_model=UtenteResponse, status_code=status.HTTP_201_CREATED)
def registra_utente(utente: UtenteCreate, db: Session = Depends(get_db)):
    # Controlla se l'email esiste già
    db_user = db.query(Utente).filter(Utente.email == utente.email).first()
    if db_user:
        raise HTTPException(
            status_code=400, 
            detail="Email già registrata"
        )
    
    # Cripta la password e salva l'utente
    hashed_pwd = get_password_hash(utente.password)
    nuovo_utente = Utente(
        email=utente.email,
        nome=utente.nome,
        hashed_password=hashed_pwd
    )
    
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)
    
    return nuovo_utente


@app.get("/api/products")
def get_products():
    return [
        {"id": 1, "nome": "Accappatoio Pallanuoto", "prezzo": 45.00, "personalizzabile": True},
        {"id": 2, "nome": "Costume Gara Pallanuoto", "prezzo": 35.00, "personalizzabile": False},
        {"id": 3, "nome": "T-Shirt Rappresentanza", "prezzo": 15.00, "personalizzabile": True},
        {"id": 4, "nome": "Cuffia in silicone", "prezzo": 8.00, "personalizzabile": False}
    ]

@app.post("/api/orders")
def crea_ordine(ordine_in: OrdineCreate, db: Session = Depends(get_db)):
    try:
        nuovo_ordine = Ordine(totale=ordine_in.totale)
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