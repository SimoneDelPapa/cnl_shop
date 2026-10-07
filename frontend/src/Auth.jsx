import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
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
  faEyeSlash
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

    // Blocca lo scorrimento sia su desktop che su iOS
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    // Blocca il rubber-banding nativo di iOS
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
    if (onClearExternalError) onClearExternalError();

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
        sessionStorage.setItem("cnl_settore_richiesto", settoreCarosello);
        onLoginSuccess({ id: cred.user.uid, ...datiUtente });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
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
          const legacyKey = `${cred.user.uid}_${settoreCarosello}`;
          const legSnap = await getDoc(doc(db, "utenti", legacyKey));
          if (legSnap.exists()) {
            const legData = legSnap.data();
            sessionStorage.setItem("cnl_settore_richiesto", settoreCarosello);
            onLoginSuccess({ id: cred.user.uid, ...legData });
          } else {
            setErroreLocale("Account non trovato. Registrati per continuare.");
          }
        }
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setErroreLocale("Email già registrata. Effettua l'accesso.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErroreLocale("Email o password non corrette.");
      } else if (err.code === 'auth/weak-password') {
        setErroreLocale("La password deve contenere almeno 6 caratteri.");
      } else {
        setErroreLocale(err.message || "Impossibile accedere.");
      }
    } finally {
      setLoading(false);
    }
  };

  const recuperaPassword = () => {
    if (!email.trim()) {
      setErroreLocale("Inserisci l'email per reimpostare la password.");
      return;
    }
    sendPasswordResetEmail(auth, email.trim())
      .then(() => {
        setMessaggioInfo("Email di ripristino inviata.");
        setErroreLocale('');
      })
      .catch((err) => {
        setErroreLocale("Errore: " + err.message);
      });
  };

  const erroreDaMostrare = externalError || erroreLocale;
  const indiceSicuro = prodottiCarosello.length > 0 ? slideCorrente % prodottiCarosello.length : 0;
  const prodottoAttivo = prodottiCarosello[indiceSicuro] || null;

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[100dvh] lg:h-[100dvh] bg-white flex flex-col lg:grid lg:grid-cols-12 pt-[env(safe-area-inset-top,0.5rem)] lg:pt-0">
      
      {/* ZOOM LIGHTBOX ANCHE IN LOGIN */}
      {zoomImage && (
        <LightboxModal 
          src={zoomImage.src} 
          alt={zoomImage.alt} 
          onClose={() => setZoomImage(null)} 
        />
      )}

      {/* 1. SEZIONE FORM AUTENTICAZIONE */}
      <div className="w-full max-w-full lg:col-span-7 flex flex-col justify-start lg:justify-between px-5 py-4 sm:px-10 sm:py-8 lg:p-12 xl:p-16 bg-white z-10 lg:overflow-y-auto box-border">
        
        {/* BRAND CNL SHOP INGRANDITO E IN RISALTO */}
        <div className="flex items-center gap-3.5 sm:gap-4 shrink-0 pt-2 pb-4 mb-2 sm:mb-4">
          <img 
            src="/cnl_shop.png" 
            alt="CNL Shop" 
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 drop-shadow-md select-none pointer-events-none rounded-2xl"
          />
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              CNL Shop
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-[#002b80] uppercase tracking-widest mt-1 block">
              Circolo Nuoto Lucca
            </span>
          </div>
        </div>

        {/* Form centrale */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto my-4 lg:my-auto space-y-4 box-border">
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
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 animate-in fade-in duration-150">
              {erroreDaMostrare}
            </div>
          )}
          {messaggioInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-in fade-in duration-150 flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleCheck} />
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
                <label htmlFor="auth-password" className="text-[10px] font-black uppercase tracking-wider text-slate-600">Password</label>
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
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              <span>{loading ? "Elaborazione..." : (isRegistrazione ? "Registrati" : "Accedi")}</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-xs text-slate-600 font-semibold">
              {isRegistrazione ? "Hai già un profilo?" : "Non hai ancora un account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegistrazione(!isRegistrazione);
                  setErroreLocale('');
                  setMessaggioInfo('');
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
      <div className="w-full max-w-full lg:col-span-5 bg-gradient-to-br from-[#00194a] via-[#002b80] to-[#0040b3] px-5 py-6 sm:px-8 sm:py-8 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden box-border">
        
        {/* Selettore disciplina carosello */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
              Catalogo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-black/20 backdrop-blur-md rounded-xl border border-white/15 w-full box-border">
            <button
              type="button"
              onClick={() => cambiaSettore('pallanuoto')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer truncate ${
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
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer truncate ${
                settoreCarosello === 'nuoto'
                  ? 'bg-white text-[#002b80] shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Nuoto
            </button>
          </div>
        </div>

        {/* Card Prodotto Vetrina ZOOMABILE */}
        <div className="w-full my-5 lg:my-auto flex-1 flex flex-col justify-center">
          {prodottoAttivo ? (
            <div 
              key={prodottoAttivo.id}
              className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl space-y-2.5 w-full box-border"
            >
              <div 
                onClick={() => prodottoAttivo.immagine_url && setZoomImage({ src: prodottoAttivo.immagine_url, alt: prodottoAttivo.nome })}
                className="w-full h-44 sm:h-48 bg-white rounded-xl p-2.5 flex items-center justify-center overflow-hidden cursor-zoom-in group"
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
                    <FontAwesomeIcon icon={faShirt} className="text-3xl" />
                    <span className="text-[9px] font-black uppercase text-slate-400">Nessuna Foto</span>
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-200 flex items-center gap-1 mb-0.5">
                    <FontAwesomeIcon icon={faTag} className="text-[8px]" />
                    <span>{settoreCarosello}</span>
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                    {prodottoAttivo.nome}
                  </h3>
                  <span className="text-[10px] text-blue-100 font-semibold block mt-0.5">
                    {prodottoAttivo.taglia_unica ? "Taglia Unica" : "Varie taglie disponibili"}
                  </span>
                </div>

                <div className="bg-white text-[#002b80] px-2.5 py-1 rounded-lg shadow-xs text-right shrink-0">
                  <span className="text-[8px] font-black uppercase text-slate-400 block leading-none mb-0.5">Prezzo</span>
                  <span className="text-sm sm:text-base font-black tabular-nums leading-none">
                    €{Number(prodottoAttivo.prezzo || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center bg-white/5 border border-white/10 rounded-2xl p-4">
              <FontAwesomeIcon icon={faShirt} className="text-2xl text-white/30 mb-2" />
              <p className="text-xs font-bold text-white/80">Caricamento articoli...</p>
            </div>
          )}
        </div>

        {/* Indicatori e Controlli Carosello */}
        <div className="w-full flex items-center justify-between pt-2 border-t border-white/10 shrink-0">
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
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              type="button"
              onClick={() => setSlideCorrente(prev => (prev + 1) % prodottiCarosello.length)}
              disabled={prodottiCarosello.length <= 1}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}