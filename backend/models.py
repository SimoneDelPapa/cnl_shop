from sqlalchemy import Column, Integer, String, Boolean
from database import Base # Assumendo che il tuo Base sia definito qui

class Utente(Base):
    __tablename__ = "utenti"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_attivo = Column(Boolean, default=True)