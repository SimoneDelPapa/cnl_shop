import os
import io
import csv
import shutil
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from pydantic import BaseModel, EmailStr
from typing import List, Optional
import jwt
import bcrypt  
import resend  # <-- Nuova libreria per l'invio mail

from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session, joinedload

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

# --- CONFIGURAZIONE RESEND (EMAIL API) ---
# ⚠️ INSERISCI QUI LA TUA CHIAVE API DI RESEND (Inizia con re_...)
resend.api_key = "re_DuST1yY8_5KepKdatKCeHMcsDTJqqLmpd"

# --- MODELLI DATABASE ---
class Utente(Base):
    __tablename__ = "utenti"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_attivo = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False) 

class Prodotto(Base):
    __tablename__ = "prodotti"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    prezzo = Column(Float, nullable=False)
    personalizzabile = Column(Boolean, default=False)
    immagine_url = Column(String, nullable=True) 

class Ordine(Base):
    __tablename__ = "ordini"
    id = Column(Integer, primary_key=True, index=True)
    totale = Column(Float, nullable=False)
    stato_pagamento = Column(String, default="In attesa")
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
    is_admin: bool 
    class Config:
        from_attributes = True

class ProdottoResponse(BaseModel):
    id: int
    nome: str
    prezzo: float
    personalizzabile: bool
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

class OrdineCreate(BaseModel):
    totale: float
    carrello: List[ArticoloCarrello]

class UpdateStatoOrdine(BaseModel):
    stato_pagamento: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    nuova_password: str


# --- INIZIALIZZAZIONE FASTAPI ---
app = FastAPI(title="CNL Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://simonedelpapa.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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

# --- LOGICA INVIO EMAIL CON RESEND (BACKGROUND) ---
def invia_email_reset(nome: str, destinatario: str, link_reset: str):
    try:
        r = resend.Emails.send({
            "from": "CNL Shop <onboarding@resend.dev>", # Mittente di default di Resend per i test
            "to": [destinatario],
            "subject": "Reset Password - CNL Shop",
            "html": f"""
                <p>Ciao <strong>{nome}</strong>,</p>
                <p>Hai richiesto il reset della password per il tuo account CNL Shop.</p>
                <p>Clicca sul pulsante qui sotto per impostare la nuova password (scade tra 15 minuti):</p>
                <p><a href="{link_reset}" style="background-color: #0891b2; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reimposta Password</a></p>
                <p>Se non hai richiesto tu il reset, ignora questa email.</p>
            """
        })
        print(f"✅ EMAIL INVIATA CON SUCCESSO A {destinatario}: {r}")
    except Exception as e:
        print(f"❌ ERRORE DURANTE L'INVIO RESEND A {destinatario}: {e}")

# --- ROTTE API UTENTI E RECUPERO PASSWORD ---

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o password errati")
    
    access_token = create_access_token(data={"sub": str(utente.id)})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "utente": {"id": utente.id, "email": utente.email, "nome": utente.nome, "is_admin": utente.is_admin}
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
    
    # Invia la mail in background con Resend
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
                nome_personalizzato=item.nomePersonalizzato
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
            "id": o.id, "totale": o.totale, "stato_pagamento": o.stato_pagamento,
            "articoli": [{"prodotto_id": art.prodotto_id, "nome_prodotto": art.nome_prodotto, "prezzo": art.prezzo, "atleta": art.atleta, "taglia": art.taglia, "nome_personalizzato": art.nome_personalizzato} for art in o.articoli]
        })
    return risposta

# --- ROTTE ESCLUSIVE ADMIN ---

@app.get("/api/admin/orders")
def admin_ottieni_tutti_gli_ordini(db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    ordini = db.query(Ordine).options(joinedload(Ordine.articoli), joinedload(Ordine.utente)).order_by(Ordine.id.desc()).all()
    risposta = []
    for o in ordini:
        risposta.append({
            "id": o.id, "totale": o.totale, "stato_pagamento": o.stato_pagamento,
            "acquirente": o.utente.nome if o.utente else "Sconosciuto", "email_acquirente": o.utente.email if o.utente else "Sconosciuta",
            "articoli": [{"nome_prodotto": art.nome_prodotto, "prezzo": art.prezzo, "atleta": art.atleta, "taglia": art.taglia, "nome_personalizzato": art.nome_personalizzato} for art in o.articoli]
        })
    return risposta

@app.patch("/api/admin/orders/{ordine_id}")
def admin_aggiorna_stato_ordine(ordine_id: int, payload: UpdateStatoOrdine, db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    ordine.stato_pagamento = payload.stato_pagamento
    db.commit()
    return {"messaggio": "Stato aggiornato con successo"}

@app.get("/api/admin/export-csv")
def admin_esporta_csv(db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    articoli = db.query(ArticoloOrdine).join(Ordine).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID Ordine", "Acquirente", "Prodotto", "Taglia", "Nome Atleta", "Testo Personalizzato", "Prezzo", "Stato Pagamento"])
    
    for art in articoli:
        ordine = art.ordine
        acquirente = ordine.utente.nome if ordine.utente else "Sconosciuto"
        writer.writerow([ordine.id, acquirente, art.nome_prodotto, art.taglia, art.atleta, art.nome_personalizzato or "", f"{art.prezzo:.2f}", ordine.stato_pagamento])
        
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=ordini_cnl_shop.csv"})

@app.post("/api/admin/products", response_model=ProdottoResponse)
def admin_crea_prodotto(
    nome: str = Form(...),
    prezzo: float = Form(...),
    personalizzabile: bool = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin_user: Utente = Depends(get_current_admin)
):
    saved_file_url = None
    if file:
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        saved_file_url = f"https://cnl-shop-backend.onrender.com/uploads/{filename}"

    nuovo_prodotto = Prodotto(nome=nome, prezzo=prezzo, personalizzabile=personalizzabile, immagine_url=saved_file_url)
    db.add(nuovo_prodotto)
    db.commit()
    db.refresh(nuovo_prodotto)
    return nuovo_prodotto

@app.delete("/api/admin/products/{prodotto_id}")
def admin_elimina_prodotto(prodotto_id: int, db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    prodotto = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    
    if prodotto.immagine_url:
        filename = prodotto.immagine_url.split("/")[-1]
        local_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(local_path):
            os.remove(local_path)

    db.delete(prodotto)
    db.commit()
    return {"messaggio": "Prodotto eliminato con successo"}