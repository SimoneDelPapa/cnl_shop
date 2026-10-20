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
  faPalette,
  faCartPlus,
  faCartShopping,
  faUsers,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';

import { getOpzioniScaleSettore, getTaglieByScalaId } from '../utils/taglie';
import ModalCreaOrdineAdmin from './ModalCreaOrdineAdmin';

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
  tuttiGliUtenti = [],
  ordiniInAttesaCount = 0,
  invioProduzioneInCorso = false,
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
  prodotti = [],
  onEliminaProdotto,
  onModificaProdotto,
  onToggleVisibilitaProdotto,
  onInviaSollecitoMassivo,
  onInviaSollecitoSingolo,
  settoreUtente = 'pallanuoto',
  categorieSettore = [],
  onZoomFoto,
  onCreaOrdinePerUtente,
  onModificaProfiloUtente,
  onAggiungiProfiloUtente,
  onEliminaProfiloUtente,
  onEliminaAccountUtente,
  onModificaAccountUtente,
  onRimuoviCapoCarrelloUtente,
  onModificaCapoCarrelloUtente,
  mostraMessaggio,
  chiediConferma
}) {
  const isNuoto = settoreUtente === 'nuoto';

  const [prodottoInModifica, setProdottoInModifica] = useState(null);
  const [utentiEspansi, setUtentiEspansi] = useState(() => new Set());
  const [mostraAnteprimaCatalogo, setMostraAnteprimaCatalogo] = useState(false);

  // ACCORDION CATEGORIE ANNIDATE
  const [categorieEspanse, setCategorieEspanse] = useState(() => new Set());
  const [profiliCategoriaEspansi, setProfiliCategoriaEspansi] = useState(() => new Set());
  const [ricercaCategorie, setRicercaCategorie] = useState('');
  const [ricercaUtentiTab, setRicercaUtentiTab] = useState('');

  // ACCORDION UTENTI
  const [accountEspansi, setAccountEspansi] = useState(() => new Set());

  // MODALE SELEZIONE PER TIPOLOGIA (Lavorazione / Pronti Ritiro)
  const [modalSelezione, setModalSelezione] = useState(null);
  const [tipologieSelezionate, setTipologieSelezionate] = useState(() => new Set());

  // MODALI ADMIN: CREA ORDINE, GESTIONE PROFILI, GESTIONE ACCOUNT, MODIFICA CARRELLO
  const [accountPerOrdine, setAccountPerOrdine] = useState(null);
  const [profiloInModifica, setProfiloInModifica] = useState(null);
  const [profiloInCreazione, setProfiloInCreazione] = useState(null);
  const [accountInModifica, setAccountInModifica] = useState(null);
  const [capoCarrelloInModifica, setCapoCarrelloInModifica] = useState(null);

  // SCROLL LOCK SU TUTTI I MODALI
  useEffect(() => {
    const isQualsiasiModalAperto = Boolean(
      modalSelezione || 
      prodottoInModifica || 
      mostraAnteprimaCatalogo || 
      accountPerOrdine || 
      profiloInModifica || 
      profiloInCreazione || 
      accountInModifica ||
      capoCarrelloInModifica
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
  }, [modalSelezione, prodottoInModifica, mostraAnteprimaCatalogo, accountPerOrdine, profiloInModifica, profiloInCreazione, accountInModifica, capoCarrelloInModifica]);

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

    if (modalSelezione === 'lavorazione' && onInviaProduzione) {
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

  const toggleEspandiAccount = (id) => {
    setAccountEspansi(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
      if (mostraMessaggio) mostraMessaggio("Campi Mancanti", "Nome e prezzo sono obbligatori.", "warning");
      return;
    }

    const settoreCapo = prodottoInModifica.disciplina || settoreUtente;
    const opzioniSettore = getOpzioniScaleSettore(settoreCapo);
    const scalaId = prodottoInModifica.scala_taglie_id || opzioniSettore[0].id;
    const taglieDisponibili = getTaglieByScalaId(scalaId);
    const isUnica = taglieDisponibili.length === 1 && taglieDisponibili[0] === "Taglia Unica";

    onModificaProdotto(prodottoInModifica.id, {
      nome: prodottoInModifica.nome.trim(),
      prezzo: parseFloat(prodottoInModifica.prezzo) || 0,
      immagine_url: prodottoInModifica.immagine_url || null,
      scala_taglie_id: scalaId,
      taglia_unica: isUnica,
      taglie_disponibili: taglieDisponibili,
      personalizzabile_nome: Boolean(prodottoInModifica.personalizzabile_nome),
      personalizzabile_numero: (settoreCapo === 'nuoto') ? false : Boolean(prodottoInModifica.personalizzabile_numero),
      personalizzabile_colore: (settoreCapo === 'nuoto') ? false : Boolean(prodottoInModifica.personalizzabile_colore)
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
              utenteId: ord.utente_id,
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
            dataCreazione: ord.creato_il,
            utenteIdPadre: ord.utente_id
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

  // Lista normalizzata di tutti gli account registrati
  const listaAccountCompleta = useMemo(() => {
    const isN = settoreUtente === 'nuoto';

    return (tuttiGliUtenti || []).map(u => {
      const atletiRaw = isN
        ? (u.atleti_nuoto || [])
        : (u.atleti_pallanuoto || u.atleti || []);

      const carrelloRaw = isN
        ? (u.carrello_nuoto || [])
        : (u.carrello_pallanuoto || u.carrello || []);

      const profili = (Array.isArray(atletiRaw) ? atletiRaw : []).map(a => {
        if (typeof a === 'object' && a !== null) {
          const nomeComp = `${a.nome || ''} ${a.cognome || ''}`.trim();
          return {
            nome: a.nome || '',
            cognome: a.cognome || '',
            nomeCompleto: nomeComp || 'Profilo Senza Nome',
            categoria: a.categoria || 'Extra'
          };
        }
        return {
          nome: String(a),
          cognome: '',
          nomeCompleto: String(a),
          categoria: 'Extra'
        };
      });

      const carrello = Array.isArray(carrelloRaw) ? carrelloRaw : [];
      const totaleCarrello = carrello.reduce((acc, c) => acc + Number(c.prezzo || 0), 0);

      const nome = u.nome || '';
      const cognome = u.cognome || '';
      const nomeCompleto = `${nome} ${cognome}`.trim() || u.email || 'Utente';

      return {
        id: u.id,
        email: u.email || '',
        nome,
        cognome,
        nomeCompleto,
        profili,
        carrello,
        totaleCarrello
      };
    });
  }, [tuttiGliUtenti, settoreUtente]);

  // FILTRO SELETTIVO: Mostra solo account che hanno almeno un profilo nella disciplina attiva
  const accountFiltrati = useMemo(() => {
    const accountDelSettore = listaAccountCompleta.filter(u => Array.isArray(u.profili) && u.profili.length > 0);

    const q = ricercaUtentiTab.toLowerCase().trim();
    if (!q) return accountDelSettore;

    return accountDelSettore.filter(u => 
      u.nomeCompleto.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.profili.some(p => p.nomeCompleto.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q))
    );
  }, [listaAccountCompleta, ricercaUtentiTab]);

  const haOrdiniPendentiProfilo = (nomeProfilo, emailAccount) => {
    const pNome = (nomeProfilo || '').toLowerCase().trim();
    const pEmail = (emailAccount || '').toLowerCase().trim();

    return (tuttiGliOrdini || []).some(o => {
      const matchEmail = (o.email_acquirente || '').toLowerCase().trim() === pEmail;
      if (!matchEmail) return false;
      if (o.stato_pagamento === "Annullato") return false;

      const lista = Array.isArray(o.articoli) && o.articoli.length > 0 ? o.articoli : [o];
      const appartieneAProfilo = lista.some(c => (c.atleta || o.atleta || '').toLowerCase().trim() === pNome);
      if (!appartieneAProfilo) return false;

      return (o.stato_pagamento === "In attesa" || o.stato_pagamento === "In lavorazione" || !o.pagato);
    });
  };

  const haOrdiniPendentiAccount = (emailAccount, utenteId) => {
    const pEmail = (emailAccount || '').toLowerCase().trim();

    return (tuttiGliOrdini || []).some(o => {
      const matchEmail = pEmail && (o.email_acquirente || '').toLowerCase().trim() === pEmail;
      const matchUid = utenteId && o.utente_id === utenteId;
      if (!matchEmail && !matchUid) return false;
      if (o.stato_pagamento === "Annullato") return false;

      return (o.stato_pagamento === "In attesa" || o.stato_pagamento === "In lavorazione" || !o.pagato);
    });
  };

  // Funzione per estrarre in modo sicuro Nome e Cognome senza duplicazioni
  const separaNomeCognome = (nomeRaw = '', cognomeRaw = '', nomeCompletoRaw = '') => {
    const nomeComp = (nomeCompletoRaw || '').trim();
    const cognome = (cognomeRaw || '').trim();
    let nome = (nomeRaw || '').trim();

    if (cognome && nome.toLowerCase().endsWith(cognome.toLowerCase())) {
      nome = nome.slice(0, nome.length - cognome.length).trim();
    } else if (!cognome && nomeComp) {
      const parti = nomeComp.split(/\s+/);
      nome = parti[0] || '';
      return { nome, cognome: parti.slice(1).join(' ') };
    }

    return { nome: nome || nomeComp.split(/\s+/)[0] || '', cognome };
  };

  const handleRichiestaEliminaProfilo = (utenteId, prof, emailAccount) => {
    if (haOrdiniPendentiProfilo(prof.nomeCompleto, emailAccount)) {
      if (mostraMessaggio) {
        mostraMessaggio(
          "Eliminazione non consentita",
          `Impossibile eliminare il profilo "${prof.nomeCompleto}": risultano ordini pendenti, in lavorazione o non ancora saldati a suo nome.`,
          "warning"
        );
      }
      return;
    }

    const eseguiEliminazione = () => {
      if (onEliminaProfiloUtente) {
        onEliminaProfiloUtente(utenteId, prof);
      }
    };

    if (chiediConferma) {
      chiediConferma(
        "Elimina Profilo",
        `Confermi l'eliminazione definitiva del profilo "${prof.nomeCompleto}" dal settore ${settoreUtente.toUpperCase()}?`,
        eseguiEliminazione,
        "Elimina Profilo"
      );
    }
  };

  const handleRichiestaEliminaAccount = (account) => {
    if (haOrdiniPendentiAccount(account.email, account.id)) {
      if (mostraMessaggio) {
        mostraMessaggio(
          "Eliminazione non consentita",
          `Impossibile eliminare l'account "${account.nomeCompleto}": risultano ordini pendenti, in lavorazione o non ancora saldati.`,
          "warning"
        );
      }
      return;
    }

    const eseguiEliminazione = () => {
      if (onEliminaAccountUtente) {
        onEliminaAccountUtente(account.id);
      }
    };

    if (chiediConferma) {
      chiediConferma(
        "Elimina Account",
        `ATTENZIONE: Confermi l'eliminazione definitiva dell'account "${account.nomeCompleto}" (${account.email}) e di tutti i suoi profili? L'operazione è irreversibile.`,
        eseguiEliminazione,
        "Elimina Account"
      );
    }
  };

  const handleSalvaModificaProfilo = (e) => {
    e.preventDefault();
    if (!profiloInModifica || !onModificaProfiloUtente) return;
    if (!profiloInModifica.nome.trim() || !profiloInModifica.cognome.trim()) {
      if (mostraMessaggio) mostraMessaggio("Campi Mancanti", "Nome e cognome sono obbligatori.", "warning");
      return;
    }

    onModificaProfiloUtente(profiloInModifica.utenteId, profiloInModifica.nomeVecchio, {
      nome: profiloInModifica.nome.trim(),
      cognome: profiloInModifica.cognome.trim(),
      categoria: profiloInModifica.categoria
    });

    setProfiloInModifica(null);
  };

  const handleSalvaNuovoProfilo = (e) => {
    e.preventDefault();
    if (!profiloInCreazione || !onAggiungiProfiloUtente) return;
    if (!profiloInCreazione.nome.trim() || !profiloInCreazione.cognome.trim()) {
      if (mostraMessaggio) mostraMessaggio("Campi Mancanti", "Nome e cognome sono obbligatori.", "warning");
      return;
    }

    onAggiungiProfiloUtente(profiloInCreazione.utenteId, {
      nome: profiloInCreazione.nome.trim(),
      cognome: profiloInCreazione.cognome.trim(),
      categoria: profiloInCreazione.categoria || categorieSettore[0] || 'Extra'
    });

    setProfiloInCreazione(null);
  };

  const handleSalvaModificaAccount = (e) => {
    e.preventDefault();
    if (!accountInModifica || !onModificaAccountUtente) return;
    if (!accountInModifica.nome.trim() || !accountInModifica.cognome.trim()) {
      if (mostraMessaggio) mostraMessaggio("Campi Mancanti", "Nome e cognome sono obbligatori.", "warning");
      return;
    }

    onModificaAccountUtente(accountInModifica.id, {
      nome: accountInModifica.nome.trim(),
      cognome: accountInModifica.cognome.trim()
    });

    setAccountInModifica(null);
  };

  // Calcolo taglie disponibili per il capo carrello attualmente in modifica da taglie.js
  const taglieDisponibiliCapoInModifica = useMemo(() => {
    if (!capoCarrelloInModifica) return ["Taglia Unica"];

    // 1. Cerca il prodotto corrispondente nel catalogo corrente per trovarne la scala_taglie_id
    const prodTarget = prodotti.find(p => 
      (p.id && p.id === capoCarrelloInModifica.prodottoId) ||
      (p.nome && p.nome.trim().toLowerCase() === (capoCarrelloInModifica.nomeProdotto || '').trim().toLowerCase())
    );

    if (prodTarget) {
      if (prodTarget.taglia_unica) return ["Taglia Unica"];
      if (prodTarget.scala_taglie_id) {
        return getTaglieByScalaId(prodTarget.scala_taglie_id);
      }
      if (Array.isArray(prodTarget.taglie_disponibili) && prodTarget.taglie_disponibili.length > 0) {
        return prodTarget.taglie_disponibili;
      }
    }

    // 2. Se ha taglia_unica flaggata
    if (capoCarrelloInModifica.taglia_unica || (capoCarrelloInModifica.taglia || '').toLowerCase().includes("unica")) {
      return ["Taglia Unica"];
    }

    // 3. Fallback intelligente in base al settore e al nome capo
    const scaleSettore = getOpzioniScaleSettore(settoreUtente);
    const nomeCapo = (capoCarrelloInModifica.nomeProdotto || '').toLowerCase();
    
    if (nomeCapo.includes('zaino') || nomeCapo.includes('calotta')) {
      return ["Taglia Unica"];
    }
    if (nomeCapo.includes('costume') && nomeCapo.includes('donna')) {
      const s = scaleSettore.find(sc => sc.id.includes('costume_donna'));
      return s ? s.taglie : getTaglieByScalaId(scaleSettore[0]?.id);
    }
    if (nomeCapo.includes('costume')) {
      const s = scaleSettore.find(sc => sc.id.includes('costume_uomo'));
      return s ? s.taglie : getTaglieByScalaId(scaleSettore[0]?.id);
    }
    if (nomeCapo.includes('tshirt') || nomeCapo.includes('t-shirt') || nomeCapo.includes('maglia')) {
      const s = scaleSettore.find(sc => sc.id.includes('tshirt'));
      return s ? s.taglie : getTaglieByScalaId(scaleSettore[0]?.id);
    }
    if (nomeCapo.includes('shorts') || nomeCapo.includes('pantaloncin')) {
      const s = scaleSettore.find(sc => sc.id.includes('shorts'));
      return s ? s.taglie : getTaglieByScalaId(scaleSettore[0]?.id);
    }

    return scaleSettore[0]?.taglie || ["Taglia Unica"];
  }, [capoCarrelloInModifica, prodotti, settoreUtente]);

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

          {/* CONTATORE CLIENTI & ESPANSIONE SCHEDE */}
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

          {/* LISTA ACCOUNT CLIENTI NEGLI ORDINI */}
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

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
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
                                            {!isNuoto && capo.colorePersonalizzato && (capo.nomeProdotto || '').toLowerCase().includes('calotta') && (
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
          TAB 2: RIEPILOGO CATEGORIE (SENZA TASTO MODIFICA PROFILO)
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
                                        className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col gap-3"
                                      >
                                        <div className="flex items-start gap-3 min-w-0">
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

                                          <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-black text-slate-900 text-sm leading-tight">{art.nomeProdotto}</span>
                                              <span className="text-[10px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                                                Taglia: {art.taglia}
                                              </span>
                                            </div>

                                            {(art.nomePersonalizzato || art.numeroPersonalizzato || art.colorePersonalizzato) && (
                                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                                {art.nomePersonalizzato && (
                                                  <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                                                    "{art.nomePersonalizzato}"
                                                  </span>
                                                )}
                                                {art.numeroPersonalizzato && (
                                                  <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                                                    N° {art.numeroPersonalizzato}
                                                  </span>
                                                )}
                                                {!isNuoto && art.colorePersonalizzato && (art.nomeProdotto || '').toLowerCase().includes('calotta') && (
                                                  <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                                                    {art.colorePersonalizzato}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                                          <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <span className={`flex-1 sm:flex-none justify-center h-8 px-2.5 text-[11px] font-black uppercase rounded-xl border flex items-center gap-1.5 whitespace-nowrap ${
                                              statoReale === 'Completato'
                                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                                : statoReale === 'Pronto per il ritiro'
                                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                                : statoReale === 'In lavorazione'
                                                ? 'bg-blue-50 text-[#002b80] border-blue-300'
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                statoReale === 'Completato' ? 'bg-emerald-600' :
                                                statoReale === 'Pronto per il ritiro' ? 'bg-amber-500' :
                                                statoReale === 'In lavorazione' ? 'bg-[#002b80] animate-pulse' : 'bg-slate-400'
                                              }`}></span>
                                              <span className="truncate">{statoReale}</span>
                                            </span>

                                            <span className={`flex-1 sm:flex-none justify-center h-8 px-2.5 text-[11px] font-black rounded-xl border flex items-center whitespace-nowrap ${
                                              isSaldato 
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                : 'bg-amber-50 text-amber-900 border-amber-200'
                                            }`}>
                                              <span className="truncate">{isSaldato ? 'Saldato' : 'Non saldato'}</span>
                                            </span>
                                          </div>

                                          <button
                                            type="button"
                                            disabled={!puoConsegnare}
                                            onClick={() => onToggleCompletatoArticolo(art.idOrdine, art.idUnivoco)}
                                            className={`w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap select-none shrink-0 ${
                                              isConsegnato
                                                ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 active:scale-[0.99] cursor-pointer'
                                                : puoConsegnare
                                                ? 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs active:scale-[0.99] cursor-pointer'
                                                : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
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
                                            <FontAwesomeIcon icon={!puoConsegnare ? faLock : faCircleCheck} className="text-xs shrink-0" />
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

            {/* SELEZIONE SCALA TAGLIE PER TIPOLOGIA DI ARTICOLO */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Tipologia Articolo & Taglie
                </label>
                <span className="text-[10px] font-black uppercase text-[#002b80] bg-blue-50 px-2 py-0.5 rounded">
                  {isNuoto ? "Nuoto" : "Pallanuoto"}
                </span>
              </div>

              {(() => {
                const scaleSettore = getOpzioniScaleSettore(settoreUtente);
                const scalaCorrente = nuovoProd.scala_taglie_id || scaleSettore[0].id;

                return (
                  <div>
                    <select
                      value={scalaCorrente}
                      onChange={(e) => {
                        const sceltaId = e.target.value;
                        const lista = getTaglieByScalaId(sceltaId);
                        const isUnica = lista.length === 1 && lista[0] === "Taglia Unica";
                        onSetNuovoProd({
                          ...nuovoProd,
                          scala_taglie_id: sceltaId,
                          taglia_unica: isUnica,
                          taglie_disponibili: lista
                        });
                      }}
                      className="w-full h-11 bg-white border border-slate-200 hover:border-[#002b80] focus:border-[#002b80] rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
                    >
                      {scaleSettore.map(scala => (
                        <option key={scala.id} value={scala.id}>
                          {scala.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-[11px] text-slate-400 font-semibold mt-1.5 px-0.5">
                      Taglie disponibili: <strong className="text-slate-700">{getTaglieByScalaId(scalaCorrente).join(', ')}</strong>
                    </p>
                  </div>
                );
              })()}
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

            {/* PERSONALIZZAZIONI */}
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
                            {p.taglia_unica ? (
                              <span className="text-xs font-black uppercase px-2 py-0.5 bg-blue-50 text-[#002b80] border border-blue-200 rounded-md">
                                Unica
                              </span>
                            ) : (
                              <span className="text-xs font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                                {Array.isArray(p.taglie_disponibili) && p.taglie_disponibili.length > 0
                                  ? `${p.taglie_disponibili[0]} — ${p.taglie_disponibili[p.taglie_disponibili.length - 1]}`
                                  : "Standard"}
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
                          onClick={() => setProdottoInModifica({
                            ...p,
                            scala_taglie_id: p.scala_taglie_id || (p.taglia_unica ? (isNuoto ? "nuoto_zaino" : "pn_zaino") : (isNuoto ? "nuoto_shorts" : "pn_shorts"))
                          })}
                          className="h-9 w-9 sm:w-auto sm:px-3 text-xs sm:text-sm font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Modifica articolo"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                          <span className="hidden sm:inline">Modifica</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleVisibilitaProdotto(p.id, !visibile)}
                          className={`h-9 w-9 sm:w-auto sm:px-3 text-xs sm:text-sm font-bold border rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                            visibile 
                              ? 'text-slate-600 hover:bg-slate-200/60 border-slate-200' 
                              : 'text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 border-amber-300'
                          }`}
                          title={visibile ? "Nascondi articolo" : "Mostra articolo"}
                        >
                          <FontAwesomeIcon icon={visibile ? faEyeSlash : faEye} />
                          <span className="hidden sm:inline">{visibile ? "Nascondi" : "Mostra"}</span>
                        </button>

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

      {/* ========================================================
          TAB 4: GESTIONE ACCOUNT & PROFILI ATLETI ("UTENTE")
         ======================================================== */}
      {adminTab === 'utenti' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xl shadow-2xs shrink-0">
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  Gestione Utenti & Profili
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                  Visualizza tutti gli account con profili registrati in {settoreUtente.toUpperCase()} ({accountFiltrati.length}) e i carrelli attivi
                </p>
              </div>
            </div>

            <div className="relative flex-1 md:w-80">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
              <input 
                type="text" 
                value={ricercaUtentiTab} 
                onChange={e => setRicercaUtentiTab(e.target.value)} 
                placeholder="Cerca per email, nominativo o atleta..." 
                className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#002b80] transition-all"
              />
              {ricercaUtentiTab && (
                <button
                  type="button"
                  onClick={() => setRicercaUtentiTab('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>
          </div>

          {accountFiltrati.length === 0 ? (
            <div className="p-16 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs">
              <p className="text-sm font-bold text-slate-400 italic">
                Nessun account con profili in {settoreUtente.toUpperCase()} trovato per i criteri di ricerca impostati.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {accountFiltrati.map(account => {
                const isAperto = accountEspansi.has(account.id);

                return (
                  <div 
                    key={account.id} 
                    className={`bg-white border rounded-3xl transition-all overflow-hidden ${
                      isAperto 
                        ? 'border-slate-300 shadow-sm' 
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* INTESTAZIONE CLICCABILE ACCORDION */}
                    <div 
                      onClick={() => toggleEspandiAccount(account.id)}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isAperto ? 'bg-slate-50/80 border-b border-slate-200/80' : 'hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                          isAperto ? 'bg-[#002b80] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <FontAwesomeIcon icon={isAperto ? faChevronUp : faChevronDown} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base sm:text-lg font-black text-slate-900 truncate">
                              {account.nomeCompleto}
                            </h4>
                            <span className="text-xs font-semibold text-slate-400 truncate">
                              ({account.email})
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 block mt-0.5">
                            {account.profili.length} {account.profili.length === 1 ? 'profilo' : 'profili'} • Carrello: {account.carrello.length} {account.carrello.length === 1 ? 'capo' : 'capi'}
                          </span>
                        </div>
                      </div>

                      {/* TOOLBAR 4 ICON-BUTTONS IDENTICI */}
                      <div 
                        onClick={e => e.stopPropagation()} 
                        className="flex items-center gap-2 shrink-0 self-end sm:self-auto"
                      >
                        {/* 1. AGGIUNGI PROFILO */}
                        <button
                          type="button"
                          onClick={() => setProfiloInCreazione({
                            utenteId: account.id,
                            nome: '',
                            cognome: '',
                            categoria: categorieSettore[0] || 'Extra'
                          })}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                          title="Aggiungi nuovo profilo atleta a questo account"
                        >
                          <FontAwesomeIcon icon={faUserPlus} />
                        </button>

                        {/* 2. CREA ORDINE */}
                        <button
                          type="button"
                          onClick={() => setAccountPerOrdine(account)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                          title="Crea ordine per questo account"
                        >
                          <FontAwesomeIcon icon={faCartPlus} />
                        </button>

                        {/* 3. MODIFICA ACCOUNT */}
                        <button
                          type="button"
                          onClick={() => {
                            const { nome, cognome } = separaNomeCognome(account.nome, account.cognome, account.nomeCompleto);
                            setAccountInModifica({
                              id: account.id,
                              nome,
                              cognome,
                              email: account.email
                            });
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#002b80] border border-blue-200 flex items-center justify-center text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                          title="Modifica nominativo account"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>

                        {/* 4. ELIMINA ACCOUNT */}
                        <button
                          type="button"
                          onClick={() => handleRichiestaEliminaAccount(account)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                          title="Elimina definitivamente l'account"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </div>

                    {/* CORPO ESPANSO */}
                    {isAperto && (
                      <div className="p-5 sm:p-6 space-y-5 bg-white animate-in slide-in-from-top-1 duration-150">
                        
                        {/* SEZIONE 1: PROFILI REGISTRATI */}
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2.5">
                            Profili Registrati ({account.profili.length})
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {account.profili.map((prof, pIdx) => (
                              <div 
                                key={`acc-prof-${pIdx}`}
                                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 hover:border-slate-300 transition-all"
                              >
                                <div className="min-w-0">
                                  <span className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                                    {prof.nomeCompleto}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                    {prof.categoria}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* MODIFICA PROFILO */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const { nome, cognome } = separaNomeCognome(prof.nome, prof.cognome, prof.nomeCompleto);
                                      setProfiloInModifica({
                                        utenteId: account.id,
                                        nomeVecchio: prof.nomeCompleto,
                                        nome,
                                        cognome,
                                        categoria: prof.categoria
                                      });
                                    }}
                                    className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-[#002b80] border border-slate-200 flex items-center justify-center text-xs transition-colors cursor-pointer shadow-2xs"
                                    title="Modifica dati del profilo"
                                  >
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                  </button>

                                  {/* CESTINO PROFILO */}
                                  <button
                                    type="button"
                                    onClick={() => handleRichiestaEliminaProfilo(account.id, prof, account.email)}
                                    className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 flex items-center justify-center text-xs transition-colors cursor-pointer shadow-2xs"
                                    title="Elimina questo profilo"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SEZIONE 2: DETTAGLIO CAPI NEL CARRELLO ATTIVO */}
                        <div className="pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faCartShopping} className="text-xs text-[#002b80]" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                Carrello Attivo ({account.carrello.length} {account.carrello.length === 1 ? 'capo' : 'capi'})
                              </span>
                            </div>
                            {account.carrello.length > 0 && (
                              <span className="text-xs font-black text-[#002b80] tabular-nums">
                                Totale: €{account.totaleCarrello.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {account.carrello.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Il carrello di questo utente è vuoto.</p>
                          ) : (
                            <div className="space-y-2">
                              {account.carrello.map((capo, cIdx) => (
                                <div 
                                  key={`cart-item-${account.id}-${cIdx}`}
                                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {capo.immagine_url ? (
                                      <div 
                                        onClick={() => onZoomFoto && onZoomFoto(capo.immagine_url, capo.nomeProdotto)}
                                        className="w-11 h-11 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 cursor-zoom-in"
                                        title="Ingrandisci foto"
                                      >
                                        <img src={capo.immagine_url} alt="" className="w-full h-full object-contain" />
                                      </div>
                                    ) : (
                                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center shrink-0 text-sm">
                                        <FontAwesomeIcon icon={faShirt} />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                          {capo.nomeProdotto}
                                        </span>
                                        <span className="text-[10px] font-black uppercase text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                          Taglia: {capo.taglia}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-500 block mt-0.5 truncate">
                                        Intestato a: <strong className="text-slate-800">{capo.atleta || 'Profilo'}</strong>
                                      </span>
                                      {(capo.nomePersonalizzato || capo.numeroPersonalizzato || capo.colorePersonalizzato) && (
                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                          {capo.nomePersonalizzato && (
                                            <span className="text-[9px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                              "{capo.nomePersonalizzato}"
                                            </span>
                                          )}
                                          {capo.numeroPersonalizzato && (
                                            <span className="text-[9px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                              N° {capo.numeroPersonalizzato}
                                            </span>
                                          )}
                                          {capo.colorePersonalizzato && (
                                            <span className="text-[9px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                              {capo.colorePersonalizzato}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* PREZZO E AZIONI ICONICHE MODIFICA ED ELIMINAZIONE */}
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span className="text-xs sm:text-sm font-black text-[#002b80] tabular-nums pr-1">
                                      €{Number(capo.prezzo || 0).toFixed(2)}
                                    </span>

                                    {/* PULSANTE MODIFICA CAPO CARRELLO (SOLO ICONA) */}
                                    <button
                                      type="button"
                                      onClick={() => setCapoCarrelloInModifica({ ...capo, utenteIdPadre: account.id })}
                                      className="w-8 h-8 rounded-xl bg-white hover:bg-blue-50 text-[#002b80] border border-blue-200 flex items-center justify-center text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                                      title="Modifica articolo nel carrello"
                                    >
                                      <FontAwesomeIcon icon={faPenToSquare} />
                                    </button>

                                    {/* PULSANTE ELIMINA CAPO CARRELLO (SOLO ICONA) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (chiediConferma) {
                                          chiediConferma(
                                            "Rimuovi dal Carrello",
                                            `Confermi la rimozione dell'articolo "${capo.nomeProdotto}" (${capo.atleta || 'Profilo'}) dal carrello di ${account.nomeCompleto}?`,
                                            () => onRimuoviCapoCarrelloUtente && onRimuoviCapoCarrelloUtente(account.id, capo.idUnivoco),
                                            "Rimuovi Capo"
                                          );
                                        }
                                      }}
                                      className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                                      title="Rimuovi dal carrello"
                                    >
                                      <FontAwesomeIcon icon={faTrashCan} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

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
          MODALE ANTEPRIMA CATALOGO
         ======================================================== */}
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

      {/* ========================================================
          MODALE MODIFICA ARTICOLO CATALOGO
         ======================================================== */}
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

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Tipologia Articolo & Taglie
                  </label>
                  <span className="text-[10px] font-black uppercase text-[#002b80] bg-blue-50 px-2 py-0.5 rounded">
                    {(prodottoInModifica.disciplina || settoreUtente).toUpperCase()}
                  </span>
                </div>

                {(() => {
                  const settoreCapo = prodottoInModifica.disciplina || settoreUtente;
                  const scaleSettore = getOpzioniScaleSettore(settoreCapo);
                  const scalaCorrente = prodottoInModifica.scala_taglie_id || scaleSettore[0].id;

                  return (
                    <div>
                      <select
                        value={scalaCorrente}
                        onChange={(e) => {
                          const sceltaId = e.target.value;
                          const lista = getTaglieByScalaId(sceltaId);
                          const isUnica = lista.length === 1 && lista[0] === "Taglia Unica";
                          setProdottoInModifica({
                            ...prodottoInModifica,
                            scala_taglie_id: sceltaId,
                            taglia_unica: isUnica,
                            taglie_disponibili: lista
                          });
                        }}
                        className="w-full h-11 bg-white border border-slate-200 hover:border-[#002b80] focus:border-[#002b80] rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
                      >
                        {scaleSettore.map(scala => (
                          <option key={scala.id} value={scala.id}>
                            {scala.label}
                          </option>
                        ))}
                      </select>

                      <p className="text-[11px] text-slate-400 font-semibold mt-1.5 px-0.5">
                        Taglie disponibili: <strong className="text-slate-700">{getTaglieByScalaId(scalaCorrente).join(', ')}</strong>
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Personalizzazioni Abilitate
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {(prodottoInModifica.disciplina || settoreUtente) === 'nuoto' ? "Solo Nuoto" : "Opzioni consentite"}
                  </span>
                </div>

                {(prodottoInModifica.disciplina || settoreUtente) === 'nuoto' ? (
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

      {/* ========================================================
          MODALE: CREA ORDINE DELEGATO PER ACCOUNT (FULL-VIEWPORT)
         ======================================================== */}
      {accountPerOrdine && (
        <ModalCreaOrdineAdmin
          isOpen={Boolean(accountPerOrdine)}
          onClose={() => setAccountPerOrdine(null)}
          account={accountPerOrdine}
          prodotti={prodotti}
          settoreUtente={settoreUtente}
          onZoomFoto={onZoomFoto}
          onConfermaOrdine={onCreaOrdinePerUtente}
        />
      )}

      {/* ========================================================
          MODALE: MODIFICA PROFILO ATLETA
         ======================================================== */}
      {profiloInModifica && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3.5 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setProfiloInModifica(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-sm shadow-2xs">
                  <FontAwesomeIcon icon={faPenToSquare} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#002b80] block">Amministrazione</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Modifica Profilo Atleta</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setProfiloInModifica(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleSalvaModificaProfilo} className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Nome</label>
                <input 
                  type="text"
                  required
                  value={profiloInModifica.nome}
                  onChange={e => setProfiloInModifica({ ...profiloInModifica, nome: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Cognome</label>
                <input 
                  type="text"
                  required
                  value={profiloInModifica.cognome}
                  onChange={e => setProfiloInModifica({ ...profiloInModifica, cognome: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Categoria</label>
                <select
                  value={profiloInModifica.categoria}
                  onChange={e => setProfiloInModifica({ ...profiloInModifica, categoria: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                >
                  {categorieSettore.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer"
                >
                  Salva Modifiche Profilo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALE: AGGIUNGI PROFILO ATLETA
         ======================================================== */}
      {profiloInCreazione && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3.5 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setProfiloInCreazione(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm shadow-2xs">
                  <FontAwesomeIcon icon={faUserPlus} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Amministrazione</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Nuovo Profilo Atleta</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setProfiloInCreazione(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleSalvaNuovoProfilo} className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Nome</label>
                <input 
                  type="text"
                  required
                  placeholder="Es. Mario"
                  value={profiloInCreazione.nome}
                  onChange={e => setProfiloInCreazione({ ...profiloInCreazione, nome: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Cognome</label>
                <input 
                  type="text"
                  required
                  placeholder="Es. Rossi"
                  value={profiloInCreazione.cognome}
                  onChange={e => setProfiloInCreazione({ ...profiloInCreazione, cognome: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Categoria</label>
                <select
                  value={profiloInCreazione.categoria}
                  onChange={e => setProfiloInCreazione({ ...profiloInCreazione, categoria: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                >
                  {categorieSettore.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer"
                >
                  Aggiungi Profilo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALE: MODIFICA NOMINATIVO ACCOUNT
         ======================================================== */}
      {accountInModifica && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3.5 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setAccountInModifica(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm shadow-2xs">
                  <FontAwesomeIcon icon={faPenToSquare} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">Amministrazione</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Modifica Dati Account</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setAccountInModifica(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleSalvaModificaAccount} className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Email</label>
                <input 
                  type="text"
                  disabled
                  value={accountInModifica.email}
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Nome</label>
                <input 
                  type="text"
                  required
                  value={accountInModifica.nome}
                  onChange={e => setAccountInModifica({ ...accountInModifica, nome: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">Cognome</label>
                <input 
                  type="text"
                  required
                  value={accountInModifica.cognome}
                  onChange={e => setAccountInModifica({ ...accountInModifica, cognome: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer"
                >
                  Salva Modifiche Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALE MODIFICA CAPO NEL CARRELLO UTENTE
         ======================================================== */}
      {capoCarrelloInModifica && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3.5 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setCapoCarrelloInModifica(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#002b80] flex items-center justify-center text-sm shadow-2xs">
                  <FontAwesomeIcon icon={faPenToSquare} />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Modifica Capo nel Carrello
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setCapoCarrelloInModifica(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (onModificaCapoCarrelloUtente) {
                  onModificaCapoCarrelloUtente(capoCarrelloInModifica.utenteIdPadre, capoCarrelloInModifica);
                }
                setCapoCarrelloInModifica(null);
              }}
              className="space-y-3.5 flex-1 overflow-y-auto pr-1"
            >
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Articolo
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={capoCarrelloInModifica.nomeProdotto} 
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* SELEZIONE TAGLIA DA TAGLIE.JS */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Taglia
                </label>
                {taglieDisponibiliCapoInModifica.length === 1 && taglieDisponibiliCapoInModifica[0] === "Taglia Unica" ? (
                  <input 
                    type="text"
                    disabled
                    value="Taglia Unica"
                    className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-600 cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={capoCarrelloInModifica.taglia}
                    onChange={e => setCapoCarrelloInModifica({ ...capoCarrelloInModifica, taglia: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                  >
                    {taglieDisponibiliCapoInModifica.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>

              {capoCarrelloInModifica.nomePersonalizzato !== undefined && capoCarrelloInModifica.nomePersonalizzato !== null && (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Nome Stampato
                  </label>
                  <input 
                    type="text" 
                    value={capoCarrelloInModifica.nomePersonalizzato || ''} 
                    onChange={e => setCapoCarrelloInModifica({ ...capoCarrelloInModifica, nomePersonalizzato: e.target.value.toUpperCase() })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                  />
                </div>
              )}

              {capoCarrelloInModifica.numeroPersonalizzato !== undefined && capoCarrelloInModifica.numeroPersonalizzato !== null && (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Numero Calotta
                  </label>
                  <input 
                    type="text" 
                    value={capoCarrelloInModifica.numeroPersonalizzato || ''} 
                    onChange={e => setCapoCarrelloInModifica({ ...capoCarrelloInModifica, numeroPersonalizzato: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                  />
                </div>
              )}

              {capoCarrelloInModifica.colorePersonalizzato !== undefined && capoCarrelloInModifica.colorePersonalizzato !== null && (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Colore Calotta
                  </label>
                  <select 
                    value={capoCarrelloInModifica.colorePersonalizzato || 'BIANCA'} 
                    onChange={e => setCapoCarrelloInModifica({ ...capoCarrelloInModifica, colorePersonalizzato: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                  >
                    <option value="BIANCA">BIANCA</option>
                    <option value="BLU">BLU</option>
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer"
                >
                  Salva Modifiche Capo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALE SELEZIONE PER TIPOLOGIA (Lavorazione / Pronti Ritiro)
         ======================================================== */}
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