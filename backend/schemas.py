from typing import List, Optional
from pydantic import BaseModel, EmailStr

# --- AUTH & UTENTI ---
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

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    nuova_password: str

# --- PRODOTTI ---
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

# --- ORDINI ---
class ArticoloCarrello(BaseModel):
    prodottoId: int
    nomeProdotto: str
    prezzo: float
    atleta: str
    taglia: str
    personalizzabile_nome: Optional[bool] = False
    personalizzabile_numero: Optional[bool] = False
    personalizzabile_colore: Optional[bool] = False
    nomePersonalizzato: Optional[str] = None
    colorePersonalizzato: Optional[str] = None
    numeroPersonalizzato: Optional[str] = None

class OrdineCreate(BaseModel):
    totale: float
    carrello: List[ArticoloCarrello]

class ModificaArticoloItem(BaseModel):
    id: Optional[int] = None
    atleta: str
    taglia: str
    nomePersonalizzato: Optional[str] = None
    colorePersonalizzato: Optional[str] = None
    numeroPersonalizzato: Optional[str] = None

class ModificaOrdineRequest(BaseModel):
    articoli: List[ModificaArticoloItem]

class UpdateStatoOrdine(BaseModel):
    stato_pagamento: Optional[str] = None
    pagato: Optional[bool] = None