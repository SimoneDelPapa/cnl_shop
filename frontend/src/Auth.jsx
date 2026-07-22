import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./components/ui/Card";
import { Button } from "./components/ui/Button";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
);

export default function Auth({ onLoginSuccess }) {
  const [view, setView] = useState('login'); 
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState('');
  const [messaggio, setMessaggio] = useState('');

  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token) {
      setResetToken(token);
      setView('reset');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrore('');
    setMessaggio('');
    setLoading(true);

    try {
      if (view === 'login') {
        const res = await fetch('https://cnl-shop-backend.onrender.com/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error("Credenziali errate. Controlla email e password.");
        
        const data = await res.json();
        sessionStorage.setItem('token', data.access_token);
        onLoginSuccess(data.utente);

      } else if (view === 'register') {
        const res = await fetch('https://cnl-shop-backend.onrender.com/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, cognome, email, password })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Errore durante la registrazione.");
        }
        setMessaggio("Registrazione completata! Ora puoi accedere.");
        setView('login');
        setPassword('');

      } else if (view === 'forgot') {
        const res = await fetch('https://cnl-shop-backend.onrender.com/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!res.ok) throw new Error("Errore durante l'invio della richiesta.");
        
        setMessaggio("Se l'email è registrata, riceverai a breve un link per resettare la password.");
        setTimeout(() => setView('login'), 4000);

      } else if (view === 'reset') {
        if (password.length < 6) throw new Error("La nuova password deve contenere almeno 6 caratteri.");
        
        const res = await fetch('https://cnl-shop-backend.onrender.com/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, nuova_password: password })
        });
        if (!res.ok) throw new Error("Il link di reset è scaduto o non valido.");
        
        setMessaggio("Password aggiornata con successo! Ora puoi accedere.");
        setTimeout(() => {
          window.history.replaceState({}, document.title, "/cnl_shop/"); 
          setView('login');
          setPassword('');
        }, 3000);
      }
    } catch (err) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl sm:rounded-3xl shadow-2xl p-2 sm:p-4">
        <CardHeader className="text-center pb-2 pt-4 px-4">
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-wider text-cyan-300">CNL SHOP</CardTitle>
          <p className="text-white/60 text-xs sm:text-sm mt-1.5">
            {view === 'login' && "Accedi per visualizzare il catalogo"}
            {view === 'register' && "Crea un nuovo account"}
            {view === 'forgot' && "Recupera la tua password"}
            {view === 'reset' && "Imposta la nuova password"}
          </p>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          {errore && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-2 rounded-xl text-xs sm:text-sm mb-3 text-center animate-fadeIn">
              {errore}
            </div>
          )}
          {messaggio && (
            <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-3 py-2 rounded-xl text-xs sm:text-sm mb-3 text-center animate-fadeIn">
              {messaggio}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            {view === 'register' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1">Nome</label>
                  <input 
                    type="text" required value={nome} onChange={e => setNome(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/20 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Es. Mario"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1">Cognome</label>
                  <input 
                    type="text" required value={cognome} onChange={e => setCognome(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/20 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Es. Rossi"
                  />
                </div>
              </div>
            )}

            {(view === 'login' || view === 'register' || view === 'forgot') && (
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1">Email</label>
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/20 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="mario@email.com"
                />
              </div>
            )}

            {(view === 'login' || view === 'register' || view === 'reset') && (
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1">
                  {view === 'reset' ? "Nuova Password" : "Password"}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/20 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-10"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            )}

            {view === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => { setView('forgot'); setErrore(''); setMessaggio(''); }} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                  Password dimenticata?
                </button>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-3 text-xs sm:text-sm mt-3 shadow-lg shadow-cyan-500/20">
              {loading ? "Attendere..." : (
                view === 'login' ? "Accedi" : 
                view === 'register' ? "Registrati" : 
                view === 'forgot' ? "Invia Link di Recupero" : 
                "Salva Nuova Password"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col border-t border-white/10 pt-3 pb-3 mt-2 px-4">
          {view === 'login' ? (
            <p className="text-xs sm:text-sm text-white/60">Non hai un account? <button onClick={() => { setView('register'); setErrore(''); setMessaggio(''); }} className="text-cyan-400 font-bold hover:underline ml-1">Registrati</button></p>
          ) : (
            <button onClick={() => { setView('login'); setErrore(''); setMessaggio(''); }} className="text-xs sm:text-sm text-white/60 hover:text-white font-semibold transition-colors">
              ← Torna al Login
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}