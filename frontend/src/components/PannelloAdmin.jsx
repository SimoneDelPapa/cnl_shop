import { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faFileExcel, 
  faPenToSquare, 
  faBan, 
  faTrashCan, 
  faCamera, 
  faXmark, 
  faCheck, 
  faEye, 
  faEyeSlash, 
  faClock, 
  faBell, 
  faChevronDown, 
  faChevronUp, 
  faMagnifyingGlass, 
  faCoins, 
  faBoxesPacking, 
  faLayerGroup, 
  faUser, 
  faStore, 
  faCircleCheck, 
  faShirt, 
  faLock, 
  faSignature, 
  faHashtag, 
  faPalette 
} from '@fortawesome/free-solid-svg-icons';

export default function PannelloAdmin({
  adminTab = 'ordini',
  statistiche = {
    inAttesa: 0,
    inLavorazione: 0,
    pronti: 0,
    completati: 0,
    incassoTotale: 0,
    incassoVerificato: 0,
    totaleArticoliVenduti: 0
  },
  ricerca = '',
  onSetRicerca,
  filtroStato = 'Tutti',
  onSetFiltroStato,
  ordiniRaggruppati = [],
  tuttiGliOrdini = [],
  ordiniInAttesaCount,
  invioProduzioneInCorso,
  onInviaProduzione,
  onImpostaProntiRitiro,
  onEsportaCsv,
  onAggiornaOrdine,
  onToggleCompletatoArticolo,
  onApriModificaOrdine,
  onAnnullaOrdine,
  nuovoProd,
  onSetNuovoProd,
  fileInputRef,
  anteprimaImmagine,
  fileImmagine,
  onFileChange,
  onRimuoviFile,
  uploadingImage,
  onCreaProdotto,
  prodotti,
  onEliminaProdotto,
  onModificaProdotto,
  onToggleVisibilitaProdotto,
  onInviaSollecitoMassivo,
  onInviaSollecitoSingolo,
  settoreUtente = 'pallanuoto',
  categorieSettore = [],
  onZoomFoto
}) {
  const isNuoto = settoreUtente === 'nuoto';

  const [prodottoInModifica, setProdottoInModifica] = useState(null);
  const [utentiEspansi, setUtentiEspansi] = useState(() => new Set());
  const [mostraAnteprimaCatalogo, setMostraAnteprimaCatalogo] = useState(false);

  // STATI ACCORDION CATEGORIE ANNIDATE
  const [categorieEspanse, setCategorieEspanse] = useState(() => new Set());
  const [profiliCategoriaEspansi, setProfiliCategoriaEspansi] = useState(() => new Set());
  const [ricercaCategorie, setRicercaCategorie] = useState('');

  const [modalSelezione, setModalSelezione] = useState(null);
  const [tipologieSelezionate, setTipologieSelezionate] = useState(() => new Set());

  // SCROLL LOCK PER I MODALI INTERNI DEL PANNELLO ADMIN
  useEffect(() => {
    const isQualsiasiModalAperto = Boolean(
      modalSelezione || prodottoInModifica || mostraAnteprimaCatalogo
    );

    if (isQualsiasiModalAperto) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        const top = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (top) window.scrollTo(0, parseInt(top || '0', 10) * -1);
      };
    }
  }, [modalSelezione, prodottoInModifica, mostraAnteprimaCatalogo]);

  const ordiniInLavorazioneCount = useMemo(() => {
    return (tuttiGliOrdini || []).filter(o => o.stato_pagamento === "In lavorazione").length;
  }, [tuttiGliOrdini]);

  const tipologieArticoliInAttesa = useMemo(() => {
    const map = new Map();
    (tuttiGliOrdini || [])
      .filter(o => o.stato_pagamento === "In attesa")
      .forEach(ord => {
        const nomeTip = (ord.nomeProdotto || (ord.articoli && ord.articoli[0]?.nomeProdotto) || "Articolo").trim();
        if (!map.has(nomeTip)) {
          map.set(nomeTip, {
            nome: nomeTip,
            immagine_url: ord.immagine_url || (ord.articoli && ord.articoli[0]?.immagine_url) || null,
            ordini: []
          });
        }
        map.get(nomeTip).ordini.push(ord);
      });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }, [tuttiGliOrdini]);

  const tipologieArticoliInLavorazione = useMemo(() => {
    const map = new Map();
    (tuttiGliOrdini || [])
      .filter(o => o.stato_pagamento === "In lavorazione")
      .forEach(ord => {
        const nomeTip = (ord.nomeProdotto || (ord.articoli && ord.articoli[0]?.nomeProdotto) || "Articolo").trim();
        if (!map.has(nomeTip)) {
          map.set(nomeTip, {
            nome: nomeTip,
            immagine_url: ord.immagine_url || (ord.articoli && ord.articoli[0]?.immagine_url) || null,
            ordini: []
          });
        }
        map.get(nomeTip).ordini.push(ord);
      });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }, [tuttiGliOrdini]);

  const tipologieAttiveModal = modalSelezione === 'lavorazione' ? tipologieArticoliInAttesa : tipologieArticoliInLavorazione;

  const apriModalSelezione = (tipo) => {
    setModalSelezione(tipo);
    const targetList = tipo === 'lavorazione' ? tipologieArticoliInAttesa : tipologieArticoliInLavorazione;
    setTipologieSelezionate(new Set(targetList.map(t => t.nome)));
  };

  const toggleTipologia = (nomeTipologia) => {
    setTipologieSelezionate(prev => {
      const nuovo = new Set(prev);
      if (nuovo.has(nomeTipologia)) nuovo.delete(nomeTipologia);
      else nuovo.add(nomeTipologia);
      return nuovo;
    });
  };

  const toggleTutteTipologie = () => {
    if (tipologieSelezionate.size === tipologieAttiveModal.length) {
      setTipologieSelezionate(new Set());
    } else {
      setTipologieSelezionate(new Set(tipologieAttiveModal.map(t => t.nome)));
    }
  };

  const confermaAzioneModal = () => {
    const ordiniScelti = [];
    tipologieAttiveModal.forEach(tip => {
      if (tipologieSelezionate.has(tip.nome)) {
        ordiniScelti.push(...tip.ordini);
      }
    });

    if (modalSelezione === 'lavorazione') {
      onInviaProduzione(ordiniScelti);
    } else if (modalSelezione === 'pronto_ritiro' && onImpostaProntiRitiro) {
      onImpostaProntiRitiro(ordiniScelti);
    }
    setModalSelezione(null);
  };

  const toggleEspandiUtente = (email) => {
    setUtentiEspansi(prev => {
      const nuovoSet = new Set(prev);
      if (nuovoSet.has(email)) nuovoSet.delete(email);
      else nuovoSet.add(email);
      return nuovoSet;
    });
  };

  const tuttiEspansi = ordiniRaggruppati.length > 0 && utentiEspansi.size === ordiniRaggruppati.length;
  const toggleTuttiOrdini = () => {
    if (tuttiEspansi) {
      setUtentiEspansi(new Set());
    } else {
      setUtentiEspansi(new Set(ordiniRaggruppati.map(g => g.email)));
    }
  };

  const toggleCategoriaEspansa = (cat) => {
    setCategorieEspanse(prev => {
      const nuovo = new Set(prev);
      if (nuovo.has(cat)) nuovo.delete(cat);
      else nuovo.add(cat);
      return nuovo;
    });
  };

  const toggleProfiloCategoria = (chiaveProfilo) => {
    setProfiliCategoriaEspansi(prev => {
      const nuovo = new Set(prev);
      if (nuovo.has(chiaveProfilo)) nuovo.delete(chiaveProfilo);
      else nuovo.add(chiaveProfilo);
      return nuovo;
    });
  };

  const salvaModificheArticolo = (e) => {
    e.preventDefault();
    if (!prodottoInModifica.nome.trim() || !prodottoInModifica.prezzo) {
      alert("Nome e prezzo sono obbligatori.");
      return;
    }
    onModificaProdotto(prodottoInModifica.id, {
      nome: prodottoInModifica.nome.trim(),
      prezzo: parseFloat(prodottoInModifica.prezzo) || 0,
      immagine_url: prodottoInModifica.immagine_url || null,
      taglia_unica: Boolean(prodottoInModifica.taglia_unica),
      personalizzabile_nome: Boolean(prodottoInModifica.personalizzabile_nome),
      personalizzabile_numero: isNuoto ? false : Boolean(prodottoInModifica.personalizzabile_numero),
      personalizzabile_colore: isNuoto ? false : Boolean(prodottoInModifica.personalizzabile_colore)
    });
    setProdottoInModifica(null);
  };

  const formattaData = (timestamp) => {
    if (!timestamp) return "Recente";
    try {
      let date;
      if (typeof timestamp.toDate === 'function') date = timestamp.toDate();
      else if (timestamp instanceof Date) date = timestamp;
      else if (typeof timestamp === 'number' || typeof timestamp === 'string') date = new Date(timestamp);
      else if (timestamp.seconds !== undefined) date = new Date(timestamp.seconds * 1000);
      else return "Recente";

      if (isNaN(date.getTime())) return "Recente";

      return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return "Recente";
    }
  };

  const morosiCount = useMemo(() => {
    return ordiniRaggruppati.filter(g => g.totaleDovuto > 0).length;
  }, [ordiniRaggruppati]);

  const datiCategorie = useMemo(() => {
    const categorieMap = new Map();
    const fallbackList = settoreUtente === 'nuoto' 
      ? ["Categoria", "Esordienti A", "Esordienti B", "Esordienti C", "Propaganda Grandi", "Propaganda Esordienti", "Extra"]
      : ["Maschile", "Femminile", "U18", "U16", "U14", "U12", "Baby", "Extra"];
      
    const CATEGORIE_ORDINE = categorieSettore && categorieSettore.length > 0 ? categorieSettore : fallbackList;
    const categoriaDefault = settoreUtente === 'nuoto' ? "Categoria" : "Extra";
    const term = ricercaCategorie.toLowerCase().trim();

    ordiniRaggruppati.forEach(gruppo => {
      gruppo.ordini.forEach(ord => {
        const articoli = ord.articoli && ord.articoli.length > 0 ? ord.articoli : [ord];
        
        articoli.forEach(art => {
          let cat = (art.categoria || "").trim();
          if (!cat || cat.toLowerCase().includes("non specificata") || cat.toLowerCase().includes("non definita")) {
            cat = categoriaDefault;
          }

          const nomeProfilo = (art.atleta || "Profilo").trim();
          const nomeCapo = (art.nomeProdotto || "").toLowerCase();
          const nomeAtlStr = nomeProfilo.toLowerCase();
          const acquirenteStr = (gruppo.acquirente || "").toLowerCase();
          const catStr = cat.toLowerCase();

          const matchRicerca = !term || 
            nomeAtlStr.includes(term) || 
            nomeCapo.includes(term) || 
            acquirenteStr.includes(term) || 
            catStr.includes(term);

          if (!matchRicerca) return;

          if (!categorieMap.has(cat)) categorieMap.set(cat, new Map());
          const profiliMap = categorieMap.get(cat);
          
          if (!profiliMap.has(nomeProfilo)) {
            profiliMap.set(nomeProfilo, {
              nomeCompleto: nomeProfilo,
              acquirente: gruppo.acquirente,
              email: gruppo.email,
              articoli: []
            });
          }

          const statoReale = ord.stato_pagamento || "In attesa";
          const isConsegnato = statoReale === "Completato" || Boolean(art.completato) || Boolean(ord.completato);

          profiliMap.get(nomeProfilo).articoli.push({
            ...art,
            idOrdine: ord.id,
            idUnivoco: art.idUnivoco || ord.id,
            statoOrdine: statoReale,
            completato: isConsegnato,
            pagato: Boolean(ord.pagato),
            dataCreazione: ord.creato_il
          });
        });
      });
    });

    const listaOrdinata = [...CATEGORIE_ORDINE];
    Array.from(categorieMap.keys()).forEach(k => {
      if (!listaOrdinata.includes(k)) listaOrdinata.push(k);
    });

    return listaOrdinata
      .filter(cat => categorieMap.has(cat))
      .map(cat => {
        const profiliList = Array.from(categorieMap.get(cat).values());
        profiliList.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'it'));

        return {
          categoria: cat,
          profili: profiliList,
          totaleCapi: profiliList.reduce((acc, p) => acc + p.articoli.length, 0),
          totaleConsegnati: profiliList.reduce((acc, p) => acc + p.articoli.filter(a => a.completato).length, 0)
        };
      });
  }, [ordiniRaggruppati, categorieSettore, settoreUtente, ricercaCategorie]);

  const tutteCategorieEspanse = datiCategorie.length > 0 && categorieEspanse.size === datiCategorie.length;
  const toggleTutteCategorie = () => {
    if (tutteCategorieEspanse) {
      setCategorieEspanse(new Set());
    } else {
      setCategorieEspanse(new Set(datiCategorie.map(d => d.categoria)));
    }
  };

  const prodottiVisibiliUtente = useMemo(() => {
    return prodotti.filter(p => p.attivo !== false);
  }, [prodotti]);

  const pezziTotaliTipologieSelezionate = useMemo(() => {
    let tot = 0;
    tipologieAttiveModal.forEach(tip => {
      if (tipologieSelezionate.has(tip.nome)) {
        tot += tip.ordini.length;
      }
    });
    return tot;
  }, [tipologieAttiveModal, tipologieSelezionate]);

  return (
    <div className="space-y-6">

      {/* ========================================================
          TAB 1: GESTIONE ORDINI
         ======================================================== */}
      {adminTab === 'ordini' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">In Attesa</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              </div>
              <div className="my-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{statistiche.inAttesa}</span>
                <span className="text-xs font-bold text-slate-400">clienti</span>
              </div>
              <span className="text-xs font-bold text-slate-500">Da approvare</span>
            </div>

            <div className="bg-white border border-blue-200 bg-blue-50/20 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#002b80]">Lavorazione</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#002b80] animate-pulse"></span>
              </div>
              <div className="my-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#002b80] tabular-nums">{statistiche.inLavorazione}</span>
                <span className="text-xs font-bold text-blue-900/60">clienti</span>
              </div>
              <span className="text-xs font-bold text-blue-700">In produzione</span>
            </div>

            <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">Pronti Ritiro</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <div className="my-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-amber-900 tabular-nums">{statistiche.pronti}</span>
                <span className="text-xs font-bold text-amber-700/60">clienti</span>
              </div>
              <span className="text-xs font-bold text-amber-800">Da consegnare</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Saldato</span>
                <FontAwesomeIcon icon={faCoins} className="text-emerald-600 text-sm" />
              </div>
              <div className="my-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                  €{Number(statistiche?.incassoVerificato || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-xs font-black text-emerald-700">Incasso confermato</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Capi Pagati</span>
                <FontAwesomeIcon icon={faBoxesPacking} className="text-slate-400 text-sm" />
              </div>
              <div className="my-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-800 tabular-nums">{statistiche.totaleArticoliVenduti}</span>
                <span className="text-xs font-bold text-slate-400">pezzi</span>
              </div>
              <span className="text-xs font-bold text-slate-500 truncate">
                Fondo: €{(Number(statistiche.totaleArticoliVenduti || 0) * 2).toFixed(2)}
              </span>
            </div>
          </div>

          {/* BARRA COMANDI, FILTRI & 4 PULSANTI ICONA */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
            
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input 
                  type="text" 
                  value={ricerca} 
                  onChange={e => onSetRicerca(e.target.value)} 
                  placeholder="Cerca per cliente, profilo, email..." 
                  className="h-12 w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-10 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#002b80] focus:ring-2 focus:ring-[#002b80]/15 transition-all"
                />
                {ricerca && (
                  <button
                    type="button"
                    onClick={() => onSetRicerca('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>

              <select 
                value={filtroStato} 
                onChange={e => onSetFiltroStato(e.target.value)} 
                className="h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-black text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
              >
                <option value="Tutti">Tutti gli stati</option>
                <option value="In attesa">In attesa</option>
                <option value="In lavorazione">In lavorazione</option>
                <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                <option value="Completato">Completato</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 shrink-0">
              
              <button 
                type="button"
                onClick={() => apriModalSelezione('lavorazione')}
                disabled={ordiniInAttesaCount === 0 || invioProduzioneInCorso}
                className="group h-12 w-12 hover:w-44 bg-[#002b80] hover:bg-[#002060] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-2xl transition-all duration-300 ease-in-out shadow-xs flex items-center overflow-hidden cursor-pointer shrink-0 disabled:cursor-not-allowed"
                title="Manda in lavorazione per tipologia"
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
                </div>
                <span className="max-w-0 group-hover:max-w-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 pr-0 group-hover:pr-4 overflow-hidden text-xs sm:text-sm font-black">
                  Lavorazione {ordiniInAttesaCount > 0 && `(${ordiniInAttesaCount})`}
                </span>
              </button>

              <button 
                type="button"
                onClick={() => apriModalSelezione('pronto_ritiro')}
                disabled={ordiniInLavorazioneCount === 0}
                className="group h-12 w-12 hover:w-44 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-2xl transition-all duration-300 ease-in-out shadow-xs flex items-center overflow-hidden cursor-pointer shrink-0 disabled:cursor-not-allowed"
                title="Pronto per il ritiro per tipologia"
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faBoxesPacking} className="text-sm" />
                </div>
                <span className="max-w-0 group-hover:max-w-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 pr-0 group-hover:pr-4 overflow-hidden text-xs sm:text-sm font-black">
                  Pronti Ritiro {ordiniInLavorazioneCount > 0 && `(${ordiniInLavorazioneCount})`}
                </span>
              </button>

              <button 
                type="button"
                onClick={onInviaSollecitoMassivo}
                disabled={morosiCount === 0}
                className="group h-12 w-12 hover:w-36 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-2xl transition-all duration-300 ease-in-out shadow-xs flex items-center overflow-hidden cursor-pointer shrink-0 disabled:cursor-not-allowed"
                title="Sollecita Pagamento a tutti"
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faBell} className="text-sm" />
                </div>
                <span className="max-w-0 group-hover:max-w-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 pr-0 group-hover:pr-4 overflow-hidden text-xs sm:text-sm font-black">
                  Sollecita {morosiCount > 0 && `(${morosiCount})`}
                </span>
              </button>

              <button 
                type="button"
                onClick={onEsportaCsv} 
                className="group h-12 w-12 hover:w-36 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all duration-300 ease-in-out shadow-xs flex items-center overflow-hidden cursor-pointer shrink-0"
                title="Esporta XLSX"
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faFileExcel} className="text-sm" />
                </div>
                <span className="max-w-0 group-hover:max-w-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 pr-0 group-hover:pr-4 overflow-hidden text-xs sm:text-sm font-black">
                  Excel
                </span>
              </button>

            </div>
          </div>

          {/* CONTATORE CLIENTI & ESPANSIONE */}
          {ordiniRaggruppati.length > 0 && (
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-2 font-bold">
              <span>{ordiniRaggruppati.length} {ordiniRaggruppati.length === 1 ? 'account cliente registrato' : 'account clienti registrati'}</span>
              <button 
                type="button" 
                onClick={toggleTuttiOrdini} 
                className="font-black text-[#002b80] hover:underline cursor-pointer"
              >
                {tuttiEspansi ? "Comprimi tutte le schede" : "Espandi tutte le schede"}
              </button>
            </div>
          )}

          {/* LISTA ACCOUNT CLIENTI */}
          <div className="space-y-4">
            {ordiniRaggruppati.length === 0 ? (
              <div className="p-16 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs">
                <p className="text-sm font-bold text-slate-400 italic">Nessun ordine corrispondente ai criteri di ricerca.</p>
              </div>
            ) : (
              ordiniRaggruppati.map((gruppo) => {
                const isEspanso = utentiEspansi.has(gruppo.email);
                const haDebito = gruppo.totaleDovuto > 0;
                
                const capiPerAtletaCliente = new Map();
                gruppo.ordini.forEach(ord => {
                  const listaCapi = ord.articoli && ord.articoli.length > 0 ? ord.articoli : [ord];
                  listaCapi.forEach(capo => {
                    const nomeAtl = (capo.atleta || ord.atleta || "Profilo").trim();
                    if (!capiPerAtletaCliente.has(nomeAtl)) capiPerAtletaCliente.set(nomeAtl, []);
                    capiPerAtletaCliente.get(nomeAtl).push({ 
                      ...capo, 
                      ordinePadreId: ord.id, 
                      ordinePadreStato: ord.stato_pagamento, 
                      ordinePadrePagato: ord.pagato, 
                      dataCreazione: ord.creato_il,
                      utenteIdPadre: ord.utente_id
                    });
                  });
                });

                return (
                  <div 
                    key={`gruppo-user-${gruppo.email}`} 
                    className={`bg-white border rounded-3xl transition-all overflow-hidden ${
                      isEspanso 
                        ? 'border-slate-300 shadow-md ring-1 ring-slate-200' 
                        : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div 
                      onClick={() => toggleEspandiUtente(gruppo.email)}
                      className={`p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                        isEspanso ? 'bg-slate-50/70 border-b border-slate-200/80' : 'hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                          isEspanso ? 'bg-[#002b80] text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <FontAwesomeIcon icon={isEspanso ? faChevronUp : faChevronDown} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                              {gruppo.acquirente}
                            </h3>
                            <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                              {gruppo.ordini.length} {gruppo.ordini.length === 1 ? 'capo' : 'capi'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-400 mt-1 truncate">{gruppo.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {haDebito ? (
                          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl text-right">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">Da Saldare</span>
                            <span className="text-base sm:text-lg font-black text-amber-950 tabular-nums">
                              €{gruppo.totaleDovuto.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-right">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block">Stato</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-800">Tutto Saldato</span>
                          </div>
                        )}

                        <div className="text-right px-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Incassato</span>
                          <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                            €{gruppo.totalePagato.toFixed(2)}
                          </span>
                        </div>

                        {haDebito && onInviaSollecitoSingolo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInviaSollecitoSingolo(gruppo);
                            }}
                            className="h-10 px-3.5 text-xs font-black bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
                            title="Invia email di sollecito e aggiorna notifica in-app"
                          >
                            <FontAwesomeIcon icon={faBell} className="text-xs" />
                            <span className="hidden sm:inline">Sollecita</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isEspanso && (
                      <div className="p-5 sm:p-7 space-y-6 bg-white animate-in slide-in-from-top-1 duration-150">
                        {Array.from(capiPerAtletaCliente.entries()).map(([nomeAtleta, listaCapi]) => (
                          <div key={`atleta-panel-${nomeAtleta}`} className="space-y-3.5">
                            
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#002b80] flex items-center justify-center text-xs font-bold">
                                <FontAwesomeIcon icon={faUser} />
                              </div>
                              <h4 className="text-sm font-black text-slate-800">{nomeAtleta}</h4>
                              <span className="text-xs font-bold text-slate-400 ml-auto">
                                {listaCapi.length} {listaCapi.length === 1 ? 'capo' : 'capi'}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {listaCapi.map((capo, cIdx) => {
                                const idOrd = capo.ordinePadreId;
                                const isPagato = capo.ordinePadrePagato === true;
                                const statoOrd = capo.ordinePadreStato || "In attesa";

                                return (
                                  <div 
                                    key={`capo-card-${cIdx}`}
                                    className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
                                  >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                      {capo.immagine_url ? (
                                        <div 
                                          onClick={() => onZoomFoto && onZoomFoto(capo.immagine_url, capo.nomeProdotto)}
                                          className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 cursor-zoom-in shadow-2xs"
                                          title="Zoom immagine"
                                        >
                                          <img src={capo.immagine_url} alt="" className="w-full h-full object-contain" />
                                        </div>
                                      ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center shrink-0 text-base shadow-2xs">
                                          <FontAwesomeIcon icon={faShirt} />
                                        </div>
                                      )}

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-black text-slate-900 text-sm sm:text-base">{capo.nomeProdotto}</span>
                                          <span className="text-xs font-black uppercase text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                                            Taglia: {capo.taglia}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1">
                                          <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                                          <span>Ordinato il {formattaData(capo.dataCreazione)}</span>
                                        </div>

                                        {(capo.nomePersonalizzato || capo.numeroPersonalizzato || capo.colorePersonalizzato) && (
                                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            {capo.nomePersonalizzato && (
                                              <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                                "{capo.nomePersonalizzato}"
                                              </span>
                                            )}
                                            {capo.numeroPersonalizzato && (
                                              <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                                N° {capo.numeroPersonalizzato}
                                              </span>
                                            )}
                                            {capo.colorePersonalizzato && (
                                              <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                                {capo.colorePersonalizzato}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200/70 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => onAggiornaOrdine(idOrd, { pagato: !isPagato })}
                                        className={`h-9 px-3 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                                          isPagato 
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                                            : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                        }`}
                                      >
                                        <span className={`w-2 h-2 rounded-full ${isPagato ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                                        <span>{isPagato ? "Saldato" : "Non saldato"}</span>
                                      </button>

                                      <span className="text-base font-black text-slate-900 tabular-nums px-1">
                                        €{Number(capo.prezzo || 0).toFixed(2)}
                                      </span>

                                      <select 
                                        value={statoOrd} 
                                        onChange={(e) => onAggiornaOrdine(idOrd, { stato_pagamento: e.target.value })} 
                                        className={`h-9 border rounded-xl px-2.5 text-xs font-black focus:outline-none cursor-pointer ${
                                          statoOrd === 'Completato'
                                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                            : statoOrd === 'In lavorazione'
                                            ? 'bg-blue-50 text-[#002b80] border-blue-300'
                                            : statoOrd === 'Pronto per il ritiro'
                                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                                            : 'bg-slate-100 text-slate-700 border-slate-300'
                                        }`}
                                      >
                                        <option value="In attesa">In attesa</option>
                                        <option value="In lavorazione">In lavorazione</option>
                                        <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                                        <option value="Completato">Completato</option>
                                      </select>

                                      <div className="flex items-center gap-1.5">
                                        {statoOrd === "In attesa" && (
                                          <button
                                            type="button"
                                            onClick={() => onApriModificaOrdine({ id: idOrd, ...capo, articoli: [capo] })}
                                            className="h-9 w-9 sm:w-auto sm:px-3 text-xs font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                            title="Modifica capo"
                                          >
                                            <FontAwesomeIcon icon={faPenToSquare} />
                                            <span className="hidden sm:inline">Modifica</span>
                                          </button>
                                        )}

                                        {!isPagato && statoOrd === "In attesa" && (
                                          <button
                                            type="button"
                                            onClick={() => onAnnullaOrdine({ id: idOrd, totale: capo.prezzo, articoli: [capo] })}
                                            className="w-9 h-9 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
                                            title="Annulla fornitura"
                                          >
                                            <FontAwesomeIcon icon={faBan} />
                                          </button>
                                        )}
                                      </div>

                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: RIEPILOGO CATEGORIE (ACCORDION A DOPPIA TENDINA ANNIDATA)
         ======================================================== */}
      {adminTab === 'categorie' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-xl shadow-2xs shrink-0">
                <FontAwesomeIcon icon={faLayerGroup} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  Riepilogo Categorie & Consegna Capi
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                  Apri la categoria per vedere i profili e contrassegnare le consegne
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input 
                  type="text" 
                  value={ricercaCategorie} 
                  onChange={e => setRicercaCategorie(e.target.value)} 
                  placeholder="Filtra categoria o atleta..." 
                  className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#002b80] transition-all"
                />
                {ricercaCategorie && (
                  <button
                    type="button"
                    onClick={() => setRicercaCategorie('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>

              {datiCategorie.length > 0 && (
                <button
                  type="button"
                  onClick={toggleTutteCategorie}
                  className="h-11 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {tutteCategorieEspanse ? "Comprimi Categorie" : "Espandi Categorie"}
                </button>
              )}
            </div>
          </div>

          {datiCategorie.length === 0 ? (
            <div className="p-16 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs">
              <p className="text-sm font-bold text-slate-400 italic">
                {ricercaCategorie ? "Nessun risultato corrispondente al filtro inserito." : "Nessun capo ordinato registrato per le categorie attive."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {datiCategorie.map(({ categoria, profili, totaleCapi, totaleConsegnati }) => {
                const isCatAperta = categorieEspanse.has(categoria) || Boolean(ricercaCategorie);

                return (
                  <div 
                    key={`cat-${categoria}`} 
                    className={`bg-white border rounded-3xl overflow-hidden transition-all ${
                      isCatAperta 
                        ? 'border-slate-300 shadow-sm' 
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    
                    {/* LIVELLO 1: INTESTAZIONE CATEGORIA CLICCABILE A TENDINA */}
                    <div 
                      onClick={() => toggleCategoriaEspansa(categoria)}
                      className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isCatAperta ? 'bg-slate-50/80 border-b border-slate-200/80' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                          isCatAperta ? 'bg-[#002b80] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <FontAwesomeIcon icon={isCatAperta ? faChevronUp : faChevronDown} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#002b80] shrink-0"></span>
                          <h4 className="text-base sm:text-lg font-black text-slate-900 truncate">{categoria}</h4>
                          <span className="text-xs font-bold text-slate-400">
                            ({profili.length} {profili.length === 1 ? 'profilo' : 'profili'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
                          Consegnati: <strong className="text-emerald-700">{totaleConsegnati}</strong> / {totaleCapi}
                        </span>
                      </div>
                    </div>

                    {/* LIVELLO 2: LISTA PROFILI DENTRO LA CATEGORIA */}
                    {isCatAperta && (
                      <div className="p-4 sm:p-6 space-y-3 bg-white animate-in slide-in-from-top-1 duration-150">
                        {profili.map((profilo, pIdx) => {
                          const chiaveProfilo = `${categoria}_${profilo.nomeCompleto}_${profilo.email}`;
                          const isProfAperto = profiliCategoriaEspansi.has(chiaveProfilo) || Boolean(ricercaCategorie);
                          const capiConsegnatiProfilo = profilo.articoli.filter(a => a.completato).length;
                          const tuttiConsegnati = capiConsegnatiProfilo === profilo.articoli.length && profilo.articoli.length > 0;

                          return (
                            <div 
                              key={`prof-${categoria}-${pIdx}`} 
                              className={`border rounded-2xl overflow-hidden transition-all ${
                                isProfAperto 
                                  ? 'bg-slate-50/70 border-slate-300 shadow-2xs' 
                                  : 'bg-white hover:bg-slate-50/40 border-slate-200'
                              }`}
                            >
                              <div 
                                onClick={() => toggleProfiloCategoria(chiaveProfilo)}
                                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${
                                    isProfAperto ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    <FontAwesomeIcon icon={isProfAperto ? faChevronUp : faChevronDown} />
                                  </div>

                                  <div className="min-w-0">
                                    <h5 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                                      {profilo.nomeCompleto}
                                    </h5>
                                    <span className="text-[11px] text-slate-400 font-semibold truncate block mt-0.5">
                                      Acquirente: {profilo.acquirente}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                                    tuttiConsegnati 
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                      : 'bg-white text-slate-600 border-slate-200'
                                  }`}>
                                    {capiConsegnatiProfilo}/{profilo.articoli.length} capi
                                  </span>
                                </div>
                              </div>

                              {/* LIVELLO 3: CAPI DEL SINGOLO PROFILO */}
                              {isProfAperto && (
                                <div className="p-3 sm:p-4 pt-0 space-y-2.5 border-t border-slate-200/60 mt-1 animate-in slide-in-from-top-1 duration-150">
                                  {profilo.articoli.map((art, aIdx) => {
                                    const isConsegnato = Boolean(art.completato);
                                    const statoReale = art.statoOrdine || "In attesa";
                                    const isSaldato = Boolean(art.pagato);
                                    const puoConsegnare = isConsegnato || (statoReale === "Pronto per il ritiro" && isSaldato);

                                    return (
                                      <div 
                                        key={`cat-art-${aIdx}`}
                                        className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                      >
                                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                          {art.immagine_url ? (
                                            <div 
                                              onClick={() => onZoomFoto && onZoomFoto(art.immagine_url, art.nomeProdotto)}
                                              className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 cursor-zoom-in shadow-2xs"
                                              title="Zoom"
                                            >
                                              <img src={art.immagine_url} alt="" className="w-full h-full object-contain" />
                                            </div>
                                          ) : (
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 text-sm">
                                              <FontAwesomeIcon icon={faShirt} />
                                            </div>
                                          )}

                                          <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-black text-slate-900 text-xs sm:text-sm">{art.nomeProdotto}</span>
                                              <span className="text-[10px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                Taglia: {art.taglia}
                                              </span>
                                            </div>

                                            {(art.nomePersonalizzato || art.numeroPersonalizzato || art.colorePersonalizzato) && (
                                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                                {art.nomePersonalizzato && (
                                                  <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                                    "{art.nomePersonalizzato}"
                                                  </span>
                                                )}
                                                {art.numeroPersonalizzato && (
                                                  <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                                    N° {art.numeroPersonalizzato}
                                                  </span>
                                                )}
                                                {art.colorePersonalizzato && (
                                                  <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                                    {art.colorePersonalizzato}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                          <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                                            statoReale === 'Completato'
                                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                              : statoReale === 'Pronto per il ritiro'
                                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                                              : statoReale === 'In lavorazione'
                                              ? 'bg-blue-50 text-[#002b80] border-blue-300'
                                              : 'bg-slate-100 text-slate-700 border-slate-200'
                                          }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                              statoReale === 'Completato' ? 'bg-emerald-600' :
                                              statoReale === 'Pronto per il ritiro' ? 'bg-amber-500' :
                                              statoReale === 'In lavorazione' ? 'bg-[#002b80] animate-pulse' : 'bg-slate-400'
                                            }`}></span>
                                            <span>{statoReale}</span>
                                          </span>

                                          <span className={`text-[11px] font-black px-2 py-1 rounded-lg ${
                                            isSaldato ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                          }`}>
                                            {isSaldato ? 'Saldato' : 'Non saldato'}
                                          </span>

                                          <button
                                            type="button"
                                            disabled={!puoConsegnare}
                                            onClick={() => onToggleCompletatoArticolo(art.idOrdine, art.idUnivoco)}
                                            className={`h-8 sm:h-9 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shrink-0 ${
                                              isConsegnato
                                                ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 cursor-pointer'
                                                : puoConsegnare
                                                ? 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs cursor-pointer'
                                                : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-45 cursor-not-allowed'
                                            }`}
                                            title={
                                              isConsegnato
                                                ? "Clicca per annullare la consegna e ripristinare 'Pronto per il ritiro'"
                                                : !isSaldato
                                                ? "Non consegnabile: l'articolo deve prima essere contrassegnato come saldato"
                                                : statoReale !== "Pronto per il ritiro"
                                                ? "Non consegnabile: l'articolo deve trovarsi nello stato 'Pronto per il ritiro'"
                                                : "Conferma consegna a bordo vasca"
                                            }
                                          >
                                            <FontAwesomeIcon icon={!puoConsegnare ? faLock : faCircleCheck} className="text-xs" />
                                            <span>{isConsegnato ? "Consegnato" : "Consegna"}</span>
                                          </button>
                                        </div>

                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: GESTIONE CATALOGO
         ======================================================== */}
      {adminTab === 'catalogo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          
          <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#002b80] block">Aggiungi Capo</span>
                <h3 className="text-base font-black text-slate-900">Nuovo Articolo</h3>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5 block">Nome</label>
              <input 
                type="text" 
                value={nuovoProd.nome} 
                onChange={e => onSetNuovoProd({...nuovoProd, nome: e.target.value})} 
                placeholder="Es. Zaino Sociale CNL"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5 block">Prezzo (€)</label>
              <input 
                type="number" 
                step="1" 
                value={nuovoProd.prezzo} 
                onChange={e => onSetNuovoProd({...nuovoProd, prezzo: e.target.value})} 
                placeholder="0"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-base font-black tabular-nums text-[#002b80] focus:outline-none focus:border-[#002b80]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 block">
                Formato Taglia
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => onSetNuovoProd({ ...nuovoProd, taglia_unica: false })}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                    !nuovoProd.taglia_unica
                      ? 'bg-white text-[#002b80] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FontAwesomeIcon icon={faShirt} className="text-xs" />
                  <span className="truncate">Taglie (6A-5XL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetNuovoProd({ ...nuovoProd, taglia_unica: true })}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                    nuovoProd.taglia_unica
                      ? 'bg-white text-[#002b80] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  <span className="truncate">Taglia Unica</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5 block">Immagine</label>
              {anteprimaImmagine ? (
                <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-center">
                  <img src={anteprimaImmagine} alt="Anteprima" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={onRimuoviFile}
                    className="absolute top-2.5 right-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-2xl border border-dashed border-slate-300 hover:border-[#002b80] bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-slate-400 hover:text-[#002b80]"
                >
                  <FontAwesomeIcon icon={faCamera} className="text-2xl mb-1.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700">Carica foto</span>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

              {!fileImmagine && (
                <input 
                  type="text"
                  value={nuovoProd.immagine_url}
                  onChange={e => onSetNuovoProd({...nuovoProd, immagine_url: e.target.value})}
                  placeholder="Oppure incolla URL..."
                  className="w-full mt-2.5 h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-[#002b80]"
                />
              )}
            </div>

            {/* SEZIONE PERSONALIZZAZIONI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Personalizzazioni Abilitate
                </label>
              </div>

              {isNuoto ? (
                <div
                  onClick={() => onSetNuovoProd(prev => ({ ...prev, personalizzabile_nome: !prev.personalizzabile_nome }))}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none active:scale-[0.99] ${
                    nuovoProd.personalizzabile_nome
                      ? 'bg-blue-50/80 border-[#002b80] ring-1 ring-[#002b80]/20 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                      nuovoProd.personalizzabile_nome ? 'bg-[#002b80] text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <FontAwesomeIcon icon={faSignature} />
                    </div>
                    <div>
                      <span className={`text-sm font-black block leading-tight ${
                        nuovoProd.personalizzabile_nome ? 'text-[#002b80]' : 'text-slate-800'
                      }`}>
                        Nome
                      </span>
                      <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                        Maiuscolo
                      </span>
                    </div>
                  </div>

                  <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    nuovoProd.personalizzabile_nome ? 'bg-[#002b80]' : 'bg-slate-300'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                      nuovoProd.personalizzabile_nome ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'personalizzabile_nome', titolo: 'Nome', desc: 'Maiuscolo', icon: faSignature },
                    { key: 'personalizzabile_numero', titolo: 'Numero', desc: '1-15', icon: faHashtag },
                    { key: 'personalizzabile_colore', titolo: 'Colore', desc: 'Calotta', icon: faPalette }
                  ].map(({ key, titolo, desc, icon }) => {
                    const attivo = Boolean(nuovoProd[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onSetNuovoProd({ ...nuovoProd, [key]: !attivo })}
                        className={`p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer select-none active:scale-[0.97] min-w-0 overflow-hidden ${
                          attivo 
                            ? 'bg-blue-50/80 border-[#002b80] ring-1 ring-[#002b80]/20 shadow-xs' 
                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                            attivo ? 'bg-[#002b80] text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            <FontAwesomeIcon icon={icon} />
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] shrink-0 transition-colors ${
                            attivo ? 'bg-[#002b80] border-[#002b80] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {attivo && <FontAwesomeIcon icon={faCheck} />}
                          </div>
                        </div>
                        <div className="min-w-0 w-full">
                          <span className={`text-xs font-black block leading-tight truncate ${attivo ? 'text-[#002b80]' : 'text-slate-800'}`}>
                            {titolo}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 block mt-0.5 truncate">
                            {desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button 
              onClick={onCreaProdotto} 
              disabled={uploadingImage} 
              className="w-full h-12 bg-[#002b80] hover:bg-[#002060] text-white font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{uploadingImage ? "Caricamento..." : "Pubblica Articolo"}</span>
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Catalogo Staff</span>
                <span className="text-xs sm:text-sm font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {prodotti.length} capi inseriti
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMostraAnteprimaCatalogo(true)}
                className="h-10 px-4 text-xs sm:text-sm font-black bg-[#002b80] hover:bg-[#002060] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <FontAwesomeIcon icon={faStore} className="text-xs" />
                <span>Anteprima Negozio</span>
              </button>
            </div>

            {prodotti.length === 0 ? (
              <div className="p-16 text-center bg-slate-50 rounded-2xl">
                <p className="text-sm text-slate-400 font-bold">Nessun capo inserito finora nel catalogo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prodotti.map(p => {
                  const visibile = p.attivo !== false;
                  return (
                    <div 
                      key={`cat-prod-${p.id}`} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-4 rounded-2xl transition-colors ${
                        visibile ? 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50' : 'bg-amber-50/40 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {p.immagine_url ? (
                          <div 
                            onClick={() => onZoomFoto && onZoomFoto(p.immagine_url, p.nome)}
                            className="w-14 h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shrink-0 cursor-zoom-in shadow-2xs"
                            title="Ingrandisci"
                          >
                            <img src={p.immagine_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 text-xs font-black shrink-0">N/D</div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">{p.nome}</h4>
                            {p.taglia_unica && (
                              <span className="text-xs font-black uppercase px-2 py-0.5 bg-blue-50 text-[#002b80] border border-blue-200 rounded-md">
                                Unica
                              </span>
                            )}
                            {!visibile && (
                              <span className="text-xs font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md">
                                Nascosto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 mt-1">
                            <span className="text-[#002b80] font-black text-base tabular-nums">€{Number(p.prezzo || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setProdottoInModifica(p)}
                          className="h-9 w-9 sm:w-auto sm:px-3 text-xs sm:text-sm font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Modifica articolo"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                          <span className="hidden sm:inline">Modifica</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleVisibilitaProdotto(p.id, !visibile)}
                          className={`h-9 px-3 text-xs sm:text-sm font-bold border rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                            visibile 
                              ? 'text-slate-600 hover:bg-slate-200/60 border-slate-200' 
                              : 'text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 border-amber-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={visibile ? faEyeSlash : faEye} />
                          <span>{visibile ? "Nascondi" : "Mostra"}</span>
                        </button>

                        {/* TASTO ELIMINA ARTICOLO - TIPOGRAFIA ALLINEATA */}
                        <button 
                          type="button"
                          onClick={() => onEliminaProdotto(p.id)} 
                          className="h-9 px-3 text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                          title="Elimina articolo"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="text-xs sm:text-sm" />
                          <span className="hidden sm:inline font-bold">Elimina</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE ANTEPRIMA CATALOGO */}
      {mostraAnteprimaCatalogo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setMostraAnteprimaCatalogo(false)}
        >
          <div 
            className="relative w-full max-w-5xl bg-slate-50 rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sm:pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#002b80] text-white flex items-center justify-center text-base sm:text-lg shadow-xs">
                  <FontAwesomeIcon icon={faStore} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#002b80] block">Anteprima Negozio</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {prodottiVisibiliUtente.length} capi attivi
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setMostraAnteprimaCatalogo(false)}
                className="w-9 h-9 rounded-xl bg-white hover:bg-slate-200 text-slate-500 border border-slate-200 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {prodottiVisibiliUtente.map(p => (
                  <div key={`preview-${p.id}`} className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3.5">
                    <div 
                      onClick={() => p.immagine_url && onZoomFoto && onZoomFoto(p.immagine_url, p.nome)}
                      className="relative w-full h-40 sm:h-48 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-3 cursor-zoom-in group"
                    >
                      {p.immagine_url ? (
                        <img src={p.immagine_url} alt={p.nome} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <span className="text-slate-300 font-black text-xs uppercase">Nessuna Foto</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-start justify-between gap-2.5">
                        <h4 className="text-sm font-black text-slate-900">{p.nome}</h4>
                        <span className="text-base font-black text-[#002b80] tabular-nums">€{Number(p.prezzo || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE MODIFICA ARTICOLO CATALOGO */}
      {prodottoInModifica && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setProdottoInModifica(null)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#002b80] block">Modifica Catalogo</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Configura Articolo</h3>
              </div>
              <button 
                onClick={() => setProdottoInModifica(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={salvaModificheArticolo} className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Nome</label>
                <input 
                  type="text" 
                  value={prodottoInModifica.nome} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, nome: e.target.value})} 
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-[#002b80]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Prezzo (€)</label>
                <input 
                  type="number" 
                  step="1" 
                  value={prodottoInModifica.prezzo} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, prezzo: e.target.value})} 
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-base font-black tabular-nums text-[#002b80] focus:outline-none focus:border-[#002b80]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">URL Immagine</label>
                <input 
                  type="text" 
                  value={prodottoInModifica.immagine_url || ''} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, immagine_url: e.target.value})} 
                  placeholder="https://..."
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Formato Taglia
                </label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => setProdottoInModifica({ ...prodottoInModifica, taglia_unica: false })}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                      !prodottoInModifica.taglia_unica
                        ? 'bg-white text-[#002b80] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FontAwesomeIcon icon={faShirt} className="text-xs" />
                    <span className="truncate">Taglie (6A-5XL)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdottoInModifica({ ...prodottoInModifica, taglia_unica: true })}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                      prodottoInModifica.taglia_unica
                        ? 'bg-white text-[#002b80] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                    <span className="truncate">Taglia Unica</span>
                  </button>
                </div>
              </div>

              {/* PERSONALIZZAZIONI MODALE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Personalizzazioni Abilitate
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isNuoto ? "Solo Nuoto" : "Opzioni consentite"}
                  </span>
                </div>

                {isNuoto ? (
                  <div
                    onClick={() => setProdottoInModifica(prev => ({ ...prev, personalizzabile_nome: !prev.personalizzabile_nome }))}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none active:scale-[0.99] ${
                      prodottoInModifica.personalizzabile_nome
                        ? 'bg-blue-50/80 border-[#002b80] ring-1 ring-[#002b80]/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        prodottoInModifica.personalizzabile_nome ? 'bg-[#002b80] text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <FontAwesomeIcon icon={faSignature} />
                      </div>
                      <div>
                        <span className={`text-xs sm:text-sm font-black block leading-tight ${
                          prodottoInModifica.personalizzabile_nome ? 'text-[#002b80]' : 'text-slate-800'
                        }`}>
                          Nome Atleta
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                          Stampa o ricamo in maiuscolo
                        </span>
                      </div>
                    </div>

                    <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                      prodottoInModifica.personalizzabile_nome ? 'bg-[#002b80]' : 'bg-slate-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                        prodottoInModifica.personalizzabile_nome ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'personalizzabile_nome', titolo: 'Nome', desc: 'Maiuscolo', icon: faSignature },
                      { key: 'personalizzabile_numero', titolo: 'Numero', desc: '1-15', icon: faHashtag },
                      { key: 'personalizzabile_colore', titolo: 'Colore', desc: 'Calotta', icon: faPalette }
                    ].map(({ key, titolo, desc, icon }) => {
                      const attivo = Boolean(prodottoInModifica[key]);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setProdottoInModifica({...prodottoInModifica, [key]: !attivo})}
                          className={`p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer select-none active:scale-[0.97] min-w-0 overflow-hidden ${
                            attivo 
                              ? 'bg-blue-50/80 border-[#002b80] ring-1 ring-[#002b80]/20 shadow-xs' 
                              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              attivo ? 'bg-[#002b80] text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              <FontAwesomeIcon icon={icon} />
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] shrink-0 transition-colors ${
                              attivo ? 'bg-[#002b80] border-[#002b80] text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {attivo && <FontAwesomeIcon icon={faCheck} />}
                            </div>
                          </div>
                          <div className="min-w-0 w-full">
                            <span className={`text-xs font-black block leading-tight truncate ${attivo ? 'text-[#002b80]' : 'text-slate-800'}`}>
                              {titolo}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 block mt-0.5 truncate">
                              {desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3.5 mt-2 border-t border-slate-100 shrink-0">
                <button
                  type="submit"
                  className="w-full h-12 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer text-center"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE SELEZIONE: PER TIPOLOGIA */}
      {modalSelezione && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3.5 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setModalSelezione(null)}
        >
          <div 
            className="relative w-full max-w-lg sm:max-w-xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3 shrink-0">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0 shadow-2xs ${
                  modalSelezione === 'lavorazione' ? 'bg-blue-50 text-[#002b80]' : 'bg-amber-50 text-amber-700'
                }`}>
                  <FontAwesomeIcon icon={modalSelezione === 'lavorazione' ? faPaperPlane : faBoxesPacking} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#002b80] block truncate">
                    Gestione Produzione Capi
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug mt-0.5">
                    {modalSelezione === 'lavorazione' 
                      ? 'Seleziona modelli da mandare in lavorazione' 
                      : 'Seleziona modelli pronti al ritiro'}
                  </h3>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setModalSelezione(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
                title="Chiudi finestra"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-2xl mb-3 shrink-0">
              <span className="text-xs font-bold text-slate-700 truncate">
                Modelli: <strong className="text-slate-900">{tipologieSelezionate.size}</strong> di {tipologieAttiveModal.length} ({pezziTotaliTipologieSelezionate} pz)
              </span>

              <button
                type="button"
                onClick={toggleTutteTipologie}
                className="text-xs font-black text-[#002b80] hover:underline flex items-center gap-1.5 cursor-pointer shrink-0 ml-2"
              >
                <span>
                  {tipologieSelezionate.size === tipologieAttiveModal.length ? "Deseleziona" : "Seleziona"}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {tipologieAttiveModal.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl">
                  <p className="text-xs sm:text-sm text-slate-400 font-bold">
                    {modalSelezione === 'lavorazione'
                      ? "Nessun articolo in attesa da mandare in lavorazione."
                      : "Nessun articolo in lavorazione da impostare come pronto per il ritiro."}
                  </p>
                </div>
              ) : (
                tipologieAttiveModal.map(tip => {
                  const isChecked = tipologieSelezionate.has(tip.nome);
                  const pezzi = tip.ordini.length;
                  const totaleImporto = tip.ordini.reduce((acc, o) => acc + Number(o.prezzo || o.totale || 0), 0);

                  return (
                    <div 
                      key={`tipologia-row-${tip.nome}`}
                      onClick={() => toggleTipologia(tip.nome)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isChecked 
                          ? 'bg-blue-50/60 border-[#002b80] ring-1 ring-[#002b80]/20' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => {}}
                          className="w-4 h-4 accent-[#002b80] rounded cursor-pointer shrink-0"
                        />

                        {tip.immagine_url ? (
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                            <img src={tip.immagine_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center shrink-0 text-sm">
                            <FontAwesomeIcon icon={faShirt} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">{tip.nome}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                            Da aggiornare: <strong className="text-slate-800">{pezzi} {pezzi === 1 ? 'capo' : 'capi'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-[#002b80] tabular-nums block">
                          €{totaleImporto.toFixed(2)}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isChecked ? 'bg-blue-100 text-[#002b80]' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isChecked ? 'Incluso' : 'Escluso'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-3">
              <button
                type="button"
                onClick={confermaAzioneModal}
                disabled={tipologieSelezionate.size === 0 || invioProduzioneInCorso}
                className={`w-full h-12 rounded-2xl text-xs sm:text-sm font-black text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  modalSelezione === 'lavorazione' 
                    ? 'bg-[#002b80] hover:bg-[#002060]' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <FontAwesomeIcon icon={modalSelezione === 'lavorazione' ? faPaperPlane : faBoxesPacking} className="text-xs" />
                <span>
                  {modalSelezione === 'lavorazione'
                    ? (invioProduzioneInCorso ? "Inoltro..." : `Invia ${pezziTotaliTipologieSelezionate} Capi`)
                    : `Pronti al Ritiro (${pezziTotaliTipologieSelezionate} Capi)`
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}