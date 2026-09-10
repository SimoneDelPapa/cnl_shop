from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base

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
    stato_pagamento = Column(String, default="In attesa")
    pagato = Column(Boolean, default=False)
    utente_id = Column(Integer, ForeignKey("utenti.id"), nullable=True)

    articoli = relationship("ArticoloOrdine", back_populates="ordine", cascade="all, delete-orphan")
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
    personalizzabile_nome = Column(Boolean, default=False)
    personalizzabile_numero = Column(Boolean, default=False)
    personalizzabile_colore = Column(Boolean, default=False)
    nome_personalizzato = Column(String, nullable=True)
    colore_personalizzato = Column(String, nullable=True)
    numero_personalizzato = Column(String, nullable=True)

    ordine = relationship("Ordine", back_populates="articoli")