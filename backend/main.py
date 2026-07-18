import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
# ... altri import ...

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
# ... tutto il resto del codice del database e delle rotte rimane identico ...
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. MODELLI DATABASE (Tabelle)
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

# Crea le tabelle nel database
Base.metadata.create_all(bind=engine)

# 3. SCHEMI PYDANTIC (Per validare i dati in arrivo da React)
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

# 4. INIZIALIZZAZIONE FASTAPI
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

# --- ROTTE API ---

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
        # Crea l'ordine principale
        nuovo_ordine = Ordine(totale=ordine_in.totale)
        db.add(nuovo_ordine)
        db.commit()
        db.refresh(nuovo_ordine)
        
        # Aggiunge gli articoli collegandoli all'ID dell'ordine
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