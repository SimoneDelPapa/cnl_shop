import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faWater, 
  faPersonSwimming, 
  faLock, 
  faEnvelope, 
  faUser, 
  faArrowRight, 
  faCircleExclamation,
  faChevronLeft,
  faChevronRight,
  faBoxOpen,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function Auth({ onLoginSuccess, externalError, onClearExternalError, onSettoreChange }) {
  const [settore, setSettore] = useState(() => {
    return sessionStorage.getItem("cnl_settore_richiesto") || 'pallanuoto';
  });
  const [isRegistrazione, setIsRegistrazione] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [mostraPassword, setMostraPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [prodottiPallanuoto, setProdottiPallanuoto] = useState([]);
  const [prodottiNuoto, setProdottiNuoto] = useState([]);
  const [slideCorrente, setSlideCorrente] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "prodotti"), (snapshot) => {
      const prods = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProdottiPallanuoto(prods.filter(p => (p.disciplina === 'pallanuoto' || p.disciplina === 'entrambi') && p.immagine_url && p.attivo !== false));
      setProdottiNuoto(prods.filter(p => (p.disciplina === 'nuoto' || p.disciplina === 'entrambi') && p.immagine_url && p.attivo !== false));
    }, (err) => console.error("Errore recupero prodotti per carosello:", err));

    return () => unsubscribe();
  }, []);

  const activeSlides = settore === 'pallanuoto' ? prodottiPallanuoto : prodottiNuoto;

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideCorrente((prev) => (prev + 1) % activeSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const slidePrecedente = () => {
    setSlideCorrente((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1));
  };

  const slideSuccessiva = () => {
    setSlideCorrente((prev) => (prev + 1) % activeSlides.length);
  };

  const handleSettoreSwitch = (nuovoSettore) => {
    setSettore(nuovoSettore);
    setSlideCorrente(0);
    sessionStorage.setItem("cnl_settore_richiesto", nuovoSettore);
    setError(null);
    if (onClearExternalError) onClearExternalError();
    if (onSettoreChange) onSettoreChange(nuovoSettore);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (onClearExternalError) onClearExternalError();
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email.trim()) throw new Error("Inserisci la tua email per ricevere il link.");
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMessage("Ti abbiamo inviato un'email per reimpostare la password. Controlla anche la cartella Spam.");
        setLoading(false);
        return;
      }

      if (isRegistrazione) {
        if (!nome.trim() || !cognome.trim()) throw new Error("Inserisci nome e cognome.");
        if (password.length < 6) throw new Error("La password deve contenere almeno 6 caratteri.");

        let user;
        try {
          const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
          user = res.user;
        } catch (authErr) {
          // Se l'account esiste già su Firebase Auth, esegue l'accesso per creare il profilo dell'altro settore
          if (authErr.code === 'auth/email-already-in-use') {
            const loginRes = await signInWithEmailAndPassword(auth, email.trim(), password);
            user = loginRes.user;
          } else {
            throw authErr;
          }
        }

        const compositeKey = `${user.uid}_${settore}`;
        const datiProfilo = {
          auth_uid: user.uid,
          email: user.email,
          nome: nome.trim(),
          cognome: cognome.trim(),
          settore: settore,
          is_admin: false,
          atleti: [],
          creato_il: serverTimestamp()
        };

        await setDoc(doc(db, "utenti", compositeKey), datiProfilo);
        onLoginSuccess({ id: compositeKey, ...datiProfilo });
      } else {
        const res = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = res.user;

        const compositeKey = `${user.uid}_${settore}`;
        let docSnap = await getDoc(doc(db, "utenti", compositeKey));

        // Retrocompatibilità se l'utente era stato registrato con ID = UID standard
        if (!docSnap.exists()) {
          const legacySnap = await getDoc(doc(db, "utenti", user.uid));
          if (legacySnap.exists() && legacySnap.data().settore === settore) {
            docSnap = legacySnap;
          }
        }

        if (docSnap.exists()) {
          onLoginSuccess({ id: docSnap.id, ...docSnap.data() });
        } else {
          throw new Error(`Nessun profilo trovato per il settore ${settore.toUpperCase()} con questa email. Registrati selezionando la scheda '${settore === 'pallanuoto' ? 'Pallanuoto' : 'Nuoto'}'.`);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Email o password non corretti.");
      } else {
        setError(err.message || "Si è verificato un errore durante l'accesso.");
      }
    } finally {
      setLoading(false);
    }
  };

  const erroreAttivo = externalError || error;
  const currentSlide = activeSlides[slideCorrente] || activeSlides[0];

  return (
    <div className="min-h-screen flex items-center justify-center px-3.5 sm:px-6 lg:px-8 py-6 sm:py-12 bg-slate-100/80 antialiased font-sans">
      <div className="w-full max-w-5xl bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 shadow-lg shadow-slate-200/60 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* COLONNA FORM */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#002b80] text-white items-center justify-center text-base sm:text-lg shadow-sm mb-1">
                <FontAwesomeIcon icon={settore === 'pallanuoto' ? faWater : faPersonSwimming} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">CNL Shop</h1>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-wide uppercase">
                Circolo Nuoto Lucca • Forniture Ufficiali
              </p>
            </div>

            {erroreAttivo && (
              <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs font-semibold text-red-800 leading-relaxed">
                <FontAwesomeIcon icon={faCircleExclamation} className="text-red-600 text-sm mt-0.5 shrink-0" />
                <span>{erroreAttivo}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 leading-relaxed">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegistrazione && !isForgotPassword && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">Nome</label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                      <input
                        type="text"
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        placeholder="Nome"
                        required
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#002b80]/15 focus:border-[#002b80] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">Cognome</label>
                    <input
                      type="text"
                      value={cognome}
                      onChange={e => setCognome(e.target.value)}
                      placeholder="Cognome"
                      required
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#002b80]/15 focus:border-[#002b80] transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">Email</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nome@esempio.it"
                    required
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#002b80]/15 focus:border-[#002b80] transition-all"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Password</label>
                    {!isRegistrazione && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMessage(null); }}
                        className="text-[11px] font-bold text-[#002b80] hover:underline cursor-pointer"
                      >
                        Password dimenticata?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      type={mostraPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#002b80]/15 focus:border-[#002b80] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setMostraPassword(!mostraPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      title={mostraPassword ? "Nascondi password" : "Mostra password"}
                    >
                      <FontAwesomeIcon icon={mostraPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-950/15 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {loading 
                    ? "Verifica in corso..." 
                    : isForgotPassword 
                    ? "Invia link di reset" 
                    : isRegistrazione 
                    ? "Crea account" 
                    : "Accedi"}
                </span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[11px]" />
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center text-xs">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); setSuccessMessage(null); }}
                className="font-extrabold text-[#002b80] hover:underline cursor-pointer"
              >
                Torna all'accesso
              </button>
            ) : isRegistrazione ? (
              <p className="text-slate-500 font-medium">
                Hai già un account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistrazione(false); setError(null); setSuccessMessage(null); }}
                  className="font-extrabold text-[#002b80] hover:underline cursor-pointer ml-1"
                >
                  Accedi
                </button>
              </p>
            ) : (
              <p className="text-slate-500 font-medium">
                Non hai ancora un account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistrazione(true); setError(null); setSuccessMessage(null); }}
                  className="font-extrabold text-[#002b80] hover:underline cursor-pointer ml-1"
                >
                  Registrati
                </button>
              </p>
            )}
          </div>
        </div>

        {/* COLONNA VETRINA */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="space-y-1.5 shrink-0">
            <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Seleziona la disciplina per accedere o registrarti
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => handleSettoreSwitch('pallanuoto')}
                className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  settore === 'pallanuoto'
                    ? 'bg-white text-[#002b80] shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faWater} className="text-xs" />
                <span>Pallanuoto</span>
              </button>
              <button
                type="button"
                onClick={() => handleSettoreSwitch('nuoto')}
                className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  settore === 'nuoto'
                    ? 'bg-white text-[#002b80] shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faPersonSwimming} className="text-xs" />
                <span>Nuoto</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[280px] sm:min-h-[340px] lg:min-h-[380px]">
            {activeSlides.length > 0 ? (
              <div className="h-[280px] sm:h-[340px] lg:h-[380px] bg-slate-900 border border-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between relative">
                <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                  <img 
                    src={currentSlide.immagine_url} 
                    alt={currentSlide.nome}
                    className="max-h-full max-w-full object-contain transition-opacity duration-300"
                  />
                  
                  {activeSlides.length > 1 && (
                    <>
                      <button 
                        type="button"
                        onClick={slidePrecedente}
                        className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center text-xs transition-all shadow-md cursor-pointer"
                        aria-label="Slide precedente"
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                      <button 
                        type="button"
                        onClick={slideSuccessiva}
                        className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center text-xs transition-all shadow-md cursor-pointer"
                        aria-label="Slide successiva"
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </>
                  )}
                </div>

                <div className="p-3.5 sm:p-4 bg-slate-900/95 border-t border-slate-800 text-white shrink-0 flex items-center justify-between gap-2">
                  <div className="truncate pr-2">
                    <span className="text-[9px] uppercase font-black tracking-widest text-blue-300 block">
                      {settore === 'pallanuoto' ? 'Pallanuoto CNL' : 'Nuoto CNL'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black truncate mt-0.5">
                      {currentSlide.nome}
                    </h4>
                  </div>
                  {currentSlide.prezzo && (
                    <span className="text-sm sm:text-base font-black text-emerald-400 tabular-nums shrink-0">
                      €{Number(currentSlide.prezzo).toFixed(2)}
                    </span>
                  )}
                </div>

                {activeSlides.length > 1 && (
                  <div className="py-2 bg-slate-950 flex items-center justify-center gap-1.5 border-t border-slate-800/80">
                    {activeSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSlideCorrente(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          slideCorrente === idx ? 'w-5 bg-[#002b80]' : 'w-1.5 bg-slate-700'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[280px] sm:h-[340px] lg:h-[380px] bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-200/70 text-slate-400 flex items-center justify-center text-lg sm:text-xl">
                  <FontAwesomeIcon icon={faBoxOpen} />
                </div>
                <h4 className="text-sm font-black text-slate-800">Catalogo Vuoto</h4>
                <p className="text-xs text-slate-500 max-w-xs font-medium leading-relaxed">
                  Nessun articolo con foto disponibile per il settore <strong className="text-slate-800">{settore}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}