import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import Auth from './Auth';

// --- COMPONENTE PRODOTTO ---
function ProdottoCard({ prodotto, onAggiungi, isUserAdmin }) {
  const [atleta, setAtleta] = useState('');
  const [taglia, setTaglia] = useState('M');
  const [nomePers, setNomePers] = useState('');

  const handleAdd = () => {
    if (!atleta.trim()) {
      alert("Attenzione: Inserisci il nome dell'atleta a cui è destinato il capo.");
      return;
    }
    
    const safeUUID = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
    
    onAggiungi({
      idUnivoco: safeUUID, 
      prodottoId: prodotto.id,
      nomeProdotto: prodotto.nome,
      prezzo: prodotto.prezzo,
      atleta: atleta.trim(),
      taglia: taglia,
      nomePersonalizzato: prodotto.personalizzabile ? nomePers.trim() : null
    });
    
    setAtleta('');
    setNomePers('');
  };

  return (
    <Card className="flex flex-col justify-between overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:bg-white/10 transition-all duration-300">
      
      {/* SE IL PRODOTTO HA UN'IMMAGINE PNG/JPG CARICATA, LA RENDERING IN CIMA */}
      {prodotto.immagine_url ? (
        <div className="w-full h-48 overflow-hidden border-b border-white/10 bg-slate-950/40 flex items-center justify-center">
          <img 
            src={prodotto.immagine_url} 
            alt={prodotto.nome} 
            className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="w-full h-12 bg-transparent"></div>
      )}

      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-lg font-bold tracking-wide text-white/90">{prodotto.nome}</CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center pb-2">
        <span className="text-3xl font-black bg-gradient-to-b from-white to-blue-200 bg-clip-text text-transparent mb-4 drop-shadow">
          €{prodotto.prezzo.toFixed(2)}
        </span>
        
        {prodotto.personalizzabile ? (
          <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm px-3 py-1 font-semibold rounded-full mb-4">
            Personalizzabile
          </Badge>
        ) : (
          <div className="h-[34px] mb-4"></div>
        )}

        {!isUserAdmin ? (
          <div className="w-full space-y-3 text-left">
            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Nome Atleta (chi lo indossa)</label>
              <input 
                type="text" value={atleta} onChange={e => setAtleta(e.target.value)} placeholder="Es. Giulia"
                className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Taglia</label>
              <select 
                value={taglia} onChange={e => setTaglia(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-slate-900 appearance-none"
              >
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>
            {prodotto.personalizzabile && (
              <div>
                <label className="text-xs text-white/70 font-semibold mb-1 block">Testo Personalizzato</label>
                <input 
                  type="text" value={nomePers} onChange={e => setNomePers(e.target.value.toUpperCase())} placeholder="Es. GIULIA 10"
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[120px] flex items-center justify-center border border-white/5 bg-white/5 rounded-xl text-center p-4">
            <p className="text-sm text-white/40 italic">Vista catalogo in modalità Sola Lettura Staff</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-4">
        {!isUserAdmin ? (
          <Button onClick={handleAdd} className="w-full font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border border-white/10 shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all rounded-xl py-5">
            Aggiungi al carrello
          </Button>
        ) : (
          <div className="w-full text-center py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-semibold uppercase tracking-wider">
            Account Amministratore
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// --- APPLICAZIONE PRINCIPALE ---
export default function App() {
  const [utenteLoggato, setUtenteLoggato] = useState(null);
  const [prodotti, setProdotti] = useState([]);
  const [carrello, setCarrello] = useState([]);
  const [ordiniUtente, setOrdiniUtente] = useState([]);
  const [tuttiGliOrdiniAdmin, setTuttiGliOrdiniAdmin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);
  const [isCheckout, setIsCheckout] = useState(false);
  const [viewAdmin, setViewAdmin] = useState(false);
  
  const [adminTab, setAdminTab] = useState('ordini');
  const [nuovoProd, setNuovoProd] = useState({ nome: '', prezzo: '', personalizzabile: false });
  const [selectedFile, setSelectedFile] = useState(null); // <-- NUOVO STATO PER IL FILE IMMAGINE SELEZIONATO

  const caricaProdotti = useCallback(async () => {
    try {
      const res = await fetch('https://cnl-shop-backend.onrender.com/api/products');
      if (!res.ok) throw new Error("Errore server");
      const data = await res.json();
      setProdotti(data);
    } catch (err) {
      setErrore("Impossibile collegarsi al backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  const caricaOrdiniUtente = useCallback(async (tokenFisico) => {
    try {
      const res = await fetch('https://cnl-shop-backend.onrender.com/api/orders/my-orders', { headers: { 'Authorization': `Bearer ${tokenFisico}` } });
      if (res.ok) setOrdiniUtente(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const caricaOrdiniGlobaliAdmin = useCallback(async (tokenFisico) => {
    try {
      const res = await fetch('https://cnl-shop-backend.onrender.com/api/admin/orders', { headers: { 'Authorization': `Bearer ${tokenFisico}` } });
      if (res.ok) setTuttiGliOrdiniAdmin(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch('https://cnl-shop-backend.onrender.com/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) throw new Error("Token non valido");
          
          const datiUtente = await res.json();
          setUtenteLoggato(datiUtente);
          
          if (datiUtente.is_admin) {
            setViewAdmin(true);
            await caricaOrdiniGlobaliAdmin(token);
          } else {
            await caricaOrdiniUtente(token);
          }
        } catch (error) { localStorage.removeItem('token'); }
      }
      await caricaProdotti();
    };
    initApp();
  }, [caricaProdotti, caricaOrdiniUtente, caricaOrdiniGlobaliAdmin]);

  // INVIA IL NUOVO CAPO CON FORMATO FORMDATA (BINARIO)
  const creaProdottoAdmin = useCallback(async () => {
    if (!nuovoProd.nome.trim() || !nuovoProd.prezzo) return alert("Inserisci nome e prezzo del prodotto");
    const token = localStorage.getItem('token');
    
    // Costruiamo il form multi-part nativo per includere l'immagine
    const formData = new FormData();
    formData.append('nome', nuovoProd.nome);
    formData.append('prezzo', parseFloat(nuovoProd.prezzo) || 0);
    formData.append('personalizzabile', nuovoProd.personalizzabile);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const res = await fetch('https://cnl-shop-backend.onrender.com/api/admin/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // NOTA: Niente Content-Type, lo inserisce il browser da solo per FormData!
        body: formData
      });
      if (res.ok) {
        setNuovoProd({ nome: '', prezzo: '', personalizzabile: false });
        setSelectedFile(null);
        // Svuotiamo l'input file HTML a schermo
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) fileInput.value = '';
        await caricaProdotti();
      }
    } catch (err) { alert("Errore creazione prodotto"); }
  }, [nuovoProd, selectedFile, caricaProdotti]);

  const eliminaProdottoAdmin = useCallback(async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo prodotto dal catalogo?")) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`https://cnl-shop-backend.onrender.com/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) await caricaProdotti();
    } catch (err) { alert("Errore eliminazione prodotto"); }
  }, [caricaProdotti]);

  const cambiaStatoOrdineAdmin = useCallback(async (ordineId, nuovoStato) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`https://cnl-shop-backend.onrender.com/api/admin/orders/${ordineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ stato_pagamento: nuovoStato })
      });
      if (response.ok) await caricaOrdiniGlobaliAdmin(token);
    } catch (err) { console.error(err); }
  }, [caricaOrdiniGlobaliAdmin]);

  const esportaCsvAdmin = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('https://cnl-shop-backend.onrender.com/api/admin/export-csv', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ordini_cnl_shop.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert("❌ Impossibile scaricare il file CSV."); }
  }, []);

  const aggiungiAlCarrello = useCallback((item) => setCarrello(prev => [...prev, item]), []);
  const rimuoviDalCarrello = useCallback((idUnivoco) => setCarrello(prev => prev.filter(item => item.idUnivoco !== idUnivoco)), []);
  const totaleCarrello = useMemo(() => carrello.reduce((acc, item) => acc + item.prezzo, 0), [carrello]);

  const gestisciCheckout = useCallback(async () => {
    setIsCheckout(true);
    try {
      const token = localStorage.getItem('token'); 
      if (!token) throw new Error("Token mancante");

      const response = await fetch('https://cnl-shop-backend.onrender.com/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ totale: totaleCarrello, carrello: carrello }),
      });

      if (!response.ok) throw new Error("Errore salvataggio");
      const data = await response.json();
      alert(`✅ Ordine #${data.ordine_id} salvato correttamente!`);
      setCarrello([]); 
      await caricaOrdiniUtente(token);
    } catch (error) { alert("❌ Errore di connessione o sessione scaduta."); } finally { setIsCheckout(false); }
  }, [carrello, totaleCarrello, caricaOrdiniUtente]);

  const gestisciLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUtenteLoggato(null); setOrdiniUtente([]); setTuttiGliOrdiniAdmin([]); setViewAdmin(false);
  }, []);

  if (loading && !errore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4"></div>
        <p className="text-white/70 font-semibold tracking-wide animate-pulse">Caricamento in corso...</p>
      </div>
    );
  }

  if (!utenteLoggato) {
    return (
      <div className="font-sans text-white antialiased">
        <Auth onLoginSuccess={(datiUtente) => {
          setUtenteLoggato(datiUtente);
          const t = localStorage.getItem('token');
          if(t) {
            if (datiUtente.is_admin) {
              setViewAdmin(true);
              caricaOrdiniGlobaliAdmin(t);
            } else {
              caricaOrdiniUtente(t);
            }
          }
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 font-sans text-white antialiased">
      <header className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] mb-10 text-center relative">
        <h1 className="text-4xl md:text-5xl font-black tracking-wider uppercase bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-sm">CNL Shop</h1>
        <p className="mt-3 text-blue-200/80 text-lg md:text-xl font-medium">Circolo Nuoto Lucca - Ordini Abbigliamento Sportivo</p>
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/70">Accesso come <strong className="text-white">{utenteLoggato.nome}</strong>
            {utenteLoggato.is_admin && <span className="text-xs ml-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Staff</span>}
          </p>
          <div className="flex gap-3">
            {utenteLoggato.is_admin && (
              <button onClick={() => setViewAdmin(!viewAdmin)} className="text-xs bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-500/30 px-4 py-1.5 rounded-full transition-colors font-bold uppercase tracking-wider">
                {viewAdmin ? "Vedi Catalogo Pubblico" : "Pannello Staff"}
              </button>
            )}
            <button onClick={gestisciLogout} className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 px-4 py-1.5 rounded-full transition-colors font-bold uppercase tracking-wider">Esci</button>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto">
        {!viewAdmin ? (
          <>
            <h2 className="text-3xl font-bold text-white/90 tracking-wide mb-8 border-b border-white/10 pb-4">Catalogo Abbigliamento</h2>
            {errore ? <div className="bg-red-500/20 p-4 rounded-xl text-red-200">{errore}</div> : (
              prodotti.length === 0 ? (
                <p className="text-white/50 italic p-8 bg-white/5 rounded-xl border border-white/10 text-center">Il catalogo è attualmente vuoto. Contatta lo staff.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {prodotti.map(prodotto => <ProdottoCard key={prodotto.id} prodotto={prodotto} onAggiungi={aggiungiAlCarrello} isUserAdmin={utenteLoggato.is_admin} />)}
                </div>
              )
            )}

            {!utenteLoggato.is_admin && carrello.length > 0 && (
              <div className="mt-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">Il tuo ordine attuale</h2>
                <div className="space-y-4 mb-8">
                  {carrello.map((item) => (
                    <div key={item.idUnivoco} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 border border-white/10 rounded-xl p-4">
                      <div>
                        <h4 className="font-bold text-lg text-blue-100">{item.nomeProdotto}</h4>
                        <p className="text-sm text-white/70">Atleta: <span className="font-semibold text-white">{item.atleta}</span> | Taglia: <span className="font-semibold text-white">{item.taglia}</span></p>
                        {item.nomePersonalizzato && <p className="text-sm text-cyan-300 mt-1">Stampa: "{item.nomePersonalizzato}"</p>}
                      </div>
                      <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between">
                        <span className="font-black text-xl">€{item.prezzo.toFixed(2)}</span>
                        <button onClick={() => rimuoviDalCarrello(item.idUnivoco)} className="text-red-400 font-bold text-sm bg-red-500/10 px-3 py-1 rounded-md">Rimuovi</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center border-t border-white/10 pt-6 gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-white/70 font-medium">Totale complessivo</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">€{totaleCarrello.toFixed(2)}</p>
                  </div>
                  <Button onClick={gestisciCheckout} disabled={isCheckout} className="w-full md:w-auto px-10 py-6 text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl">
                    {isCheckout ? "Salvataggio..." : "Procedi al Pagamento"}
                  </Button>
                </div>
              </div>
            )}

            {!utenteLoggato.is_admin && (
              <div className="mt-20 border-t border-white/10 pt-10">
                <h2 className="text-3xl font-bold text-white/90 tracking-wide mb-8">I Miei Ordini Inviati</h2>
                {ordiniUtente.length === 0 ? <p className="text-white/50 text-center py-8 italic bg-white/5 rounded-2xl">Non hai ancora inviato nessun ordine.</p> : (
                  <div className="space-y-6">
                    {ordiniUtente.map((ord) => (
                      <div key={`user-ord-${ord.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-md">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                          <h3 className="text-xl font-bold text-blue-200">Ordine #{ord.id}</h3>
                          <Badge className={`px-3 py-1 text-xs rounded-full border ${ord.stato_pagamento === 'In attesa' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>{ord.stato_pagamento}</Badge>
                        </div>
                        <div className="divide-y divide-white/5 space-y-3">
                          {ord.articoli.map((art, idx) => (
                            <div key={`user-art-${idx}`} className="pt-3 first:pt-0 flex justify-between items-center text-sm">
                              <div>
                                <p className="font-bold text-white/90">{art.nome_prodotto} <span className="text-xs text-white/40">({art.taglia})</span></p>
                                <p className="text-xs text-white/60">Destinatario: <span className="text-white">{art.atleta}</span> {art.nome_personalizzato && <span> | Stampa: <span className="text-cyan-400">"{art.nome_personalizzato}"</span></span>}</p>
                              </div>
                              <span className="font-semibold text-white/80">€{art.prezzo.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* --- VISTA ADMIN (STAFF) --- */
          <div className="space-y-8 animate-fadeIn">
            <div className="flex gap-4 border-b border-white/10 pb-4">
              <button onClick={() => setAdminTab('ordini')} className={`px-5 py-2 rounded-xl font-bold transition-all ${adminTab === 'ordini' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg' : 'text-white/50 hover:bg-white/5'}`}>📦 Gestione Ordini</button>
              <button onClick={() => setAdminTab('catalogo')} className={`px-5 py-2 rounded-xl font-bold transition-all ${adminTab === 'catalogo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg' : 'text-white/50 hover:bg-white/5'}`}>👕 Gestione Catalogo Prodotti</button>
            </div>

            {adminTab === 'ordini' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-white">Ordini Ricevizi</h2>
                  <button onClick={esportaCsvAdmin} className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/30 px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2">📥 Scarica CSV Fornitore</button>
                </div>
                {tuttiGliOrdiniAdmin.length === 0 ? <p className="text-white/50 text-center py-8 bg-white/5 rounded-2xl">Nessun ordine nel sistema.</p> : (
                  tuttiGliOrdiniAdmin.map((ord) => (
                    <div key={`admin-ord-${ord.id}`} className="bg-slate-900/40 border border-cyan-500/20 rounded-3xl p-6 shadow-xl">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 mb-4 gap-4">
                        <div>
                          <span className="text-xs text-cyan-400 font-bold tracking-wider uppercase">Registrato</span>
                          <h3 className="text-2xl font-black text-white">Ordine #{ord.id}</h3>
                          <p className="text-xs text-white/60 mt-1">Acquirente: <span className="text-white font-semibold">{ord.acquirente}</span> ({ord.email_acquirente})</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs text-white/40 block">Totale</span>
                            <span className="font-black text-xl text-cyan-300">€{ord.totale.toFixed(2)}</span>
                          </div>
                          <select value={ord.stato_pagamento} onChange={(e) => cambiaStatoOrdineAdmin(ord.id, e.target.value)} className="bg-slate-800 border border-white/20 rounded-xl p-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400">
                            <option value="In attesa">In attesa</option>
                            <option value="In lavorazione">In lavorazione</option>
                            <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                            <option value="Completato">Completato</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                        {ord.articoli.map((art, idx) => (
                          <div key={`admin-art-${idx}`} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:pb-0 last:border-0">
                            <div>
                              <p className="font-bold text-white">{art.nome_prodotto} - <span className="text-cyan-300">Taglia {art.taglia}</span></p>
                              <p className="text-xs text-white/60">Atleta: <span className="text-white font-semibold">{art.atleta}</span> {art.nome_personalizzato && ` | Stampa: "${art.nome_personalizzato}"`}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {adminTab === 'catalogo' && (
              <div className="space-y-8">
                {/* FORM AGGIUNTA PRODOTTO */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Aggiungi Nuovo Prodotto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <label className="text-xs text-white/70 mb-1 block">Nome Prodotto</label>
                        <input type="text" value={nuovoProd.nome} onChange={e => setNuovoProd({...nuovoProd, nome: e.target.value})} className="w-full bg-slate-800 border border-white/20 rounded-xl p-2.5 text-white" placeholder="Es. T-Shirt Rappresentanza"/>
                      </div>
                      
                      {/* --- NUOVO INPUT PER FILE PNG/JPG --- */}
                      <div>
                        <label className="text-xs text-cyan-400 font-bold mb-1 block">Immagine Prodotto (PNG / JPG)</label>
                        <input 
                          id="file-upload-input"
                          type="file" 
                          accept="image/*"
                          onChange={e => setSelectedFile(e.target.files[0])}
                          className="w-full bg-slate-800 border border-white/20 rounded-xl p-1.5 text-xs text-white/70 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-300 file:cursor-pointer hover:file:bg-cyan-500/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/70 mb-1 block">Prezzo (€)</label>
                      <input type="number" step="0.01" value={nuovoProd.prezzo} onChange={e => setNuovoProd({...nuovoProd, prezzo: e.target.value})} className="w-full bg-slate-800 border border-white/20 rounded-xl p-2.5 text-white" placeholder="0.00"/>
                    </div>
                    <div className="flex items-center gap-3 pb-3">
                      <input type="checkbox" id="pers" checked={nuovoProd.personalizzabile} onChange={e => setNuovoProd({...nuovoProd, personalizzabile: e.target.checked})} className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"/>
                      <label htmlFor="pers" className="text-sm font-semibold text-white/90 cursor-pointer">Stampa retro</label>
                    </div>
                  </div>
                  <Button onClick={creaProdottoAdmin} className="mt-5 w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl px-8 py-2.5 shadow-lg">
                    + Salva Prodotto nel Catalogo
                  </Button>
                </div>

                {/* LISTA PRODOTTI ESISTENTI */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Prodotti nel Database ({prodotti.length})</h3>
                  {prodotti.length === 0 ? <p className="text-white/50 text-sm">Nessun prodotto trovato. Inizia ad aggiungerli!</p> : (
                    <div className="space-y-3">
                      {prodotti.map(p => (
                        <div key={`cat-prod-${p.id}`} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-4">
                            {/* Anteprima miniatura per l'admin */}
                            {p.immagine_url && (
                              <div className="w-12 h-12 rounded-lg bg-slate-950/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                <img src={p.immagine_url} alt="" className="w-full h-full object-contain" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white text-lg">{p.nome} <span className="text-cyan-300 ml-2">€{p.prezzo.toFixed(2)}</span></p>
                              {p.personalizzabile && <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full mt-1 inline-block border border-amber-500/20">Personalizzabile</span>}
                            </div>
                          </div>
                          <button onClick={() => eliminaProdottoAdmin(p.id)} className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/40 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            Elimina
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}