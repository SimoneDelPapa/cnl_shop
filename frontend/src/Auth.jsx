import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faLock, 
  faUser, 
  faArrowRight, 
  faCircleCheck,
  faChevronLeft,
  faChevronRight,
  faShirt,
  faTag,
  faEye,
  faEyeSlash,
  faPaperPlane
} from '@fortawesome/free-solid-svg-icons';
import LightboxModal from './components/LightboxModal';

export default function Auth({ onLoginSuccess, externalError, onClearExternalError, onSettoreChange }) {
  const [isRegistrazione, setIsRegistrazione] = useState(false);
  const [mostraPassword, setMostraPassword] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  const [settoreCarosello, setSettoreCarosello] = useState(() => {
    return sessionStorage.getItem("cnl_settore_richiesto") || "pallanuoto";
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [loading, setLoading] = useState(false);
  const [messaggioInfo, setMessaggioInfo] = useState('');
  const [erroreLocale, setErroreLocale] = useState('');
  const [mostraTastoReinviaVerifica, setMostraTastoReinviaVerifica] = useState(false);

  const [prodottiCarosello, setProdottiCarosello] = useState([]);
  const [slideCorrente, setSlideCorrente] = useState(0);

  // SCROLL-LOCK TOTALE DI SOTTOFONDO PER IL MODALE ZOOM NELLA PAGINA DI LOGIN
  useEffect(() => {
    if (!zoomImage) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    const preventTouch = (e) => {
      if (e.target.closest('.overflow-y-auto')) return;
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventTouch);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [zoomImage]);

  useEffect(() => {
    const q = query(
      collection(db, "prodotti"),
      where("disciplina", "in", [settoreCarosello, "entrambi"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.attivo !== false);
      setProdottiCarosello(prods);
    }, (err) => console.error("Errore carosello:", err));

    return () => unsubscribe();
  }, [settoreCarosello]);

  useEffect(() => {
    if (prodottiCarosello.length <= 1) return;
    const timer = setInterval(() => {
      setSlideCorrente(prev => (prev + 1) % prodottiCarosello.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [prodottiCarosello.length]);

  const cambiaSettore = (nuovoSettore) => {
    if (nuovoSettore === settoreCarosello) return;
    setSettoreCarosello(nuovoSettore);
    setSlideCorrente(0);
    sessionStorage.setItem("cnl_settore_richiesto", nuovoSettore);
    if (onSettoreChange) onSettoreChange(nuovoSettore);
    if (onClearExternalError) onClearExternalError();
    setErroreLocale('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErroreLocale('');
    setMessaggioInfo('');
    setMostraTastoReinviaVerifica(false);
    if (onClearExternalError) onClearExternalError();

    // Validazione lunghezza password (8-16 caratteri)
    if (password.length < 8 || password.length > 16) {
      setErroreLocale("La password deve contenere tra gli 8 e i 16 caratteri.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistrazione) {
        if (!nome.trim() || !cognome.trim()) {
          setErroreLocale("Inserisci sia il nome che il cognome per intestare l'account.");
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const userDocRef = doc(db, "utenti", cred.user.uid);

        const datiUtente = {
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim().toLowerCase(),
          auth_uid: cred.user.uid,
          isAdmin: "no",
          atleti: [],
          carrello_pallanuoto: [],
          carrello_nuoto: [],
          creato_il: serverTimestamp()
        };

        await setDoc(userDocRef, datiUtente);

        // Invia mail di verifica e disconnetti istantaneamente
        await sendEmailVerification(cred.user);
        await signOut(auth);

        setIsRegistrazione(false);
        setPassword('');
        setMessaggioInfo(`Abbiamo inviato un'email di conferma a ${email.trim()}. Controlla la posta in arrivo o la cartella Spam per confermare l'account.`);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

        // Controllo se l'email è stata verificata
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setErroreLocale("Email non ancora verificata. Controlla la posta in arrivo o la cartella Spam per confermare l'account.");
          setMostraTastoReinviaVerifica(true);
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, "utenti", cred.user.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const dati = snap.data();
          if (!dati.isAdmin) {
            dati.isAdmin = dati.is_admin ? (dati.settore || "pallanuoto") : "no";
          }
          sessionStorage.setItem("cnl_settore_richiesto", settoreCarosello);
          onLoginSuccess({ id: cred.user.uid, ...dati });
        } else {
          setErroreLocale("Account non trovato. Registrati per continuare.");
        }
      }
    } catch (err) {
      console.error("Errore autenticazione:", err);

      switch (err.code) {
        case 'auth/user-not-found':
          setErroreLocale("Nessun account trovato con questa email. Registrati per iniziare.");
          break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          setErroreLocale(
            isRegistrazione 
              ? "Dati di registrazione non validi." 
              : "Email o password non corrette, oppure l'account non esiste."
          );
          break;
        case 'auth/email-already-in-use':
          setErroreLocale("Questa email risulta già registrata. Effettua l'accesso.");
          break;
        case 'auth/invalid-email':
          setErroreLocale("Il formato dell'indirizzo email non è valido.");
          break;
        case 'auth/weak-password':
          setErroreLocale("La password scelta è troppo debole. Inserisci tra 8 e 16 caratteri.");
          break;
        case 'auth/too-many-requests':
          setErroreLocale("Troppi tentativi consecutivi falliti. Riprova tra qualche minuto per sicurezza.");
          break;
        case 'auth/network-request-failed':
          setErroreLocale("Problema di connessione a internet. Controlla la rete e riprova.");
          break;
        case 'auth/user-disabled':
          setErroreLocale("Questo account è stato disabilitato. Contatta l'amministrazione.");
          break;
        default:
          setErroreLocale("Si è verificato un errore durante l'operazione. Riprova più tardi.");
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const reinviaEmailVerifica = async () => {
    if (!email.trim() || !password) {
      setErroreLocale("Inserisci email e password per poter reinviare l'email di verifica.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      setMessaggioInfo(`Email di verifica inviata nuovamente a ${email.trim()}.`);
      setErroreLocale('');
      setMostraTastoReinviaVerifica(false);
    } catch (err) {
      setErroreLocale("Impossibile reinviare l'email: " + (err.message || "riprova più tardi."));
    } finally {
      setLoading(false);
    }
  };

  const recuperaPassword = async () => {
    const emailPulita = email.trim().toLowerCase();
    if (!emailPulita) {
      setErroreLocale("Inserisci l'email per reimpostare la password.");
      setMessaggioInfo('');
      return;
    }

    setLoading(true);
    setErroreLocale('');
    setMessaggioInfo('');

    try {
      await sendPasswordResetEmail(auth, emailPulita);
      setMessaggioInfo("Email di ripristino inviata. Controlla anche nella cartella Spam.");
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setErroreLocale("Nessun account collegato a questa email.");
      } else if (err.code === 'auth/invalid-email') {
        setErroreLocale("Formato email non valido.");
      } else {
        setErroreLocale("Errore: " + (err.message || "impossibile inviare l'email."));
      }
    } finally {
      setLoading(false);
    }
  };

  const erroreDaMostrare = externalError || erroreLocale;
  const indiceSicuro = prodottiCarosello.length > 0 ? slideCorrente % prodottiCarosello.length : 0;
  const prodottoAttivo = prodottiCarosello[indiceSicuro] || null;

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[100dvh] lg:h-[100dvh] bg-white flex flex-col lg:grid lg:grid-cols-12 pt-[env(safe-area-inset-top,0.5rem)] lg:pt-0">
      
      {/* ZOOM LIGHTBOX */}
      {zoomImage && (
        <LightboxModal 
          src={zoomImage.src} 
          alt={zoomImage.alt} 
          onClose={() => setZoomImage(null)} 
        />
      )}

      {/* 1. SEZIONE FORM AUTENTICAZIONE */}
      <div className="w-full max-w-full lg:col-span-5 xl:col-span-4 flex flex-col justify-start lg:justify-between px-5 py-5 sm:px-10 sm:py-8 lg:p-8 xl:p-12 bg-white z-10 lg:overflow-y-auto box-border">
        
        {/* BRAND CNL SHOP */}
        <div className="flex items-center gap-3.5 sm:gap-4 shrink-0 pt-1 pb-3 mb-2 sm:mb-3">
          <img 
            src="/cnl_shop.png" 
            alt="CNL Shop" 
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-md select-none pointer-events-none rounded-2xl"
          />
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              CNL Shop
            </span>
            <span className="text-[11px] sm:text-xs font-extrabold text-[#002b80] uppercase tracking-widest mt-1 block">
              Circolo Nuoto Lucca
            </span>
          </div>
        </div>

        {/* Form centrale */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto my-3 lg:my-auto space-y-3.5 box-border">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {isRegistrazione ? "Crea il tuo profilo" : "Accedi al Portale"}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 leading-relaxed">
              {isRegistrazione 
                ? "Un solo account per gestire le forniture di Nuoto e Pallanuoto con ritiro a bordo vasca."
                : "Inserisci le tue credenziali per visualizzare il catalogo ed effettuare gli ordini."}
            </p>
          </div>

          {erroreDaMostrare && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 animate-in fade-in duration-150 space-y-2">
              <p>{erroreDaMostrare}</p>
              {mostraTastoReinviaVerifica && (
                <button
                  type="button"
                  onClick={reinviaEmailVerifica}
                  disabled={loading}
                  className="w-full h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faPaperPlane} className="text-[10px]" />
                  <span>Rinvia email di verifica</span>
                </button>
              )}
            </div>
          )}
          {messaggioInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-in fade-in duration-150 flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 shrink-0" />
              <span>{messaggioInfo}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3 w-full box-border">
            {isRegistrazione && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="w-full">
                  <label htmlFor="auth-nome" className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Nome</label>
                  <div className="relative w-full">
                    <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      id="auth-nome"
                      name="given-name"
                      type="text"
                      autoComplete="given-name"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Nome"
                      required
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80] box-border"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label htmlFor="auth-cognome" className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Cognome</label>
                  <div className="relative w-full">
                    <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      id="auth-cognome"
                      name="family-name"
                      type="text"
                      autoComplete="family-name"
                      value={cognome}
                      onChange={e => setCognome(e.target.value)}
                      placeholder="Cognome"
                      required
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80] box-border"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="w-full">
              <label htmlFor="auth-email" className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Email</label>
              <div className="relative w-full">
                <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="latuaemail@esempio.it"
                  required
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80] box-border"
                />
              </div>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="auth-password" className="text-[10px] font-black uppercase tracking-wider text-slate-600">Password</label>
                  <span className="text-[10px] font-bold text-slate-400">(8-16 car.)</span>
                </div>
                {!isRegistrazione && (
                  <button
                    type="button"
                    onClick={recuperaPassword}
                    className="text-[11px] font-black text-[#002b80] hover:underline cursor-pointer"
                  >
                    Password dimenticata?
                  </button>
                )}
              </div>
              <div className="relative w-full">
                <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input
                  id="auth-password"
                  name="password"
                  type={mostraPassword ? "text" : "password"}
                  autoComplete={isRegistrazione ? "new-password" : "current-password"}
                  value={password}
                  minLength={8}
                  maxLength={16}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="password"
                  required
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-10 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80] box-border"
                />
                <button
                  type="button"
                  onClick={() => setMostraPassword(!mostraPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title={mostraPassword ? "Nascondi password" : "Mostra password"}
                  aria-label={mostraPassword ? "Nascondi password" : "Mostra password"}
                >
                  <FontAwesomeIcon icon={mostraPassword ? faEyeSlash : faEye} className="text-sm" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <span>{loading ? "Elaborazione..." : (isRegistrazione ? "Registrati e Conferma Mail" : "Accedi")}</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </button>
          </form>

          <div className="pt-1.5 text-center">
            <p className="text-xs text-slate-600 font-semibold">
              {isRegistrazione ? "Hai già un profilo?" : "Non hai ancora un account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegistrazione(!isRegistrazione);
                  setErroreLocale('');
                  setMessaggioInfo('');
                  setMostraTastoReinviaVerifica(false);
                }}
                className="font-black text-[#002b80] hover:underline cursor-pointer ml-1"
              >
                {isRegistrazione ? "Accedi" : "Registrati qui"}
              </button>
            </p>
          </div>
        </div>

      </div>

      {/* 2. SEZIONE VETRINA */}
      <div className="w-full max-w-full lg:col-span-7 xl:col-span-8 bg-gradient-to-br from-[#00194a] via-[#002b80] to-[#0040b3] px-5 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8 flex flex-col justify-between text-white relative lg:overflow-hidden box-border">
        
        {/* Selettore disciplina carosello */}
        <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
              Catalogo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/20 backdrop-blur-md rounded-2xl border border-white/15 w-full box-border">
            <button
              type="button"
              onClick={() => cambiaSettore('pallanuoto')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer truncate ${
                settoreCarosello === 'pallanuoto'
                  ? 'bg-white text-[#002b80] shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Pallanuoto
            </button>
            <button
              type="button"
              onClick={() => cambiaSettore('nuoto')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer truncate ${
                settoreCarosello === 'nuoto'
                  ? 'bg-white text-[#002b80] shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Nuoto
            </button>
          </div>
        </div>

        {/* Card Prodotto Vetrina */}
        <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto my-3 sm:my-4 lg:my-auto flex-1 flex flex-col justify-center min-h-0">
          {prodottoAttivo ? (
            <div 
              key={prodottoAttivo.id}
              className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-4 sm:p-5 lg:p-6 shadow-2xl space-y-3 w-full box-border transition-all"
            >
              <div 
                onClick={() => prodottoAttivo.immagine_url && setZoomImage({ src: prodottoAttivo.immagine_url, alt: prodottoAttivo.nome })}
                className="w-full h-44 sm:h-52 lg:h-56 xl:h-64 bg-white rounded-2xl p-3 sm:p-4 flex items-center justify-center overflow-hidden cursor-zoom-in group shadow-inner"
                title="Clicca per ingrandire la foto"
              >
                {prodottoAttivo.immagine_url ? (
                  <img 
                    src={prodottoAttivo.immagine_url} 
                    alt={prodottoAttivo.nome}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center justify-center gap-1">
                    <FontAwesomeIcon icon={faShirt} className="text-4xl" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Nessuna Foto</span>
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between gap-3 pt-0.5">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-200 flex items-center gap-1 mb-0.5">
                    <FontAwesomeIcon icon={faTag} className="text-[8px]" />
                    <span>{settoreCarosello}</span>
                  </span>
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-white leading-tight truncate">
                    {prodottoAttivo.nome}
                  </h3>
                  <span className="text-[11px] sm:text-xs text-blue-100 font-semibold block mt-0.5">
                    {prodottoAttivo.taglia_unica ? "Taglia Unica" : "Varie taglie disponibili"}
                  </span>
                </div>

                <div className="bg-white text-[#002b80] px-3 py-1.5 rounded-xl shadow-md text-right shrink-0">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Prezzo</span>
                  <span className="text-base sm:text-lg font-black tabular-nums leading-none">
                    €{Number(prodottoAttivo.prezzo || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-white/5 border border-white/10 rounded-3xl p-6">
              <FontAwesomeIcon icon={faShirt} className="text-3xl text-white/30 mb-2" />
              <p className="text-sm font-bold text-white/80">Caricamento articoli...</p>
            </div>
          )}
        </div>

        {/* Indicatori e Controlli Carosello */}
        <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-center justify-between pt-2 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-1.5">
            {prodottiCarosello.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlideCorrente(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  indiceSicuro === i ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSlideCorrente(prev => (prev === 0 ? prodottiCarosello.length - 1 : prev - 1))}
              disabled={prodottiCarosello.length <= 1}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              type="button"
              onClick={() => setSlideCorrente(prev => (prev + 1) % prodottiCarosello.length)}
              disabled={prodottiCarosello.length <= 1}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}