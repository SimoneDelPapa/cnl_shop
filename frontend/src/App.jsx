import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import Auth from './Auth';

const PAYPAL_LINK_PALLANUOTO = "https://paypal.me/pallanuotolucca?country.x=IT&locale.x=it_IT";

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
      {prodotto.immagine_url ? (
        <div className="w-full h-40 sm:h-48 overflow-hidden border-b border-white/10 bg-slate-950/40 flex items-center justify-center">
          <img 
            src={prodotto.immagine_url} 
            alt={prodotto.nome} 
            className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="w-full h-6 bg-transparent"></div>
      )}

      <CardHeader className="pb-2 pt-4 text-center px-4">
        <CardTitle className="text-base sm:text-lg font-bold tracking-wide text-white/90">{prodotto.nome}</CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center pb-2 px-4">
        <span className="text-2xl sm:text-3xl font-black bg-gradient-to-b from-white to-blue-200 bg-clip-text text-transparent mb-3 drop-shadow">
          €{prodotto.prezzo.toFixed(2)}
        </span>
        
        {prodotto.personalizzabile ? (
          <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm px-3 py-0.5 font-semibold rounded-full mb-3 text-xs">
            Personalizzabile
          </Badge>
        ) : (
          <div className="h-[26px] mb-3"></div>
        )}

        {!isUserAdmin ? (
          <div className="w-full space-y-3 text-left">
            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Nome Atleta (chi lo indossa)</label>
              <input 
                type="text" value={atleta} onChange={e => setAtleta(e.target.value)} placeholder="Es. Giulia"
                className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Taglia</label>
              <select 
                value={taglia} onChange={e => setTaglia(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-slate-900 appearance-none"
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
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[100px] flex items-center justify-center border border-white/5 bg-white/5 rounded-xl text-center p-3">
            <p className="text-xs text-white/40 italic">Vista catalogo in modalità Sola Lettura Staff</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3 px-4 pb-4">
        {!isUserAdmin ? (
          <Button onClick={handleAdd} className="w-full font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border border-white/10 shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all rounded-xl py-3 text-sm">
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
  const [selectedFile, setSelectedFile] = useState(null);

  const [ricercaAdmin, setRicercaAdmin] = useState('');
  const [filtroStatoAdmin, setFiltroStatoAdmin] = useState('Tutti');

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

  const creaProdottoAdmin = useCallback(async () => {
    if (!nuovoProd.nome.trim() || !nuovoProd.prezzo) return alert("Inserisci nome e prezzo del prodotto");
    const token = localStorage.getItem('token');
    
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
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setNuovoProd({ nome: '', prezzo: '', personalizzabile: false });
        setSelectedFile(null);
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
      
      alert(`✅ Ordine #${data.ordine_id} registrato nel sistema!\nAdesso verrai reindirizzato su PayPal per completare il pagamento.`);
      
      setCarrello([]); 
      await caricaOrdiniUtente(token);

      window.open(PAYPAL_LINK_PALLANUOTO, '_blank', 'noopener,noreferrer');
      
    } catch (error) { 
      alert("❌ Errore durante il salvataggio dell'ordine o sessione scaduta."); 
    } finally { 
      setIsCheckout(false); 
    }
  }, [carrello, totaleCarrello, caricaOrdiniUtente]);

  const gestisciLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUtenteLoggato(null); setOrdiniUtente([]); setTuttiGliOrdiniAdmin([]); setViewAdmin(false);
  }, []);

  // --- RAGGRUPPAMENTO ORDINI PER UTENTE (ADMIN) ---
  const ordiniAdminRaggruppatiPerUtente = useMemo(() => {
    const gruppiMap = new Map();

    tuttiGliOrdiniAdmin.forEach(ord => {
      const matchStato = filtroStatoAdmin === 'Tutti' || ord.stato_pagamento === filtroStatoAdmin;
      const termine = ricercaAdmin.toLowerCase().trim();
      
      const matchAcquirente = ord.acquirente.toLowerCase().includes(termine);
      const matchEmail = ord.email_acquirente.toLowerCase().includes(termine);
      const matchId = ord.id.toString() === termine;
      const matchAtleta = ord.articoli.some(art => art.atleta.toLowerCase().includes(termine));

      if (matchStato && (termine === '' || matchAcquirente || matchEmail || matchId || matchAtleta)) {
        const chiaveUtente = ord.email_acquirente || "Sconosciuta";
        
        if (!gruppiMap.has(chiaveUtente)) {
          gruppiMap.set(chiaveUtente, {
            acquirente: ord.acquirente,
            email: chiaveUtente,
            ordini: [],
            totaleSpeso: 0
          });
        }
        
        const gruppo = gruppiMap.get(chiaveUtente);
        gruppo.ordini.push(ord);
        gruppo.totaleSpeso += ord.totale;
      }
    });

    // Convertiamo in Array e ordiniamo cronologicamente (i gruppi con gli ordini più recenti in cima)
    return Array.from(gruppiMap.values()).sort((a, b) => {
      const maxIdA = Math.max(...a.ordini.map(o => o.id));
      const maxIdB = Math.max(...b.ordini.map(o => o.id));
      return maxIdB - maxIdA;
    });
  }, [tuttiGliOrdiniAdmin, ricercaAdmin, filtroStatoAdmin]);

  const statisticheAdmin = useMemo(() => {
    const stats = { inAttesa: 0, inLavorazione: 0, pronti: 0, completati: 0, incassoTotale: 0 };
    tuttiGliOrdiniAdmin.forEach(o => {
      if (o.stato_pagamento === 'In attesa') stats.inAttesa++;
      if (o.stato_pagamento === 'In lavorazione') stats.inLavorazione++;
      if (o.stato_pagamento === 'Pronto per il ritiro') stats.pronti++;
      if (o.stato_pagamento === 'Completato') stats.completati++;
      stats.incassoTotale += o.totale;
    });
    return stats;
  }, [tuttiGliOrdiniAdmin]);

  if (loading && !errore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mb-4"></div>
        <p className="text-white/70 font-semibold tracking-wide animate-pulse text-sm">Caricamento in corso...</p>
      </div>
    );
  }

  if (!utenteLoggato) {
    return (
      <div className="font-sans text-white antialiased min-h-screen">
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
    <div className="min-h-screen p-3 sm:p-6 md:p-12 font-sans text-white antialiased">
      <header className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] mb-6 sm:mb-10 text-center relative">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-wider uppercase bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-sm">CNL Shop</h1>
        <p className="mt-1 sm:mt-3 text-blue-200/80 text-xs sm:text-lg font-medium">Circolo Nuoto Lucca - Abbigliamento Sportivo</p>
        
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs sm:text-sm text-white/70 text-center sm:text-left">
            Accesso come <strong className="text-white">{utenteLoggato.nome}</strong>
            {utenteLoggato.is_admin && <span className="text-[10px] sm:text-xs ml-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Staff</span>}
          </p>
          <div className="flex flex-wrap justify-center gap-2 w-full sm:w-auto">
            {utenteLoggato.is_admin && (
              <button onClick={() => setViewAdmin(!viewAdmin)} className="text-[11px] sm:text-xs bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-500/30 px-3 py-1.5 rounded-full transition-colors font-bold uppercase tracking-wider flex-1 sm:flex-none">
                {viewAdmin ? "Catalogo Pubblico" : "Pannello Staff"}
              </button>
            )}
            <button onClick={gestisciLogout} className="text-[11px] sm:text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 px-4 py-1.5 rounded-full transition-colors font-bold uppercase tracking-wider">Esci</button>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto">
        {!viewAdmin ? (
          <>
            <h2 className="text-xl sm:text-3xl font-bold text-white/90 tracking-wide mb-4 sm:mb-8 border-b border-white/10 pb-2 sm:pb-4">Catalogo Abbigliamento</h2>
            {errore ? <div className="bg-red-500/20 p-4 rounded-xl text-red-200 text-sm">{errore}</div> : (
              prodotti.length === 0 ? (
                <p className="text-white/50 italic p-6 bg-white/5 rounded-xl border border-white/10 text-center text-sm">Il catalogo è attualmente vuoto. Contatta lo staff.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                  {prodotti.map(prodotto => <ProdottoCard key={prodotto.id} prodotto={prodotto} onAggiungi={aggiungiAlCarrello} isUserAdmin={utenteLoggato.is_admin} />)}
                </div>
              )
            )}

            {carrello.length > 0 && (
              <div className="mt-10 sm:mt-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Il tuo ordine attuale</h2>
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {carrello.map((item) => (
                    <div key={item.idUnivoco} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 gap-2 sm:gap-0">
                      <div>
                        <h4 className="font-bold text-base sm:text-lg text-blue-100">{item.nomeProdotto}</h4>
                        <p className="text-xs sm:text-sm text-white/70">Atleta: <span className="font-semibold text-white">{item.atleta}</span> | Taglia: <span className="font-semibold text-white">{item.taglia}</span></p>
                        {item.nomePersonalizzato && <p className="text-xs sm:text-sm text-cyan-300 mt-0.5">Stampa: "{item.nomePersonalizzato}"</p>}
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 mt-1 sm:mt-0">
                        <span className="font-black text-lg sm:text-xl">€{item.prezzo.toFixed(2)}</span>
                        <button onClick={() => rimuoviDalCarrello(item.idUnivoco)} className="text-red-400 font-bold text-xs bg-red-500/10 px-2.5 py-1 rounded-md">Rimuovi</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center border-t border-white/10 pt-4 sm:pt-6 gap-4 sm:gap-6">
                  <div className="text-center sm:text-left w-full sm:w-auto">
                    <p className="text-white/70 font-medium text-xs sm:text-base">Totale complessivo</p>
                    <p className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">€{totaleCarrello.toFixed(2)}</p>
                  </div>
                  <Button onClick={gestisciCheckout} disabled={isCheckout} className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-6 text-sm sm:text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl">
                    {isCheckout ? "Salvataggio..." : "Paga su PayPal"}
                  </Button>
                </div>
              </div>
            )}

            {!utenteLoggato.is_admin && (
              <div className="mt-12 sm:mt-20 border-t border-white/10 pt-6 sm:pt-10">
                <h2 className="text-xl sm:text-3xl font-bold text-white/90 tracking-wide mb-4 sm:mb-8">I Miei Ordini Inviati</h2>
                {ordiniUtente.length === 0 ? <p className="text-white/50 text-center py-6 text-xs sm:text-sm italic bg-white/5 rounded-2xl">Non hai ancora inviato nessun ordine.</p> : (
                  <div className="space-y-4 sm:space-y-6">
                    {ordiniUtente.map((ord) => (
                      <div key={`user-ord-${ord.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-md">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
                          <h3 className="text-base sm:text-xl font-bold text-blue-200">Ordine #{ord.id}</h3>
                          <Badge className={`px-2.5 py-0.5 text-[10px] sm:text-xs rounded-full border ${ord.stato_pagamento === 'In attesa' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>{ord.stato_pagamento}</Badge>
                        </div>
                        <div className="divide-y divide-white/5 space-y-2">
                          {ord.articoli.map((art, idx) => (
                            <div key={`user-art-${idx}`} className="pt-2 first:pt-0 flex justify-between items-center text-xs sm:text-sm">
                              <div>
                                <p className="font-bold text-white/90">{art.nome_prodotto} <span className="text-[10px] sm:text-xs text-white/40">({art.taglia})</span></p>
                                <p className="text-[11px] sm:text-xs text-white/60">Destinatario: <span className="text-white">{art.atleta}</span> {art.nome_personalizzato && <span> | Stampa: <span className="text-cyan-400">"{art.nome_personalizzato}"</span></span>}</p>
                              </div>
                              <span className="font-semibold text-white/80 ml-2">€{art.prezzo.toFixed(2)}</span>
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
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="flex flex-row gap-2 border-b border-white/10 pb-3 overflow-x-auto">
              <button onClick={() => setAdminTab('ordini')} className={`px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${adminTab === 'ordini' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg' : 'text-white/50 hover:bg-white/5'}`}>📦 Gestione Ordini</button>
              <button onClick={() => setAdminTab('catalogo')} className={`px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${adminTab === 'catalogo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg' : 'text-white/50 hover:bg-white/5'}`}>👕 Gestione Catalogo</button>
            </div>

            {adminTab === 'ordini' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                  <div className="bg-white/5 border border-white/10 p-2.5 sm:p-4 rounded-xl text-center">
                    <span className="text-[10px] sm:text-xs text-white/40 block font-bold uppercase">In Attesa</span>
                    <span className="text-lg sm:text-2xl font-black text-yellow-400">{statisticheAdmin.inAttesa}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 sm:p-4 rounded-xl text-center">
                    <span className="text-[10px] sm:text-xs text-white/40 block font-bold uppercase">In Lavoro</span>
                    <span className="text-lg sm:text-2xl font-black text-blue-400">{statisticheAdmin.inLavorazione}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 sm:p-4 rounded-xl text-center">
                    <span className="text-[10px] sm:text-xs text-white/40 block font-bold uppercase">Pronti</span>
                    <span className="text-lg sm:text-2xl font-black text-orange-400">{statisticheAdmin.pronti}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2.5 sm:p-4 rounded-xl text-center">
                    <span className="text-[10px] sm:text-xs text-white/40 block font-bold uppercase">Completati</span>
                    <span className="text-lg sm:text-2xl font-black text-green-400">{statisticheAdmin.completati}</span>
                  </div>
                  <div className="bg-white/5 border border-cyan-500/20 p-2.5 sm:p-4 rounded-xl text-center col-span-2 sm:col-span-1 bg-cyan-500/5">
                    <span className="text-[10px] sm:text-xs text-cyan-400 block font-bold uppercase">Totale Incasso</span>
                    <span className="text-base sm:text-xl font-black text-white">€{statisticheAdmin.incassoTotale.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-1">
                    <input 
                      type="text" 
                      value={ricercaAdmin} 
                      onChange={e => setRicercaAdmin(e.target.value)} 
                      placeholder="Cerca atleta, acquirente, ID..." 
                      className="bg-slate-800 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-white/30 flex-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <select 
                      value={filtroStatoAdmin} 
                      onChange={e => setFiltroStatoAdmin(e.target.value)}
                      className="bg-slate-800 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="Tutti">Tutti gli stati</option>
                      <option value="In attesa">In attesa</option>
                      <option value="In lavorazione">In lavorazione</option>
                      <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                      <option value="Completato">Completato</option>
                    </select>
                  </div>
                  <button onClick={esportaCsvAdmin} className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 justify-center">📥 Scarica CSV</button>
                </div>

                <h2 className="text-sm sm:text-xl font-bold text-white/70">Account trovati ({ordiniAdminRaggruppatiPerUtente.length})</h2>
                {ordiniAdminRaggruppatiPerUtente.length === 0 ? (
                  <p className="text-white/50 text-center py-8 bg-white/5 rounded-2xl italic border border-white/5 text-xs sm:text-sm">Nessun ordine trovato.</p>
                ) : (
                  /* --- CICLO SUI GRUPPI UTENTE --- */
                  ordiniAdminRaggruppatiPerUtente.map((gruppo) => (
                    <div key={`gruppo-user-${gruppo.email}`} className="bg-slate-900/60 border border-white/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
                      
                      {/* INTESTAZIONE UTENTE */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-3 gap-2">
                        <div>
                          <span className="text-[10px] sm:text-xs text-cyan-400 font-bold uppercase tracking-wider">Account Cliente</span>
                          <h3 className="text-lg sm:text-2xl font-black text-white">{gruppo.acquirente}</h3>
                          <p className="text-xs text-white/60">{gruppo.email}</p>
                        </div>
                        <Badge className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                          {gruppo.ordini.length} {gruppo.ordini.length === 1 ? 'ordine' : 'ordini'}
                        </Badge>
                      </div>

                      {/* LISTA DEGLI ORDINI CRONOLOGICI DELL'UTENTE */}
                      <div className="space-y-3">
                        {gruppo.ordini.map((ord) => (
                          <div key={`admin-ord-${ord.id}`} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-2.5 mb-2.5 gap-2">
                              <div>
                                <h4 className="text-sm sm:text-lg font-bold text-blue-200">Ordine #{ord.id}</h4>
                              </div>
                              <div className="flex items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
                                <span className="font-black text-sm sm:text-base text-cyan-300">€{ord.totale.toFixed(2)}</span>
                                <select 
                                  value={ord.stato_pagamento} 
                                  onChange={(e) => cambiaStatoOrdineAdmin(ord.id, e.target.value)} 
                                  className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                  <option value="In attesa">In attesa</option>
                                  <option value="In lavorazione">In lavorazione</option>
                                  <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                                  <option value="Completato">Completato</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {ord.articoli.map((art, idx) => (
                                <div key={`admin-art-${idx}`} className="flex justify-between items-center text-xs text-white/80">
                                  <div>
                                    <span className="font-bold text-white">{art.nome_prodotto}</span> <span className="text-white/50">({art.taglia})</span>
                                    <span className="text-white/60 ml-2">Destinatario: <strong className="text-white">{art.atleta}</strong> {art.nome_personalizzato && ` | Stampa: "${art.nome_personalizzato}"`}</span>
                                  </div>
                                  <span className="font-semibold">€{art.prezzo.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* RIEPILOGO TOTALE UTENTE */}
                      <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3.5 flex justify-between items-center mt-2">
                        <span className="text-xs sm:text-sm font-bold text-cyan-200 uppercase tracking-wider">Totale dovuti/pagati da questo account:</span>
                        <span className="text-base sm:text-2xl font-black text-emerald-400">€{gruppo.totaleSpeso.toFixed(2)}</span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

            {adminTab === 'catalogo' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/10">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Aggiungi Nuovo Prodotto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <label className="text-xs text-white/70 mb-1 block">Nome Prodotto</label>
                        <input type="text" value={nuovoProd.nome} onChange={e => setNuovoProd({...nuovoProd, nome: e.target.value})} className="w-full bg-slate-800 border border-white/20 rounded-xl p-2 text-xs sm:text-sm text-white" placeholder="Es. T-Shirt Rappresentanza"/>
                      </div>
                      <div>
                        <label className="text-xs text-cyan-400 font-bold mb-1 block">Immagine Prodotto (PNG / JPG)</label>
                        <input 
                          id="file-upload-input"
                          type="file" 
                          accept="image/*"
                          onChange={e => setSelectedFile(e.target.files[0])}
                          className="w-full bg-slate-800 border border-white/20 rounded-xl p-1.5 text-xs text-white/70 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-300 file:cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/70 mb-1 block">Prezzo (€)</label>
                      <input type="number" step="0.01" value={nuovoProd.prezzo} onChange={e => setNuovoProd({...nuovoProd, prezzo: e.target.value})} className="w-full bg-slate-800 border border-white/20 rounded-xl p-2 text-xs sm:text-sm text-white" placeholder="0.00"/>
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <input type="checkbox" id="pers" checked={nuovoProd.personalizzabile} onChange={e => setNuovoProd({...nuovoProd, personalizzabile: e.target.checked})} className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"/>
                      <label htmlFor="pers" className="text-xs sm:text-sm font-semibold text-white/90 cursor-pointer">Stampa retro</label>
                    </div>
                  </div>
                  <Button onClick={creaProdottoAdmin} className="mt-4 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl px-6 py-2 text-sm shadow-lg">
                    + Salva Prodotto
                  </Button>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Prodotti nel Database ({prodotti.length})</h3>
                  {prodotti.length === 0 ? <p className="text-white/50 text-xs sm:text-sm">Nessun prodotto trovato.</p> : (
                    <div className="space-y-2.5">
                      {prodotti.map(p => (
                        <div key={`cat-prod-${p.id}`} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            {p.immagine_url && (
                              <div className="w-10 h-10 rounded-lg bg-slate-950/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                <img src={p.immagine_url} alt="" className="w-full h-full object-contain" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white text-sm sm:text-base">{p.nome} <span className="text-cyan-300 ml-1">€{p.prezzo.toFixed(2)}</span></p>
                              {p.personalizzabile && <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block border border-amber-500/20">Personalizzabile</span>}
                            </div>
                          </div>
                          <button onClick={() => eliminaProdottoAdmin(p.id)} className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Elimina</button>
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