# 🏊‍♂️ CNL Shop — Circolo Nuoto Lucca

Piattaforma web e Progressive Web App (PWA) ufficiale per la gestione, l'ordinazione e la tracciatura delle forniture tecniche e sociali di **Pallanuoto** e **Nuoto** per atleti, famiglie e staff dell'**ASD Circolo Nuoto Lucca**.

---

## 🌟 Funzionalità Principali

### 👥 Per Atleti e Famiglie (Area Utente)
- **Multi-Profilo Famiglia**: Gestione di più atleti sotto un unico account genitore/tutore con associazione per disciplina e categoria.
- **Supporto Multi-Settore**: Selettore rapido tra **Pallanuoto** e **Nuoto** con carrelli, cataloghi e stati separati.
- **Catalogo Forniture & Personalizzazioni**: Scelta taglie, personalizzazione con nome, numero e colore calotta (ove applicabile).
- **Checkout Integrato PayPal**: Generazione automatica dell'ordine e reindirizzamento al pagamento PayPal dedicato per settore con importo esatto precompilato.
- **Tracciamento Ordini & Notifiche In-App**: Monitoraggio dello stato di pagamento e preparazione dei singoli capi, con avvisi di sollecito e saldo in tempo reale.

### 🛠️ Per lo Staff (Pannello Amministratore)
- **Registro Ordini & Filtri**: Monitoraggio in tempo reale raggruppato per acquirente o vista tabellare per stato (*In attesa*, *In lavorazione*, *Pronto per il ritiro*, *Completato*).
- **Inoltro Produzione Automatizzato**: Aggiornamento massivo dello stato e generazione istantanea del foglio di calcolo XLSX pronto per il fornitore.
- **Esportazione Excel Avanzata (`xlsx-js-style`)**:
  - Matrice riepilogativa quantità per capo e taglia.
  - Tabella dettagliata per le personalizzazioni (nomi, numeri e colori calotta).
- **Gestione Solleciti di Pagamento**:
  - Invio sollecito individuale con generazione automatica di email precompilata (mailto) e notifica in-app con importo residuo.
  - Notifica broadcast massiva per tutti gli utenti con saldi pendenti.
- **Gestione Catalogo**: Creazione, modifica, mascheramento ed eliminazione articoli con upload immagini ottimizzato su Cloudinary.

### 📱 Ottimizzazione Mobile & PWA
- **Esperienza Standalone**: Supporto PWA installabile su iOS, iPadOS e Android.
- **Zero White Borders su iOS**: Icona universale Retina 512×512 px calibrata per le maschere squircle Apple e Android maskable.
- **Layout Safe Area Compliant**: Navbar sticky con compensazione dinamica per notch e Dynamic Island (`env(safe-area-inset-top)`).

---

## 🛠️ Stack Tecnologico

- **Frontend Framework**: [React.js](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icone**: [FontAwesome](https://fontawesome.com/) (`@fortawesome/react-fontawesome`)
- **Backend & Database**: [Google Firebase](https://firebase.google.com/)
  - **Firebase Authentication**: Gestione account utenti e ruoli.
  - **Cloud Firestore**: Database documentale NoSQL in tempo reale.
  - **Firebase Hosting**: Distribuzione e hosting dell'applicazione.
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (upload immagini catalogo prodotti)
- **Elaborazione Documenti**: [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) (fogli di calcolo formattati per i fornitori)

---

## 📂 Struttura del Progetto

```text
cnl_shop/
├── .firebase/                 # Cache e configurazioni locali Firebase (escluse da Git)
├── firebase.json              # Configurazione Hosting e regole Firebase
├── frontend/
│   ├── public/
│   │   ├── cnl_shop.png       # Icona universale PWA, iOS e Android (512x512)
│   │   └── manifest.json      # Configurazione Web App Manifest PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── BannerNotifiche.jsx       # Alert e avvisi pagamento in-app
│   │   │   ├── CustomModal.jsx           # Modali di conferma personalizzati
│   │   │   ├── GestioneAtleti.jsx        # Configurazione atleti e categorie
│   │   │   ├── LightboxModal.jsx         # Zoom anteprima immagini prodotti
│   │   │   ├── ModalCarrello.jsx         # Gestione e riepilogo carrello
│   │   │   ├── ModalGuidaPrimoAccesso.jsx# Onboarding iniziale utente
│   │   │   ├── ModalModificaOrdine.jsx   # Modifica ordine pendente
│   │   │   ├── ModalProfilo.jsx          # Gestione profilo utente e logout
│   │   │   ├── Navbar.jsx                # Header sticky con selettore disciplina
│   │   │   ├── NegozioUtente.jsx         # Viste catalogo, atleti e storico ordini
│   │   │   ├── PannelloAdmin.jsx         # Dashboard completa per lo staff
│   │   │   ├── ProdottoCard.jsx          # Scheda singolo capo ordinabile
│   │   │   └── ToastNotification.jsx     # Feedback visivi temporizzati
│   │   ├── App.jsx                       # Core state, business logic e Firestore listeners
│   │   ├── Auth.jsx                      # Login, registrazione e recupero password
│   │   ├── firebase.js                   # Inizializzazione SDK Firebase
│   │   ├── index.css                     # Stili globali e direttive Tailwind
│   │   └── main.jsx                      # Entry point React
│   ├── index.html                        # Meta tag viewport, apple-touch-icon e title
│   ├── package.json
│   └── vite.config.js
└── README.md
