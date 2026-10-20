import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, 
  faKey, 
  faXmark, 
  faEnvelope, 
  faEye, 
  faEyeSlash,
  faShieldHalved,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';

const EMAIL_SICUREZZA = "supporto.cnlshop@gmail.com";
const CONFIG_DOC_REF = (dbInstance) => doc(dbInstance, "utenti", "config_sicurezza_admin");

// Componente interno che gestisce il ciclo di vita del form: viene montato da zero ad ogni apertura
function FormSbloccoUtenti({ onClose, onSblocca, utenteLoggato, isUtenteAdmin, mostraMessaggio }) {
  const [loading, setLoading] = useState(true);
  const [primoAccesso, setPrimoAccesso] = useState(false);
  const [password, setPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [mostraPassword, setMostraPassword] = useState(false);
  const [errore, setErrore] = useState('');
  const [invioInCorso, setInvioInCorso] = useState(false);

  useEffect(() => {
    if (!isUtenteAdmin) return;

    let mounted = true;

    async function verificaStatoSicurezza() {
      try {
        const snap = await getDoc(CONFIG_DOC_REF(db));
        if (mounted) {
          const hasPassword = Boolean(snap.exists() && snap.data()?.password);
          setPrimoAccesso(!hasPassword);
        }
      } catch (err) {
        console.error("Errore verifica sicurezza:", err);
        if (mounted) {
          setErrore("Impossibile contattare Firebase: " + err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    verificaStatoSicurezza();

    return () => { 
      mounted = false; 
    };
  }, [isUtenteAdmin]);

  // 1. Setup Password (Primo Accesso)
  const handleCreaPassword = async (e) => {
    e.preventDefault();
    if (!isUtenteAdmin) return;

    if (password.length < 6) {
      setErrore("La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== confermaPassword) {
      setErrore("Le due password non coincidono.");
      return;
    }

    setInvioInCorso(true);
    setErrore('');

    try {
      await setDoc(CONFIG_DOC_REF(db), {
        email: EMAIL_SICUREZZA,
        password: password,
        isAdmin: "config",
        creato_da: utenteLoggato?.email || EMAIL_SICUREZZA,
        creato_il: serverTimestamp(),
        aggiornato_il: serverTimestamp()
      }, { merge: true });

      if (mostraMessaggio) {
        mostraMessaggio("Password Creata", "Password di sicurezza salvata su Firebase.", "success");
      }
      onSblocca();
    } catch (err) {
      console.error("Errore salvataggio password:", err);
      setErrore("Errore salvataggio su Firebase: " + err.message);
    } finally {
      setInvioInCorso(false);
    }
  };

  // 2. Verifica Password (Accesso standard)
  const handleVerificaPassword = async (e) => {
    e.preventDefault();
    if (!isUtenteAdmin) return;

    setInvioInCorso(true);
    setErrore('');

    try {
      const snap = await getDoc(CONFIG_DOC_REF(db));

      if (!snap.exists() || !snap.data().password) {
        setPrimoAccesso(true);
        setInvioInCorso(false);
        return;
      }

      const passSalvata = snap.data().password;
      if (password === passSalvata) {
        onSblocca();
      } else {
        setErrore("Password non corretta. Riprova o reimposta la password.");
      }
    } catch (err) {
      console.error("Errore verifica password:", err);
      setErrore("Errore di connessione a Firebase: " + err.message);
    } finally {
      setInvioInCorso(false);
    }
  };

  // 3. Invio Email di Ripristino
  const handleRecuperoPassword = async () => {
    setInvioInCorso(true);
    try {
      await sendPasswordResetEmail(auth, EMAIL_SICUREZZA);
      if (mostraMessaggio) {
        mostraMessaggio("Email Inviata", `Link di ripristino inviato all'indirizzo ${EMAIL_SICUREZZA}.`, "success");
      }
    } catch {
      const subject = encodeURIComponent("Reset Password Sezione Utenti - CNL Shop");
      const body = encodeURIComponent(
        `Richiesta di ripristino credenziali di accesso per la sezione Utenti di CNL Shop.\nIndirizzo autorizzato: ${EMAIL_SICUREZZA}`
      );
      window.location.href = `mailto:${EMAIL_SICUREZZA}?subject=${subject}&body=${body}`;

      if (mostraMessaggio) {
        mostraMessaggio("Client Email Aperto", `Invia la richiesta a ${EMAIL_SICUREZZA}.`, "info");
      }
    } finally {
      setInvioInCorso(false);
    }
  };

  return (
    <div 
      className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col gap-4.5 animate-in zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
    >
      {/* INTESTAZIONE */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base shadow-2xs ${
            primoAccesso ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#002b80]'
          }`}>
            <FontAwesomeIcon icon={primoAccesso ? faShieldHalved : faLock} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Sicurezza Amministrazione
            </span>
            <h3 className="text-base font-black text-slate-900 leading-tight">
              {primoAccesso ? "Primo Accesso - Crea Password" : "Area Protetta Utenti"}
            </h3>
          </div>
        </div>
        <button 
          type="button" 
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {!isUtenteAdmin ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
          <p className="text-xs font-bold text-red-700">
            Accesso non consentito: non possiedi i privilegi di amministratore.
          </p>
        </div>
      ) : loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#002b80] border-t-transparent animate-spin"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verifica credenziali Firebase...</span>
        </div>
      ) : (
        <>
          {/* EMAIL FISSA NON MODIFICABILE */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
              Email Amministrativa Autorizzata
            </label>
            <div className="relative">
              <input 
                type="email" 
                value={EMAIL_SICUREZZA} 
                disabled 
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-600 cursor-not-allowed select-none"
              />
              <FontAwesomeIcon icon={faEnvelope} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={primoAccesso ? handleCreaPassword : handleVerificaPassword} className="space-y-3.5">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                {primoAccesso ? "Nuova Password (min. 6 caratteri)" : "Password"}
              </label>
              <div className="relative">
                <input 
                  type={mostraPassword ? "text" : "password"}
                  required
                  autoFocus
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errore) setErrore('');
                  }}
                  placeholder={primoAccesso ? "Crea una password..." : "Inserisci password..."}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#002b80] rounded-xl pl-3.5 pr-10 text-sm font-bold text-slate-900 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostraPassword(!mostraPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                >
                  <FontAwesomeIcon icon={mostraPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {primoAccesso && (
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Conferma Password
                </label>
                <input 
                  type={mostraPassword ? "text" : "password"}
                  required
                  value={confermaPassword}
                  onChange={e => {
                    setConfermaPassword(e.target.value);
                    if (errore) setErrore('');
                  }}
                  placeholder="Ripeti la password..."
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#002b80] rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none transition-all"
                />
              </div>
            )}

            {errore && (
              <p className="text-xs font-bold text-red-600 animate-in fade-in leading-relaxed">
                {errore}
              </p>
            )}

            <button
              type="submit"
              disabled={invioInCorso}
              className={`w-full h-11 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                primoAccesso 
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]' 
                  : 'bg-[#002b80] hover:bg-[#002060] active:scale-[0.99]'
              }`}
            >
              <FontAwesomeIcon icon={primoAccesso ? faCheck : faKey} className="text-xs" />
              <span>
                {invioInCorso 
                  ? "Salvataggio..." 
                  : (primoAccesso ? "Salva Password & Accedi" : "Sblocca Sezione")}
              </span>
            </button>
          </form>

          {!primoAccesso && (
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-1 text-center">
              <button
                type="button"
                disabled={invioInCorso}
                onClick={handleRecuperoPassword}
                className="text-xs font-bold text-[#002b80] hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                <span>Hai dimenticato la password? Reimposta password</span>
              </button>
              <span className="text-[11px] text-slate-400">
                Verrà inviata una mail di ripristino a <strong className="text-slate-600">{EMAIL_SICUREZZA}</strong>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ModalSbloccoUtenti({ isOpen, onClose, onSblocca, utenteLoggato, mostraMessaggio }) {
  if (!isOpen) return null;

  const isUtenteAdmin = Boolean(
    utenteLoggato?.isAdmin && 
    utenteLoggato.isAdmin !== "no" && 
    utenteLoggato.isAdmin !== false
  );

  return (
    <div 
      className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <FormSbloccoUtenti 
        onClose={onClose}
        onSblocca={onSblocca}
        utenteLoggato={utenteLoggato}
        isUtenteAdmin={isUtenteAdmin}
        mostraMessaggio={mostraMessaggio}
      />
    </div>
  );
}