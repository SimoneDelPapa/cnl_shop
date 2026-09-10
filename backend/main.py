import csv
from datetime import datetime, timedelta
import io
import os
from typing import List, Optional

import bcrypt
import cloudinary
import cloudinary.uploader
from database import Base, engine, get_db
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
import httpx
import jwt
from models import ArticoloOrdine, Ordine, Prodotto, Utente
from schemas import (
    ForgotPasswordRequest,
    ModificaOrdineRequest,
    OrdineCreate,
    ProdottoResponse,
    ResetPasswordRequest,
    UpdateStatoOrdine,
    UtenteCreate,
    UtenteLogin,
    UtenteResponse,
)
from sqlalchemy.orm import Session, joinedload

load_dotenv()

# Inizializza le tabelle del DB
Base.metadata.create_all(bind=engine)

# Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

SECRET_KEY = os.getenv("SECRET_KEY", "chiave_segreta_super_sicura_locale")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Utility Password & JWT
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Inizializzazione App
app = FastAPI(title="CNL Shop API (Local Test)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://cnl-shop.web.app",
        "https://cnl-shop.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- AUTH ROUTES ---
@app.post("/api/register", response_model=UtenteResponse, status_code=status.HTTP_201_CREATED)
def registra_utente(utente: UtenteCreate, db: Session = Depends(get_db)):
    if db.query(Utente).filter(Utente.email == utente.email).first():
        raise HTTPException(status_code=400, detail="Email già registrata")
    nuovo = Utente(
        email=utente.email,
        nome=utente.nome,
        cognome=utente.cognome,
        hashed_password=get_password_hash(utente.password)
    )
    db.add(nuovo)
    db.commit()
    db.refresh(nuovo)
    return nuovo

@app.post("/api/login")
def login_utente(credenziali: UtenteLogin, db: Session = Depends(get_db)):
    utente = db.query(Utente).filter(Utente.email == credenziali.email).first()
    if not utente or not verify_password(credenziali.password, utente.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o password errati")
    return {
        "access_token": create_access_token(data={"sub": str(utente.id)}),
        "token_type": "bearer",
        "utente": {
            "id": utente.id, "email": utente.email, "nome": utente.nome,
            "cognome": utente.cognome, "is_admin": utente.is_admin
        }
    }

@app.get("/api/users/me", response_model=UtenteResponse)
def ottieni_utente_corrente(current_user: Utente = Depends(get_current_user)):
    return current_user

# --- PRODOTTI ---
@app.get("/api/products", response_model=List[ProdottoResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(Prodotto).order_by(Prodotto.id.asc()).all()

# --- ORDINI ---
@app.post("/api/orders")
def crea_ordine(ordine_in: OrdineCreate, db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="Gli amministratori non possono creare ordini.")
    nuovo_ordine = Ordine(totale=ordine_in.totale, stato_pagamento="In attesa", pagato=False, utente_id=current_user.id)
    db.add(nuovo_ordine)
    db.commit()
    db.refresh(nuovo_ordine)

    for item in ordine_in.carrello:
        db.add(ArticoloOrdine(
            ordine_id=nuovo_ordine.id,
            prodotto_id=item.prodottoId,
            nome_prodotto=item.nomeProdotto,
            prezzo=item.prezzo,
            atleta=item.atleta,
            taglia=item.taglia,
            personalizzabile_nome=item.personalizzabile_nome or False,
            personalizzabile_numero=item.personalizzabile_numero or False,
            personalizzabile_colore=item.personalizzabile_colore or False,
            nome_personalizzato=item.nomePersonalizzato,
            colore_personalizzato=item.colorePersonalizzato,
            numero_personalizzato=item.numeroPersonalizzato
        ))
    db.commit()
    return {"messaggio": "Ordine salvato", "ordine_id": nuovo_ordine.id}

@app.get("/api/orders/my-orders")
def ottieni_ordini_utente(db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    ordini = db.query(Ordine).filter(Ordine.utente_id == current_user.id).options(joinedload(Ordine.articoli)).order_by(Ordine.id.desc()).all()
    return [
        {
            "id": o.id, "totale": o.totale, "stato_pagamento": o.stato_pagamento, "pagato": o.pagato,
            "articoli": [{
                "id": a.id, "prodotto_id": a.prodotto_id, "nome_prodotto": a.nome_prodotto,
                "prezzo": a.prezzo, "atleta": a.atleta, "taglia": a.taglia,
                "personalizzabile_nome": a.personalizzabile_nome,
                "personalizzabile_numero": a.personalizzabile_numero,
                "personalizzabile_colore": a.personalizzabile_colore,
                "nome_personalizzato": a.nome_personalizzato,
                "colore_personalizzato": a.colore_personalizzato,
                "numero_personalizzato": a.numero_personalizzato
            } for a in o.articoli]
        } for o in ordini
    ]

@app.patch("/api/orders/{ordine_id}")
def modifica_campi_ordine(ordine_id: int, payload: ModificaOrdineRequest, db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    if not current_user.is_admin and ordine.utente_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if ordine.pagato or ordine.stato_pagamento != "In attesa":
        raise HTTPException(status_code=400, detail="Modifica non consentita: ordine saldato o già in lavorazione")

    for art_input in payload.articoli:
        if art_input.id:
            art_db = db.query(ArticoloOrdine).filter(ArticoloOrdine.id == art_input.id, ArticoloOrdine.ordine_id == ordine_id).first()
            if art_db:
                art_db.atleta = art_input.atleta
                art_db.taglia = art_input.taglia
                art_db.nome_personalizzato = art_input.nomePersonalizzato
                art_db.colore_personalizzato = art_input.colorePersonalizzato
                art_db.numero_personalizzato = art_input.numeroPersonalizzato
    db.commit()
    return {"messaggio": "Ordine aggiornato con successo"}

@app.delete("/api/orders/{ordine_id}/items/{item_id}")
def elimina_articolo_ordine(ordine_id: int, item_id: int, db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    if not current_user.is_admin and ordine.utente_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if ordine.pagato or ordine.stato_pagamento != "In attesa":
        raise HTTPException(status_code=400, detail="Operazione non consentita: ordine saldato o già in lavorazione")

    art = db.query(ArticoloOrdine).filter(ArticoloOrdine.id == item_id, ArticoloOrdine.ordine_id == ordine_id).first()
    if not art:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    db.delete(art)
    db.commit()

    rimasti = db.query(ArticoloOrdine).filter(ArticoloOrdine.ordine_id == ordine_id).all()
    if not rimasti:
        db.delete(ordine)
        db.commit()
        return {"messaggio": "Ordine annullato completamente"}

    ordine.totale = sum(a.prezzo for a in rimasti)
    db.commit()
    return {"messaggio": "Articolo rimosso", "nuovo_totale": ordine.totale}

@app.delete("/api/orders/{ordine_id}")
def annulla_ordine(ordine_id: int, db: Session = Depends(get_db), current_user: Utente = Depends(get_current_user)):
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    if not current_user.is_admin and ordine.utente_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if ordine.pagato or ordine.stato_pagamento != "In attesa":
        raise HTTPException(status_code=400, detail="Operazione non consentita: ordine saldato o già in lavorazione")

    db.delete(ordine)
    db.commit()
    return {"messaggio": "Ordine annullato con successo"}

# --- ROTTE ADMIN ---
@app.get("/api/admin/orders")
def admin_ottieni_tutti_gli_ordini(db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    ordini = db.query(Ordine).options(joinedload(Ordine.articoli), joinedload(Ordine.utente)).order_by(Ordine.id.desc()).all()
    return [
        {
            "id": o.id, "totale": o.totale, "stato_pagamento": o.stato_pagamento, "pagato": o.pagato,
            "acquirente": f"{o.utente.nome} {o.utente.cognome}".strip() if o.utente else "Sconosciuto",
            "email_acquirente": o.utente.email if o.utente else "Sconosciuta",
            "articoli": [{
                "id": a.id, "nome_prodotto": a.nome_prodotto, "prezzo": a.prezzo,
                "atleta": a.atleta, "taglia": a.taglia,
                "personalizzabile_nome": a.personalizzabile_nome,
                "personalizzabile_numero": a.personalizzabile_numero,
                "personalizzabile_colore": a.personalizzabile_colore,
                "nome_personalizzato": a.nome_personalizzato,
                "colore_personalizzato": a.colore_personalizzato,
                "numero_personalizzato": a.numero_personalizzato
            } for a in o.articoli]
        } for o in ordini
    ]

@app.post("/api/admin/orders/send-to-production")
def admin_invia_alla_produzione(db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    in_attesa = db.query(Ordine).filter(Ordine.stato_pagamento == "In attesa").all()
    for ord in in_attesa:
        ord.stato_pagamento = "In lavorazione"
    db.commit()
    return {"messaggio": "Ordini inviati alla produzione", "aggiornati": len(in_attesa)}

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
        writer.writerow([
            ordine.id, acquirente, art.nome_prodotto, art.taglia, art.atleta,
            art.nome_personalizzato or "", art.colore_personalizzato or "", art.numero_personalizzato or "",
            f"{art.prezzo:.2f}", ordine.stato_pagamento, "Sì" if ordine.pagato else "No"
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
        res = cloudinary.uploader.upload(file.file, folder="cnl_shop")
        saved_file_url = res.get("secure_url")
    nuovo = Prodotto(
        nome=nome, prezzo=prezzo,
        personalizzabile_nome=personalizzabile_nome,
        personalizzabile_numero=personalizzabile_numero,
        personalizzabile_colore=personalizzabile_colore,
        immagine_url=saved_file_url
    )
    db.add(nuovo)
    db.commit()
    db.refresh(nuovo)
    return nuovo

@app.delete("/api/admin/products/{prodotto_id}")
def admin_elimina_prodotto(prodotto_id: int, db: Session = Depends(get_db), admin_user: Utente = Depends(get_current_admin)):
    p = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    db.delete(p)
    db.commit()
    return {"messaggio": "Prodotto eliminato con successo"}