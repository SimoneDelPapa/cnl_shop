import os
import io
import csv
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

from pydantic import BaseModel, EmailStr
from typing import List, Optional
import jwt
import bcrypt
import httpx

import cloudinary
import cloudinary.uploader

from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session, joinedload

load_dotenv()

# --- CONFIGURAZIONE CLOUDINARY ---
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

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

# --- CONFIGURAZIONE PASSWORD HASHING ---
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

# --- MODELLI DATABASE ---
class Utente(Base):
    __tablename__ = "utenti"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False, default="")
    hashed_password = Column(String, nullable=False)
    is_attivo = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False) 

class Prodotto(Base):
    __tablename__ = "prodotti"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    prezzo = Column(Float, nullable=False)
    personalizzabile_nome = Column(Boolean, default=False)
    personalizzabile_numero = Column(Boolean, default=False)
    personalizzabile_colore = Column(Boolean, default=False)
    immagine_url = Column(String, nullable=True) 

class Ordine(Base):
    __tablename__ = "ordini"
    id = Column(Integer, primary_key=True, index=True)
    totale = Column(Float, nullable=False)
    stato_pagamento = Column(String, default="In lavorazione")
    pagato = Column(Boolean, default=False)
    utente_id = Column(Integer, ForeignKey("utenti.id"), nullable=True) 
    
    articoli = relationship("ArticoloOrdine", back_populates="ordine")
    utente = relationship("Utente") 

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
    colore_personalizzato = Column(String, nullable=True)
    numero_personalizzato = Column(String, nullable=True)

    ordine = relationship("Ordine", back_populates="articoli")

Base.metadata.create_all(bind=engine)

# --- SCHEMI PYDANTIC ---
class UtenteCreate(BaseModel):
    nome: str
    cognome: str
    email: EmailStr
    password: str

class UtenteLogin(BaseModel):
    email: EmailStr
    password: str

class UtenteResponse(BaseModel):
    id: int
    email: EmailStr
    nome: str
    cognome: str
    is_attivo: bool
    is_admin: bool 
    class Config:
        from_attributes = True

class ProdottoResponse(BaseModel):
    id: int
    nome: str
    prezzo: float
    personalizzabile_nome: bool
    personalizzabile_numero: bool
    personalizzabile_colore: bool
    immagine_url: Optional[str] = None
    class Config:
        from_attributes = True

class ArticoloCarrello(BaseModel):
    prodottoId: int
    nomeProdotto: str
    prezzo: float
    atleta: str
    taglia: str
    nomePersonalizzato: Optional[str] = None
    colorePersonalizzato: Optional[str] = None
    numeroPersonalizzato: Optional[str] = None

class OrdineCreate(BaseModel):
    totale: float
    carrello: List[ArticoloCarrello]

class UpdateStatoOrdine(BaseModel):
    stato_pagamento: Optional[str] = None
    pagato: Optional[bool] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    nuova_password: str

# --- INIZIALIZZAZIONE FASTAPI ---
app = FastAPI(title="CNL Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://simonedelpapa.github.io",
        "http://localhost:5173",
        "http://localhost:3000"
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

# --- DIPENDENZE AUTENTICAZIONE ---
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

def get_current_admin(current_user: Utente = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso negato. Solo Staff.")
    return current_user

# --- LOGICA INVIO EMAIL CON AVVISO SPAM ---
def invia_email_reset(nome: str, destinatario: str, link_reset: str):
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        print("❌ ERRORE: La variabile BREVO_API_KEY non è impostata su Render!")
        return

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }
    payload = {
        "sender": {"name": "CNL Shop", "email": "cnl.pallanuotolucca@gmail.com"},
        "to": [{"email": destinatario, "name": nome}],
        "subject": "Reset Password - CNL Shop",
        "htmlContent": f"""
            <p>Ciao <strong>{nome}</strong>,</p>
            <p>Hai richiesto il reset della password per il tuo account CNL Shop.</p>
            <p>Clicca sul pulsante qui sotto per impostare la nuova password (scade tra 15 minuti):</p>
            <p><a href="{link_reset}" style="background-color: #0891b2; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reimposta Password</a></p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Se non vedi le nostre future comunicazioni, controlla sempre la cartella <strong>Spam / Posta Indesiderata</strong>.</p>
        """
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
        if response.status_code in [200, 201, 202]:
            print(f"✅ EMAIL INVIATA A {destinatario}")
        else:
            print(f"❌ ERRORE BREVO ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"❌ ERRORE INVIO MAIL: {e}")

# --- ROTTE API UTENTI E RECUPERO PASSWORD ---

@app.post("/api/register", response_model=UtenteResponse, status_code=status.HTTP_201_CREATED)
def registra_utente(utente: UtenteCreate, db: Session = Depends(get_db)):
    db_user = db.query(Utente).filter(Utente.email == utente.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    hashed_pwd = get_password_hash(utente.password)
    nuovo_utente = Utente(email=utente.email, nome=utente.nome, cognome=utente.cognome, hashed_password=hashed_pwd)
    
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)
    return nuovo_utente

@app.post("/api/login")
def login_utente(credenziali: UtenteLogin, db: Session = Depends(get_db)):
    utente = db.query(Utente).filter(Utente.email == credenziali.email).first()
    if not utente or not verify_password(credenziali.password, utente.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o password errati")
    
    access_token = create_access_token(data={"sub": str(utente.id)})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "utente": {
            "id": utente.id, 
            "email": utente.email, 
            "nome": utente.nome, 
            "cognome": utente.cognome,
            "is_admin": utente.is_admin
        }
    }

@app.get("/api/users/me", response_model=UtenteResponse)
def ottieni_utente_corrente(current_user: Utente = Depends(get_current_user)):
    return current_user

@app.post("/api/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    utente = db.query(Utente).filter(Utente.email == req.email).first()
    if not utente:
        return {"messaggio": "Ok"}

    expire = datetime.utcnow() + timedelta(minutes=15)
    reset_token = jwt.encode({"sub": str(utente.id), "type": "reset", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
    link_reset = f"https://simonedelpapa.github.io/cnl_shop/?reset={reset_token}"
    
    background_tasks.add_task(invia_email_reset, utente.nome, utente.email, link_reset)

    return {"messaggio": "Ok"}

@app.post("/api/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(req.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token non valido.")
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Il link è scaduto. Richiedine uno nuovo.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Il link non è valido.")

    utente = db.query(Utente).filter(Utente.id == int(user_id)).first()
    if not utente:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    utente.hashed_password = get_password_hash(req.nuova_password)
    db.commit()

    return {"messaggio": "Password modificata con successo"}

# --- ROTTE API ORDINI E PRODOTTI ---

@app.get("/api/products", response_model=List[ProdottoResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(Prodotto).order_by(Prodotto.id.asc()).all()

@app.post("/api/orders")
def crea_ordine(ordine_in: OrdineCreate, db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Gli amministratori non possono effettuare ordini.")
    
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
                nome_personalizzato=item.nomePersonalizzato,
                colore_personalizzato=item.colorePersonalizzato,
                numero_personalizzato=item.numeroPersonalizzato
            )
            db.add(nuovo_articolo)
        
        db.commit()
        return {"messaggio": "Ordine salvato", "ordine_id": nuovo_ordine.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/my-orders")
def ottieni_ordini_utente(db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    ordini = db.query(Ordine).filter(Ordine.utente_id == current_user.id).options(joinedload(Ordine.articoli)).order_by(Ordine.id.desc()).all()
    risposta = []
    for o in ordini:
        risposta.append({
            "id": o.id, 
            "totale": o.totale, 
            "stato_pagamento": o.stato_pagamento,
            "pagato": o.pagato,
            "articoli": [{
                "prodotto_id": art.prodotto_id, 
                "nome_prodotto": art.nome_prodotto, 
                "prezzo": art.prezzo, 
                "atleta": art.atleta, 
                "taglia": art.taglia, 
                "nome_personalizzato": art.nome_personalizzato,
                "colore_personalizzato": art.colore_personalizzato,
                "numero_personalizzato": art.numero_personalizzato
            } for art in o.articoli]
        })
    return risposta

# --- ROTTE ESCLUSIVE ADMIN ---

@app.get("/api/admin/orders")
def admin_ottieni_tutti_gli_ordini(db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    ordini = db.query(Ordine).options(joinedload(Ordine.articoli), joinedload(Ordine.utente)).order_by(Ordine.id.desc()).all()
    risposta = []
    for o in ordini:
        acquirente_nome_completo = f"{o.utente.nome} {o.utente.cognome}".strip() if o.utente else "Sconosciuto"
        risposta.append({
            "id": o.id, 
            "totale": o.totale, 
            "stato_pagamento": o.stato_pagamento,
            "pagato": o.pagato,
            "acquirente": acquirente_nome_completo, 
            "email_acquirente": o.utente.email if o.utente else "Sconosciuta",
            "articoli": [{
                "nome_prodotto": art.nome_prodotto, 
                "prezzo": art.prezzo, 
                "atleta": art.atleta, 
                "taglia": art.taglia, 
                "nome_personalizzato": art.nome_personalizzato,
                "colore_personalizzato": art.colore_personalizzato,
                "numero_personalizzato": art.numero_personalizzato
            } for art in o.articoli]
        })
    return risposta

@app.patch("/api/admin/orders/{ordine_id}")
def admin_aggiorna_stato_ordine(ordine_id: int, payload: UpdateStatoOrdine, db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if payload.stato_pagamento is not None:
        ordine.stato_pagamento = payload.stato_pagamento
    if payload.pagato is not None:
        ordine.pagato = payload.pagato
        
    db.commit()
    return {"messaggio": "Stato aggiornato con successo"}

@app.get("/api/admin/export-csv")
def admin_esporta_csv(db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    articoli = db.query(ArticoloOrdine).join(Ordine).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID Ordine", "Acquirente", "Prodotto", "Taglia", "Nome Atleta", "Stampa Nome", "Colore", "Numero", "Prezzo", "Stato Operativo", "Verificato PayPal"])
    
    for art in articoli:
        ordine = art.ordine
        acquirente = f"{ordine.utente.nome} {ordine.utente.cognome}".strip() if ordine.utente else "Sconosciuto"
        pagato_str = "Sì" if ordine.pagato else "No"
        writer.writerow([
            ordine.id, acquirente, art.nome_prodotto, art.taglia, art.atleta, 
            art.nome_personalizzato or "", art.colore_personalizzato or "", art.numero_personalizzato or "",
            f"{art.prezzo:.2f}", ordine.stato_pagamento, pagato_str
        ])
        
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=ordini_cnl_shop.csv"})

@app.post("/api/admin/products", response_model=ProdottoResponse)
def admin_crea_prodotto(
    nome: str = Form(...),
    prezzo: float = Form(...),
    personalizzabile_nome: bool = Form(False),
    personalizzabile_numero: bool = Form(False),
    personalizzabile_colore: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin_user: Utente = Depends(get_current_admin)
):
    saved_file_url = None
    if file:
        upload_result = cloudinary.uploader.upload(file.file, folder="cnl_shop")
        saved_file_url = upload_result.get("secure_url")

    nuovo_prodotto = Prodotto(
        nome=nome, 
        prezzo=prezzo, 
        personalizzabile_nome=personalizzabile_nome,
        personalizzabile_numero=personalizzabile_numero,
        personalizzabile_colore=personalizzabile_colore,
        immagine_url=saved_file_url
    )
    db.add(nuovo_prodotto)
    db.commit()
    db.refresh(nuovo_prodotto)
    return nuovo_prodotto

@app.delete("/api/admin/products/{prodotto_id}")
def admin_elimina_prodotto(prodotto_id: int, db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    prodotto = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")

    db.delete(prodotto)
    db.commit()
    return {"messaggio": "Prodotto eliminato con successo"}