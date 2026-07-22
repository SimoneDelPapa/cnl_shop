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
  const [colorePers, setColorePers] = useState('NESSUN COLORE DA SELEZIONARE');
  const [numeroPers, setNumeroPers] = useState('');

  const haPersonalizzazioni = prodotto.personalizzabile_nome || prodotto.personalizzabile_numero || prodotto.personalizzabile_colore;

  const handleAdd = () => {
    if (!atleta.trim()) {
      alert("Attenzione: Inserisci il nome dell'atleta a cui è destinato il capo.");
      return;
    }
    
    const safeUUID = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
    
    // Evitiamo di salvare "NESSUN COLORE DA SELEZIONARE" come vero e proprio colore se è la scelta attiva
    const coloreScelto = colorePers === 'NESSUN COLORE DA SELEZIONARE' ? null : colorePers;

    onAggiungi({
      idUnivoco: safeUUID, 
      prodottoId: prodotto.id,
      nomeProdotto: prodotto.nome,
      prezzo: prodotto.prezzo,
      atleta: atleta.trim(),
      taglia: taglia,
      nomePersonalizzato: prodotto.personalizzabile_nome ? nomePers.trim() : null,
      colorePersonalizzato: prodotto.personalizzabile_colore ? coloreScelto : null,
      numeroPersonalizzato: prodotto.personalizzabile_numero ? numeroPers.trim() : null
    });
    
    setAtleta('');
    setNomePers('');
    setNumeroPers('');
    setColorePers('NESSUN COLORE DA SELEZIONARE');
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
        
        {haPersonalizzazioni ? (
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

            {haPersonalizzazioni && (
              <div className="space-y-2 border-t border-white/10 pt-2">
                {prodotto.personalizzabile_colore && (
                  <div>
                    <label className="text-xs text-white/70 font-semibold mb-1 block">Colore Capo</label>
                    <select 
                      value={colorePers} onChange={e => setColorePers(e.target.value)}
                      className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-slate-900 appearance-none font-bold"
                    >
                      <option value="NESSUN COLORE DA SELEZIONARE">NESSUN COLORE DA SELEZIONARE</option>
                      <option value="BIANCO">BIANCO</option>
                      <option value="ROSSO">ROSSO</option>
                      <option value="NERO">NERO</option>
                    </select>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  {prodotto.personalizzabile_nome && (
                    <div className={!prodotto.personalizzabile_numero ? "col-span-2" : ""}>
                      <label className="text-xs text-white/70 font-semibold mb-1 block">Nome Stampa</label>
                      <input 
                        type="text" value={nomePers} onChange={e => setNomePers(e.target.value.toUpperCase())} placeholder="Es. GIULIA"
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                      />
                    </div>
                  )}
                  {prodotto.personalizzabile_numero && (
                    <div className={!prodotto.personalizzabile_nome ? "col-span-2" : ""}>
                      <label className="text-xs text-white/70 font-semibold mb-1 block">Numero Stampa</label>
                      <input 
                        type="text" value={numeroPers} onChange={e => setNumeroPers(e.target.value)} placeholder="Es. 10"
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                      />
                    </div>
                  )}
                </div>
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
  const [nuovoProd, setNuovoProd] = useState({ 
    nome: '', 
    prezzo: '', 
    personalizzabile_nome: false,
    personalizzabile_numero: false,
    personalizzabile_colore: false
  });
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
      const token = sessionStorage.getItem('token');
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
        } catch (error) { sessionStorage.removeItem('token'); }
      }
      await caricaProdotti();
    };
    initApp();
  }, [caricaProdotti, caricaOrdiniUtente, caricaOrdiniGlobaliAdmin]);

  const creaProdottoAdmin = useCallback(async () => {
    if (!nuovoProd.nome.trim() || !nuovoProd.prezzo) return alert("Inserisci nome e prezzo del prodotto");
    const token = sessionStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('nome', nuovoProd.nome);
    formData.append('prezzo', parseFloat(nuovoProd.prezzo) || 0);
    formData.append('personalizzabile_nome', nuovoProd.personalizzabile_nome);
    formData.append('personalizzabile_numero', nuovoProd.personalizzabile_numero);
    formData.append('personalizzabile_colore', nuovoProd.personalizzabile_colore);

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
        setNuovoProd({ 
          nome: '', 
          prezzo: '', 
          personalizzabile_nome: false,
          personalizzabile_numero: false,
          personalizzabile_colore: false
        });
        setSelectedFile(null);
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) fileInput.value = '';
        await caricaProdotti();
      }
    } catch (err) { alert("Errore creazione prodotto"); }
  }, [nuovoProd, selectedFile, caricaProdotti]);

  const eliminaProdottoAdmin = useCallback(async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo prodotto dal catalogo?")) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`https://cnl-shop-backend.onrender.com/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) await caricaProdotti();
    } catch (err) { alert("Errore eliminazione prodotto"); }
  }, [caricaProdotti]);

  const aggiornaOrdineAdmin = useCallback(async (ordineId, datiAggiornati) => {
    const token = sessionStorage.getItem('token');
    try {
      const response = await fetch(`https://cnl-shop-backend.onrender.com/api/admin/orders/${ordineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(datiAggiornati)
      });
      if (response.ok) await caricaOrdiniGlobaliAdmin(token);
    } catch (err) { console.error(err); }
  }, [caricaOrdiniGlobaliAdmin]);

  const esportaCsvAdmin = useCallback(async () => {
    const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token'); 
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
    sessionStorage.removeItem('token');
    setUtenteLoggato(null); setOrdiniUtente([]); setTuttiGliOrdiniAdmin([]); setViewAdmin(false);
  }, []);

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
            totaleDovuto: 0,
            totalePagato: 0
          });
        }
        
        const gruppo = gruppiMap.get(chiaveUtente);
        gruppo.ordini.push(ord);

        if (ord.pagato) {
          gruppo.totalePagato += ord.totale;
        } else {
          gruppo.totaleDovuto += ord.totale;
        }
      }
    });

    return Array.from(gruppiMap.values()).sort((a, b) => {
      const maxIdA = Math.max(...a.ordini.map(o => o.id));
      const maxIdB = Math.max(...b.ordini.map(o => o.id));
      return maxIdB - maxIdA;
    });
  }, [tuttiGliOrdiniAdmin, ricercaAdmin, filtroStatoAdmin]);

  // --- STATISTICHE ADMIN (INCLUSO FONDO PALLANUOTO LUCCA) ---
  const statisticheAdmin = useMemo(() => {
    const stats = { 
      inLavorazione: 0, 
      pronti: 0, 
      completati: 0, 
      incassoTotale: 0, 
      incassoVerificato: 0,
      totaleArticoliVenduti: 0 
    };

    tuttiGliOrdiniAdmin.forEach(o => {
      if (o.stato_pagamento === 'In lavorazione') stats.inLavorazione++;
      if (o.stato_pagamento === 'Pronto per il ritiro') stats.pronti++;
      if (o.stato_pagamento === 'Completato') stats.completati++;
      
      stats.incassoTotale += o.totale;
      
      // Contiamo articoli e incasso solo se PAGATO
      if (o.pagato) {
        stats.incassoVerificato += o.totale;
        if (o.articoli) {
          stats.totaleArticoliVenduti += o.articoli.length;
        }
      }
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
          const t = sessionStorage.getItem('token');
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
            Accesso come <strong className="text-white">{utenteLoggato.nome} {utenteLoggato.cognome}</strong>
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
                        {(item.colorePersonalizzato || item.nomePersonalizzato || item.numeroPersonalizzato) && (
                          <p className="text-xs sm:text-sm text-cyan-300 mt-0.5">
                            {item.colorePersonalizzato && <span>Colore: <span className="font-bold">{item.colorePersonalizzato}</span> </span>}
                            {item.nomePersonalizzato && <span>| Nome: "{item.nomePersonalizzato}" </span>}
                            {item.numeroPersonalizzato && <span>| N° {item.numeroPersonalizzato}</span>}
                          </p>
                        )}
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
                          <Badge className={`px-2.5 py-0.5 text-[10px] sm:text-xs rounded-full border ${ord.stato_pagamento === 'Completato' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>{ord.stato_pagamento}</Badge>
                        </div>
                        <div className="divide-y divide-white/5 space-y-2">
                          {ord.articoli.map((art, idx) => (
                            <div key={`user-art-${idx}`} className="pt-2 first:pt-0 flex justify-between items-center text-xs sm:text-sm">
                              <div>
                                <p className="font-bold text-white/90">{art.nome_prodotto} <span className="text-[10px] sm:text-xs text-white/40">({art.taglia})</span></p>
                                <p className="text-[11px] sm:text-xs text-white/60">
                                  Destinatario: <span className="text-white">{art.atleta}</span> 
                                  {art.colore_personalizzato && <span> | Colore: <span className="text-cyan-400">{art.colore_personalizzato}</span></span>}
                                  {art.nome_personalizzato && <span> | Stampa: <span className="text-cyan-400">"{art.nome_personalizzato}"</span></span>}
                                  {art.numero_personalizzato && <span> | N°: <span className="text-cyan-400">{art.numero_personalizzato}</span></span>}
                                </p>
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
                
                {/* RIGHI DELLE STATISTICHE ADMIN */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                  <div className="bg-white/5 border border-white/10 p-2.5 sm:p-4 rounded-xl text-center">
                    <span className="text-[10px] sm:text-xs text-white/40 block font-bold uppercase">In Lavorazione</span>
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
                  <div className="bg-white/5 border border-emerald-500/20 p-2.5 sm:p-4 rounded-xl text-center bg-emerald-500/5">
                    <span className="text-[10px] sm:text-xs text-emerald-400 block font-bold uppercase">Verificato Paypal</span>
                    <span className="text-base sm:text-xl font-black text-white">€{statisticheAdmin.incassoVerificato.toFixed(2)}</span>
                  </div>

                  {/* CASSETA STATISTICA FONDO PALLANUOTO LUCCA */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 sm:p-4 rounded-xl text-center col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 shadow-lg">
                    <span className="text-[10px] sm:text-xs text-emerald-300 block font-black uppercase tracking-wider">Fondo PN Lucca</span>
                    <span className="text-base sm:text-xl font-black text-emerald-400">€{statisticheAdmin.totaleArticoliVenduti.toFixed(2)}</span>
                    <span className="text-[9px] text-emerald-200/60 block font-semibold">1€ x {statisticheAdmin.totaleArticoliVenduti} capi pagati</span>
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

                      {/* LISTA ORDINI DELL'UTENTE */}
                      <div className="space-y-3">
                        {gruppo.ordini.map((ord) => (
                          <div key={`admin-ord-${ord.id}`} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-2.5 mb-2.5 gap-2">
                              <div>
                                <h4 className="text-sm sm:text-lg font-bold text-blue-200">Ordine #{ord.id}</h4>
                              </div>
                              <div className="flex items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
                                
                                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/10 hover:border-emerald-500/50 transition-colors">
                                  <input 
                                    type="checkbox" 
                                    checked={ord.pagato} 
                                    onChange={(e) => aggiornaOrdineAdmin(ord.id, { pagato: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                  />
                                  <span className={`text-xs font-bold ${ord.pagato ? 'text-emerald-400' : 'text-white/50'}`}>
                                    {ord.pagato ? '✓ Pagato PayPal' : 'Non Pagato'}
                                  </span>
                                </label>

                                <span className="font-black text-sm sm:text-base text-cyan-300">€{ord.totale.toFixed(2)}</span>
                                
                                <select 
                                  value={ord.stato_pagamento} 
                                  onChange={(e) => aggiornaOrdineAdmin(ord.id, { stato_pagamento: e.target.value })} 
                                  className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
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
                                    <span className="text-white/60 ml-2">
                                      Atleta: <strong className="text-white">{art.atleta}</strong> 
                                      {art.colore_personalizzato && ` | Colore: ${art.colore_personalizzato}`}
                                      {art.nome_personalizzato && ` | Nome: "${art.nome_personalizzato}"`}
                                      {art.numero_personalizzato && ` | N° ${art.numero_personalizzato}`}
                                    </span>
                                  </div>
                                  <span className="font-semibold">€{art.prezzo.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* RIEPILOGO TOTALE DOVUTO E TOTALE PAGATO */}
                      <div className="bg-slate-950/60 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-center gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Riepilogo Account:</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-[11px] text-amber-300/80 block uppercase font-bold">Totale Dovuto</span>
                            <span className="text-sm sm:text-lg font-black text-amber-400">€{gruppo.totaleDovuto.toFixed(2)}</span>
                          </div>
                          <div className="border-l border-white/10 pl-6">
                            <span className="text-[11px] text-emerald-300/80 block uppercase font-bold">Totale Pagato</span>
                            <span className="text-sm sm:text-lg font-black text-emerald-400">€{gruppo.totalePagato.toFixed(2)}</span>
                          </div>
                        </div>
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

                    {/* SELEZIONE INDIVIDUALE PERSONALIZZAZIONI */}
                    <div className="space-y-1.5 py-1 bg-slate-800/60 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[11px] font-bold text-cyan-300 block mb-1">Personalizzazioni Abilitate:</span>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="pers_nome" 
                          checked={nuovoProd.personalizzabile_nome} 
                          onChange={e => setNuovoProd({...nuovoProd, personalizzabile_nome: e.target.checked})} 
                          className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                        />
                        <label htmlFor="pers_nome" className="text-xs font-semibold text-white/90 cursor-pointer">Stampa Nome</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="pers_numero" 
                          checked={nuovoProd.personalizzabile_numero} 
                          onChange={e => setNuovoProd({...nuovoProd, personalizzabile_numero: e.target.checked})} 
                          className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                        />
                        <label htmlFor="pers_numero" className="text-xs font-semibold text-white/90 cursor-pointer">Stampa Numero</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="pers_colore" 
                          checked={nuovoProd.personalizzabile_colore} 
                          onChange={e => setNuovoProd({...nuovoProd, personalizzabile_colore: e.target.checked})} 
                          className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                        />
                        <label htmlFor="pers_colore" className="text-xs font-semibold text-white/90 cursor-pointer">Selezione Colore</label>
                      </div>
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
                      {prodotti.map(p => {
                        const opt = [];
                        if (p.personalizzabile_nome) opt.push("Nome");
                        if (p.personalizzabile_numero) opt.push("Numero");
                        if (p.personalizzabile_colore) opt.push("Colore");

                        return (
                          <div key={`cat-prod-${p.id}`} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              {p.immagine_url && (
                                <div className="w-10 h-10 rounded-lg bg-slate-950/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                  <img src={p.immagine_url} alt="" className="w-full h-full object-contain" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-sm sm:text-base">{p.nome} <span className="text-cyan-300 ml-1">€{p.prezzo.toFixed(2)}</span></p>
                                {opt.length > 0 ? (
                                  <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block border border-amber-500/20">
                                    Attivi: {opt.join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-white/40 italic">Nessuna personalizzazione</span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => eliminaProdottoAdmin(p.id)} className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Elimina</button>
                          </div>
                        );
                      })}
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