import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Auth from './Auth';
import Navbar from './components/Navbar';
import NegozioUtente from './components/NegozioUtente';
import PannelloAdmin from './components/PannelloAdmin';
import { 
  getOpzioniScaleSettore, 
  getTaglieByScalaId,
  TAGLIA_UNICA,
  TAGLIE_SHORTS_UNISEX,
  TAGLIE_TSHIRT_UNISEX_COMPLETO,
  TAGLIE_PN_COSTUME_DONNA_COMPLETO,
  TAGLIE_NUOTO_COSTUME_DONNA_COMPLETO,
  TAGLIE_PN_COSTUME_UOMO,
  TAGLIE_NUOTO_COSTUME_UOMO
} from './utils/taglie';
import LightboxModal from './components/LightboxModal';
import ModalModificaOrdine from './components/ModalModificaOrdine';
import ModalProfilo from './components/ModalProfilo';
import ModalCarrello from './components/ModalCarrello';
import ModalGuidaPrimoAccesso from './components/ModalGuidaPrimoAccesso';
import CustomModal from './components/CustomModal';
import BannerNotifiche from './components/BannerNotifiche';
import ToastNotification from './components/ToastNotification';
import XLSX from 'xlsx-js-style';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  arrayUnion, 
  writeBatch
} from 'firebase/firestore';
import { faCircleCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// NUOVI LINK PAYPAL AGGIORNATI E SALVATI (senza www)
const PAYPAL_LINKS = {
  pallanuoto: "https://paypal.me/PallanuotoLucca",
  nuoto: "https://paypal.me/CircoloNuotoLucca"
};

// Genera l'URL PayPal.me solo con importo intero, senza decimali e senza valuta
const formattaPaypalLink = (baseUrl, importo) => {
  const pulitoUrl = (baseUrl || '').replace("www.", "");
  const num = Math.round(Number(importo || 0));
  if (num <= 0) return pulitoUrl;

  return `${pulitoUrl}/${num}`;
};

const CATEGORIE_PALLANUOTO = [
  "Maschile", "Femminile", "U18", "U16", "U14", "U12", "Baby", "Extra"
];

const CATEGORIE_NUOTO = [
  "Categoria", "Esordienti A", "Esordienti B", "Esordienti C", "Propaganda Grandi", "Propaganda Esordienti", "Extra"
];

export default function App() {
  const [utenteLoggato, setUtenteLoggato] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [prodotti, setProdotti] = useState([]);
  const [ordiniUtente, setOrdiniUtente] = useState([]);
  const [tuttiGliOrdiniAdmin, setTuttiGliOrdiniAdmin] = useState([]);
  const [archivioOrdiniAdmin, setArchivioOrdiniAdmin] = useState([]);
  const [tuttiGliUtenti, setTuttiGliUtenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckout, setIsCheckout] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [invioProduzioneInCorso, setInvioProduzioneInCorso] = useState(false);
  const [ordineInModifica, setOrdineInModifica] = useState(null);
  const [notificheUtente, setNotificheUtente] = useState([]);
  const [mostraModalProfilo, setMostraModalProfilo] = useState(false);
  const [mostraModalCarrello, setMostraModalCarrello] = useState(false);
  const [mostraGuidaPrimoAccesso, setMostraGuidaPrimoAccesso] = useState(false);
  const [mostraModalSuccessoOrdine, setMostraModalSuccessoOrdine] = useState(false);

  const [settoreScelto, setSettoreScelto] = useState(() => {
    return sessionStorage.getItem("cnl_settore_richiesto") || 'pallanuoto';
  });

  const [toast, setToast] = useState(null);
  const mostraMessaggio = useCallback((titolo, messaggio, tipo = 'success') => {
    setToast({ titolo, messaggio, tipo });
  }, []);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    tipo: 'warning',
    titolo: '',
    messaggio: '',
    onConferma: null,
    testoConferma: 'Conferma',
    testoAnnulla: 'Annulla'
  });

  const chiediConferma = useCallback((titolo, messaggio, callbackConferma, testoConferma = "Procedi") => {
    setModalConfig({
      isOpen: true,
      tipo: 'warning',
      titolo,
      messaggio,
      onConferma: callbackConferma,
      testoConferma
    });
  }, []);

  const [adminTab, setAdminTab] = useState(() => {
    return sessionStorage.getItem("cnl_admin_tab") || 'ordini';
  });
  const [filtroStatoAdmin, setFiltroStatoAdmin] = useState('Tutti');
  const [ricercaAdmin, setRicercaAdmin] = useState('');

  const [nuovoProd, setNuovoProd] = useState({ 
    nome: '', 
    prezzo: '', 
    immagine_url: '', 
    scala_taglie_id: 'pn_calotta_maschile',
    taglia_unica: true,
    taglie_disponibili: ["Taglia Unica"],
    personalizzabile_nome: false, 
    personalizzabile_numero: false, 
    personalizzabile_colore: false
  });
  const [fileImmagine, setFileImmagine] = useState(null);
  const [anteprimaImmagine, setAnteprimaImmagine] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const adminRuolo = useMemo(() => {
    const r = (utenteLoggato?.isAdmin || "").toLowerCase();
    return (r === "pallanuoto" || r === "nuoto" || r === "superadmin") ? r : null;
  }, [utenteLoggato]);

  const isSuperAdmin = adminRuolo === 'superadmin';

  const handleCambiaAdminTab = useCallback((nuovaTab) => {
    if (nuovaTab === 'utenti' && !isSuperAdmin) return;
    setAdminTab(nuovaTab);
    sessionStorage.setItem("cnl_admin_tab", nuovaTab);
  }, [isSuperAdmin]);

  const settoreAttivo = (adminRuolo && !isSuperAdmin) ? adminRuolo : settoreScelto;

  const cambiaSettore = useCallback((nuovoSettore) => {
    if (adminRuolo && !isSuperAdmin) return;
    setSettoreScelto(nuovoSettore);
    sessionStorage.setItem("cnl_settore_richiesto", nuovoSettore);
    
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [adminRuolo, isSuperAdmin]);

  const linkPaypalSettore = PAYPAL_LINKS[settoreAttivo] || PAYPAL_LINKS.pallanuoto;
  const categorieCorrenti = useMemo(() => {
    return settoreAttivo === 'nuoto' ? CATEGORIE_NUOTO : CATEGORIE_PALLANUOTO;
  }, [settoreAttivo]);

  const isUserAdminNelSettore = useMemo(() => {
    return Boolean(isSuperAdmin || (adminRuolo && adminRuolo === settoreAttivo));
  }, [isSuperAdmin, adminRuolo, settoreAttivo]);

  const carrello = useMemo(() => {
    if (!utenteLoggato) return [];
    if (settoreAttivo === 'nuoto') {
      return Array.isArray(utenteLoggato.carrello_nuoto) ? utenteLoggato.carrello_nuoto : [];
    }
    return Array.isArray(utenteLoggato.carrello_pallanuoto) 
      ? utenteLoggato.carrello_pallanuoto 
      : (Array.isArray(utenteLoggato.carrello) ? utenteLoggato.carrello : []);
  }, [utenteLoggato, settoreAttivo]);

  const atletiSettoreAttivo = useMemo(() => {
    if (!utenteLoggato) return [];
    if (settoreAttivo === 'nuoto') {
      return Array.isArray(utenteLoggato.atleti_nuoto) ? utenteLoggato.atleti_nuoto : [];
    }
    return Array.isArray(utenteLoggato.atleti_pallanuoto) 
      ? utenteLoggato.atleti_pallanuoto 
      : (Array.isArray(utenteLoggato.atleti) ? utenteLoggato.atleti : []);
  }, [utenteLoggato, settoreAttivo]);

  useEffect(() => {
    if (!loading && utenteLoggato && !isUserAdminNelSettore) {
      const userId = utenteLoggato.id || utenteLoggato.auth_uid;
      const giaVista = localStorage.getItem(`cnl_guida_vista_${userId}`);

      if (!giaVista && atletiSettoreAttivo.length === 0) {
        const timer = setTimeout(() => {
          setMostraGuidaPrimoAccesso(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [utenteLoggato, loading, isUserAdminNelSettore, atletiSettoreAttivo]);

  const chiudiGuidaPrimoAccesso = useCallback(() => {
    if (utenteLoggato) {
      const userId = utenteLoggato.id || utenteLoggato.auth_uid;
      localStorage.setItem(`cnl_guida_vista_${userId}`, 'true');
    }
    setMostraGuidaPrimoAccesso(false);
  }, [utenteLoggato]);

  const isQualcheModalAperto = Boolean(
    mostraModalCarrello || 
    mostraGuidaPrimoAccesso || 
    mostraModalProfilo || 
    zoomImage || 
    ordineInModifica || 
    modalConfig.isOpen || 
    mostraModalSuccessoOrdine
  );

  useEffect(() => {
    if (!isQualcheModalAperto) return;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isQualcheModalAperto]);

  useEffect(() => {
    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        const userDocRef = doc(db, "utenti", user.uid);
        unsubscribeDoc = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            setAuthError(null);
            setUtenteLoggato({
              id: user.uid,
              auth_uid: user.uid,
              email: user.email,
              isAdmin: data.isAdmin || (data.is_admin ? (data.settore || "pallanuoto") : "no"),
              ...data
            });
            setLoading(false);
          } else {
            setUtenteLoggato(null);
            setLoading(false);
          }
        }, () => setLoading(false));
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setUtenteLoggato(null);
        setOrdiniUtente([]);
        setTuttiGliOrdiniAdmin([]);
        setArchivioOrdiniAdmin([]);
        setTuttiGliUtenti([]);
        setNotificheUtente([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setAdminTab('ordini');
      setFiltroStatoAdmin('Tutti');
      setRicercaAdmin('');
      setSettoreScelto('pallanuoto');
      sessionStorage.removeItem("cnl_settore_richiesto");
      sessionStorage.removeItem("cnl_admin_tab");
      setMostraModalCarrello(false);
      setMostraModalProfilo(false);
      setOrdineInModifica(null);
      await signOut(auth);
    } catch (err) {
      console.error("Errore logout:", err);
    }
  }, []);

  const aggiornaProfilo = async (nuoviDati) => {
    if (!utenteLoggato) return;
    try {
      await updateDoc(doc(db, "utenti", utenteLoggato.id), nuoviDati);
      mostraMessaggio("Profilo Aggiornato", "I tuoi dati sono stati salvati.", "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  };

  const cancellaAccount = async () => {
    if (!utenteLoggato) return;
    try {
      const qOrdiniUtente = query(
        collection(db, "ordini"),
        where("email_acquirente", "==", utenteLoggato.email)
      );
      const snapOrdini = await getDocs(qOrdiniUtente);
      let debitoTotale = 0;
      let capiNonSaldati = 0;

      snapOrdini.forEach(docSnap => {
        const ord = docSnap.data();
        if (ord.stato_pagamento === "Annullato") return;
        if (!ord.pagato) {
          const listaCapi = Array.isArray(ord.articoli) && ord.articoli.length > 0 ? ord.articoli : [ord];
          listaCapi.forEach(capo => {
            debitoTotale += Number(capo.prezzo || ord.prezzo || ord.totale || 0);
            capiNonSaldati++;
          });
        }
      });

      if (capiNonSaldati > 0 || debitoTotale > 0) {
        mostraMessaggio(
          "Cancellazione non consentita",
          `Impossibile eliminare l'account: risultano ${capiNonSaldati} articoli non saldati per un totale di €${debitoTotale.toFixed(2)}.`,
          "warning"
        );
        return;
      }

      if (utenteLoggato.isAdmin && utenteLoggato.isAdmin !== "no" && utenteLoggato.isAdmin !== "superadmin") {
        const qOrdiniAdminSettore = query(
          collection(db, "ordini"),
          where("disciplina", "==", utenteLoggato.isAdmin),
          where("stato_pagamento", "in", ["In attesa", "In lavorazione"])
        );
        const snapAdmin = await getDocs(qOrdiniAdminSettore);
        if (!snapAdmin.empty) {
          mostraMessaggio(
            "Cancellazione Admin Negata",
            `Impossibile eliminare l'account amministratore: risultano ${snapAdmin.size} ordini pendenti/in lavorazione nel settore ${utenteLoggato.isAdmin.toUpperCase()}.`,
            "warning"
          );
          return;
        }
      }
    } catch {
      mostraMessaggio("Errore", "Impossibile verificare lo stato degli ordini. Riprova più tardi.", "error");
      return;
    }

    chiediConferma(
      "CANCELLAZIONE ACCOUNT",
      "Confermi l'eliminazione definitiva del tuo account e di tutti i profili associati? Questa operazione è irreversibile.",
      async () => {
        try {
          const user = auth.currentUser;
          await deleteDoc(doc(db, "utenti", utenteLoggato.id));
          if (user) await deleteUser(user).catch(() => {});
          mostraMessaggio("Account Eliminato", "L'account e tutti i dati associati sono stati rimossi.", "info");
        } catch (err) {
          mostraMessaggio("Errore: " + err.message, "error");
        }
      },
      "Elimina Definitivamente"
    );
  };

  useEffect(() => {
    if (!utenteLoggato || isUserAdminNelSettore) return;
    const qNotif = query(
      collection(db, "utenti", utenteLoggato.id, "notifiche"),
      orderBy("creato_il", "desc")
    );
    const unsubscribe = onSnapshot(qNotif, (snapshot) => {
      setNotificheUtente(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Errore notifiche:", err));

    return () => unsubscribe();
  }, [utenteLoggato, isUserAdminNelSettore]);

  const sollecitiPerSettore = useMemo(() => {
    const stato = { pallanuoto: false, nuoto: false };
    notificheUtente.forEach(n => {
      if (n.tipo === 'sollecito' || Boolean(n.linkPaypal)) {
        const disc = (n.disciplina || 'pallanuoto').toLowerCase();
        if (disc === 'pallanuoto') stato.pallanuoto = true;
        if (disc === 'nuoto') stato.nuoto = true;
      }
    });
    return stato;
  }, [notificheUtente]);

  const notificheSettoreCorrente = useMemo(() => {
    return notificheUtente.filter(n => {
      if (n.tipo === 'sollecito' || Boolean(n.linkPaypal) || n.tipo === 'pronto_ritiro') {
        return (n.disciplina || 'pallanuoto').toLowerCase() === settoreAttivo.toLowerCase();
      }
      return true;
    });
  }, [notificheUtente, settoreAttivo]);

  useEffect(() => {
    if (!utenteLoggato || isUserAdminNelSettore) return;
    const q = query(
      collection(db, "ordini"), 
      where("email_acquirente", "==", utenteLoggato.email),
      where("disciplina", "==", settoreAttivo)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      ords.sort((a, b) => {
        const timeA = a.creato_il?.toMillis ? a.creato_il.toMillis() : new Date(a.creato_il || 0).getTime();
        const timeB = b.creato_il?.toMillis ? b.creato_il.toMillis() : new Date(b.creato_il || 0).getTime();
        return timeB - timeA;
      });
      setOrdiniUtente(ords);
    }, (err) => console.error("Errore ordini utente:", err));

    return () => unsubscribe();
  }, [utenteLoggato, isUserAdminNelSettore, settoreAttivo]);

  useEffect(() => {
    if (!utenteLoggato || !isUserAdminNelSettore) return;
    const q = query(collection(db, "ordini"), where("disciplina", "==", settoreAttivo));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      ords.sort((a, b) => {
        const timeA = a.creato_il?.toMillis ? a.creato_il.toMillis() : new Date(a.creato_il || 0).getTime();
        const timeB = b.creato_il?.toMillis ? b.creato_il.toMillis() : new Date(b.creato_il || 0).getTime();
        return timeB - timeA;
      });
      setTuttiGliOrdiniAdmin(ords);
    }, (err) => console.error("Errore ordini admin:", err));

    return () => unsubscribe();
  }, [utenteLoggato, isUserAdminNelSettore, settoreAttivo]);

  useEffect(() => {
    if (!utenteLoggato || !isUserAdminNelSettore) return;
    const qArchivio = query(
      collection(db, "archivio_ordini"),
      where("disciplina", "==", settoreAttivo)
    );
    const unsubscribe = onSnapshot(qArchivio, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const tA = a.data_archiviazione?.toMillis ? a.data_archiviazione.toMillis() : new Date(a.data_archiviazione || 0).getTime();
        const tB = b.data_archiviazione?.toMillis ? b.data_archiviazione.toMillis() : new Date(b.data_archiviazione || 0).getTime();
        return tB - tA;
      });
      setArchivioOrdiniAdmin(list);
    }, (err) => console.error("Errore fetch archivio:", err));

    return () => unsubscribe();
  }, [utenteLoggato, isUserAdminNelSettore, settoreAttivo]);

  const ordiniAttiviAdmin = useMemo(() => {
    return tuttiGliOrdiniAdmin.filter(o => !o.archiviato);
  }, [tuttiGliOrdiniAdmin]);

  useEffect(() => {
    if (!utenteLoggato || !isUserAdminNelSettore) return;

    const qUtenti = collection(db, "utenti");
    const unsubscribe = onSnapshot(qUtenti, (snapshot) => {
      const users = snapshot.docs
        .filter(d => d.id !== "config_sicurezza_admin")
        .map(d => ({ id: d.id, ...d.data() }));

      users.sort((a, b) => {
        const nomeA = `${a.nome || ''} ${a.cognome || ''}`.trim() || a.email || '';
        const nomeB = `${b.nome || ''} ${b.cognome || ''}`.trim() || b.email || '';
        return nomeA.localeCompare(nomeB, 'it', { sensitivity: 'base' });
      });
      setTuttiGliUtenti(users);
    }, (err) => console.error("Errore fetch utenti:", err));

    return () => unsubscribe();
  }, [utenteLoggato, isUserAdminNelSettore]);

  useEffect(() => {
    if (!utenteLoggato) return;
    const q = query(collection(db, "prodotti"), orderBy("creato_il", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.disciplina === settoreAttivo || p.disciplina === 'entrambi');
      setProdotti(prods);
    }, (error) => console.error("Errore prodotti:", error));

    return () => unsubscribe();
  }, [utenteLoggato, settoreAttivo]);

  const aggiungiAtletaFamiglia = async (nuovoAtleta) => {
    if (!utenteLoggato) return;
    const campoAtleti = settoreAttivo === 'nuoto' ? "atleti_nuoto" : "atleti_pallanuoto";

    try {
      const userRef = doc(db, "utenti", utenteLoggato.id);
      await updateDoc(userRef, {
        [campoAtleti]: arrayUnion(nuovoAtleta)
      });
      mostraMessaggio("Profilo Aggiunto", `Profilo registrato per ${settoreAttivo.toUpperCase()}.`, "success");
      setMostraGuidaPrimoAccesso(false);
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  };

  const modificaAtletaFamiglia = useCallback(async (vecchioAtleta, nuoviDati) => {
    if (!utenteLoggato) return;
    const campoAtleti = settoreAttivo === 'nuoto' ? "atleti_nuoto" : "atleti_pallanuoto";
    const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";

    const vecchioNome = typeof vecchioAtleta === 'object'
      ? `${vecchioAtleta.nome || ''} ${vecchioAtleta.cognome || ''}`.trim()
      : String(vecchioAtleta).trim();

    const nuovoNome = `${nuoviDati.nome} ${nuoviDati.cognome}`.trim();

    try {
      const userRef = doc(db, "utenti", utenteLoggato.id);
      const listaAtletiVecchia = settoreAttivo === 'nuoto'
        ? (utenteLoggato.atleti_nuoto || [])
        : (utenteLoggato.atleti_pallanuoto || utenteLoggato.atleti || []);

      const nuovaListaAtleti = listaAtletiVecchia.map(a => {
        const n = typeof a === 'object' ? `${a.nome || ''} ${a.cognome || ''}`.trim() : String(a).trim();
        if (n.toLowerCase() === vecchioNome.toLowerCase()) {
          return { ...nuoviDati };
        }
        return a;
      });

      const carrelloAttuale = carrello.map(item => {
        if ((item.atleta || '').toLowerCase() === vecchioNome.toLowerCase()) {
          return {
            ...item,
            atleta: nuovoNome,
            categoria: nuoviDati.categoria
          };
        }
        return item;
      });

      await updateDoc(userRef, {
        [campoAtleti]: nuovaListaAtleti,
        [campoCarrello]: carrelloAttuale
      });

      const ordiniDaAggiornare = ordiniUtente.filter(o => o.stato_pagamento === "In attesa");
      if (ordiniDaAggiornare.length > 0) {
        const batch = writeBatch(db);
        let count = 0;

        ordiniDaAggiornare.forEach(ord => {
          let modificato = false;
          let articoliAgg = ord.articoli || [];

          if (articoliAgg.length > 0) {
            articoliAgg = articoliAgg.map(art => {
              if ((art.atleta || '').toLowerCase() === vecchioNome.toLowerCase()) {
                modificato = true;
                return { ...art, atleta: nuovoNome, categoria: nuoviDati.categoria };
              }
              return art;
            });
          } else if ((ord.atleta || '').toLowerCase() === vecchioNome.toLowerCase()) {
            modificato = true;
          }

          if (modificato) {
            count++;
            batch.update(doc(db, "ordini", ord.id), {
              atleta: nuovoNome,
              categoria: nuoviDati.categoria,
              articoli: articoliAgg,
              aggiornato_il: serverTimestamp()
            });
          }
        });

        if (count > 0) await batch.commit();
      }

      mostraMessaggio("Profilo Aggiornato", `Dati aggiornati per ${nuovoNome}.`, "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  }, [utenteLoggato, settoreAttivo, carrello, ordiniUtente, mostraMessaggio]);

  const rimuoviAtletaFamiglia = useCallback(async (atletaDaRimuovere) => {
    if (!utenteLoggato) return;
    const campoAtleti = settoreAttivo === 'nuoto' ? "atleti_nuoto" : "atleti_pallanuoto";
    
    const nomeVisualizzato = typeof atletaDaRimuovere === 'object' 
      ? `${atletaDaRimuovere.nome || ''} ${atletaDaRimuovere.cognome || ''}`.trim() 
      : String(atletaDaRimuovere).trim();

    const categoriaTarget = typeof atletaDaRimuovere === 'object' ? (atletaDaRimuovere.categoria || '').trim().toLowerCase() : '';

    const pulisciNome = (str) => {
      if (!str) return '';
      return String(str).replace(/\(.*?\)/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    };

    const targetPulito = pulisciNome(nomeVisualizzato);

    const capiNelCarrello = carrello.filter(item => {
      const nomeCart = pulisciNome(item.atleta || '');
      return nomeCart === targetPulito;
    });

    if (capiNelCarrello.length > 0) {
      mostraMessaggio(
        "Capo nel Carrello", 
        `Rimuovi prima dal carrello gli articoli di ${settoreAttivo.toUpperCase()} intestati a "${nomeVisualizzato}".`, 
        "warning"
      );
      return;
    }

    try {
      const qVerifica = query(
        collection(db, "ordini"), 
        where("email_acquirente", "==", utenteLoggato.email),
        where("disciplina", "==", settoreAttivo)
      );
      const snapOrdini = await getDocs(qVerifica);
      let haOrdiniAttivi = false;
      let numeroCapiTrovati = 0;

      snapOrdini.forEach(docSnap => {
        const ord = docSnap.data();
        if (ord.stato_pagamento === "Annullato") return;

        const listaCapi = Array.isArray(ord.articoli) && ord.articoli.length > 0 ? ord.articoli : [ord];
        listaCapi.forEach(capo => {
          const nomeCapo = pulisciNome(capo.atleta || ord.atleta || '');
          if (nomeCapo && nomeCapo === targetPulito) {
            haOrdiniAttivi = true;
            numeroCapiTrovati++;
          }
        });
      });

      if (haOrdiniAttivi) {
        mostraMessaggio(
          "Eliminazione non consentita", 
          `Impossibile eliminare "${nomeVisualizzato}": ci sono ${numeroCapiTrovati} capi ordinati a suo nome per ${settoreAttivo.toUpperCase()}. Elimina o annulla prima gli ordini pendenti.`, 
          "warning"
        );
        return;
      }
    } catch (err) {
      console.error("Errore verifica ordini profilo:", err);
    }

    chiediConferma(
      "Elimina Profilo",
      `Confermi l'eliminazione definitiva del profilo "${nomeVisualizzato}" dal settore ${settoreAttivo.toUpperCase()}?`,
      async () => {
        try {
          const userRef = doc(db, "utenti", utenteLoggato.id);
          const listaAttuale = settoreAttivo === 'nuoto' 
            ? (utenteLoggato.atleti_nuoto || []) 
            : (utenteLoggato.atleti_pallanuoto || utenteLoggato.atleti || []);

          const nuovaLista = listaAttuale.filter(a => {
            const n = typeof a === 'object' ? `${a.nome || ''} ${a.cognome || ''}`.trim() : String(a).trim();
            const cat = typeof a === 'object' ? (a.categoria || '').trim().toLowerCase() : '';
            const matchNome = pulisciNome(n) === targetPulito;
            const matchCat = categoriaTarget ? cat === categoriaTarget : true;
            return !(matchNome && matchCat);
          });

          await updateDoc(userRef, { [campoAtleti]: nuovaLista });
          mostraMessaggio("Profilo Rimosso", `Il profilo di ${nomeVisualizzato} è stato rimosso da ${settoreAttivo.toUpperCase()}.`, "info");
        } catch (err) {
          mostraMessaggio("Errore: " + err.message, "error");
        }
      },
      "Elimina"
    );
  }, [utenteLoggato, settoreAttivo, carrello, chiediConferma, mostraMessaggio]);

  const caricaImmagineSuCloudinary = async (file) => {
    const CLOUD_NAME = "vygiohsj";
    const UPLOAD_PRESET = "cnl_preset";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "cnl_shop");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Errore upload immagine.");
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileImmagine(file);
      setAnteprimaImmagine(URL.createObjectURL(file));
    }
  };

  const rimuoviFileSelezionato = () => {
    setFileImmagine(null);
    setAnteprimaImmagine(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const creaProdottoAdmin = useCallback(async () => {
    if (!nuovoProd.nome.trim() || !nuovoProd.prezzo) {
      mostraMessaggio("Campi Mancanti", "Inserisci nome e prezzo del capo.", "warning");
      return;
    }
    setUploadingImage(true);
    try {
      let imageUrl = nuovoProd.immagine_url?.trim() || null;
      if (fileImmagine) {
        imageUrl = await caricaImmagineSuCloudinary(fileImmagine);
      }

      const scaleSettore = getOpzioniScaleSettore(settoreAttivo);
      const scalaId = nuovoProd.scala_taglie_id || scaleSettore[0].id;
      const taglieFinali = getTaglieByScalaId(scalaId);
      const isUnica = taglieFinali.length === 1 && taglieFinali[0] === "Taglia Unica";

      const batchRef = collection(db, "prodotti");
      await setDoc(doc(batchRef), {
        nome: nuovoProd.nome.trim(),
        prezzo: parseFloat(nuovoProd.prezzo) || 0,
        disciplina: settoreAttivo,
        immagine_url: imageUrl,
        attivo: true,
        scala_taglie_id: scalaId,
        taglia_unica: isUnica,
        taglie_disponibili: taglieFinali,
        personalizzabile_nome: Boolean(nuovoProd.personalizzabile_nome),
        personalizzabile_numero: settoreAttivo === 'nuoto' ? false : Boolean(nuovoProd.personalizzabile_numero),
        personalizzabile_colore: settoreAttivo === 'nuoto' ? false : Boolean(nuovoProd.personalizzabile_colore),
        creato_il: serverTimestamp()
      });

      setNuovoProd({ 
        nome: '', 
        prezzo: '', 
        immagine_url: '', 
        scala_taglie_id: scaleSettore[0].id,
        taglia_unica: scaleSettore[0].taglie.length === 1 && scaleSettore[0].taglie[0] === "Taglia Unica",
        taglie_disponibili: scaleSettore[0].taglie,
        personalizzabile_nome: false, 
        personalizzabile_numero: false, 
        personalizzabile_colore: false
      });
      rimuoviFileSelezionato();
      mostraMessaggio("Capo Creato", "Articolo pubblicato con successo nel catalogo.", "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    } finally {
      setUploadingImage(false);
    }
  }, [nuovoProd, fileImmagine, settoreAttivo, mostraMessaggio]);

  const modificaProdottoAdmin = useCallback(async (prodottoId, datiAggiornati) => {
    try {
      await updateDoc(doc(db, "prodotti", prodottoId), {
        ...datiAggiornati,
        aggiornato_il: serverTimestamp()
      });
      mostraMessaggio("Aggiornato", "Articolo modificato con successo.", "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  }, [mostraMessaggio]);

  const toggleVisibilitaProdottoAdmin = useCallback(async (prodottoId, nuovoStato) => {
    try {
      await updateDoc(doc(db, "prodotti", prodottoId), { attivo: nuovoStato });
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  }, [mostraMessaggio]);

  const eliminaProdottoAdmin = useCallback(async (id) => {
    const prodDaEliminare = prodotti.find(p => p.id === id);
    const nomeProdTarget = (prodDaEliminare?.nome || '').trim().toLowerCase();

    try {
      const qOrdini = query(
        collection(db, "ordini"),
        where("disciplina", "==", settoreAttivo)
      );
      const snapOrdini = await getDocs(qOrdini);
      let ordiniTrovati = 0;

      snapOrdini.forEach(docSnap => {
        const ord = docSnap.data();
        if (ord.stato_pagamento === "Annullato") return;

        const listaCapi = Array.isArray(ord.articoli) && ord.articoli.length > 0 
          ? ord.articoli 
          : [ord];

        const presente = listaCapi.some(capo => {
          const matchId = capo.prodottoId && capo.prodottoId === id;
          const matchNome = (capo.nomeProdotto || '').trim().toLowerCase() === nomeProdTarget;
          return matchId || matchNome;
        });

        if (presente) ordiniTrovati++;
      });

      if (ordiniTrovati > 0) {
        mostraMessaggio(
          "Eliminazione non consentita",
          `Impossibile eliminare "${prodDaEliminare?.nome || 'questo articolo'}": risulta presente in ${ordiniTrovati} ${ordiniTrovati === 1 ? 'ordine' : 'ordini'}. Puoi nasconderlo dal catalogo usando il tasto Nascondi.`,
          "warning"
        );
        return;
      }
    } catch (err) {
      console.error("Errore verifica ordini per eliminazione prodotto:", err);
      mostraMessaggio("Errore", "Impossibile verificare lo storico degli ordini. Riprova più tardi.", "error");
      return;
    }

    chiediConferma(
      "Elimina Articolo",
      `Confermi l'eliminazione definitiva di "${prodDaEliminare?.nome || 'questo articolo'}" dal catalogo?`,
      async () => {
        try {
          await deleteDoc(doc(db, "prodotti", id));
          mostraMessaggio("Eliminato", "Articolo rimosso definitivamente dal catalogo.", "info");
        } catch (err) { 
          mostraMessaggio("Errore: " + err.message, "error"); 
        }
      },
      "Elimina"
    );
  }, [prodotti, settoreAttivo, chiediConferma, mostraMessaggio]);

  const aggiungiAlCarrello = useCallback(async (item) => {
    if (!utenteLoggato) return;
    const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";

    try {
      const userRef = doc(db, "utenti", utenteLoggato.id);
      await updateDoc(userRef, { [campoCarrello]: arrayUnion(item) });
      mostraMessaggio("Carrello", `${item.nomeProdotto} aggiunto al carrello.`, "success");
    } catch (err) {
      console.error("Errore aggiornamento carrello:", err);
    }
  }, [utenteLoggato, settoreAttivo, mostraMessaggio]);

  const aggiornaCarrelloItem = useCallback(async (itemModificato) => {
    if (!utenteLoggato) return;
    const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";

    const carrelloAggiornato = carrello.map(item => {
      if (item.idUnivoco === itemModificato.idUnivoco) {
        return { ...itemModificato };
      }
      return item;
    });

    try {
      const userRef = doc(db, "utenti", utenteLoggato.id);
      await updateDoc(userRef, { [campoCarrello]: carrelloAggiornato });
      mostraMessaggio("Carrello Aggiornato", "Articolo modificato con successo.", "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  }, [utenteLoggato, settoreAttivo, carrello, mostraMessaggio]);

  const rimuoviDalCarrello = useCallback(async (idUnivoco) => {
    if (!utenteLoggato) return;
    const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";
    const carrelloAttuale = carrello.filter(item => item.idUnivoco !== idUnivoco);

    try {
      const userRef = doc(db, "utenti", utenteLoggato.id);
      await updateDoc(userRef, { [campoCarrello]: carrelloAttuale });
    } catch (err) {
      console.error("Errore rimozione capo carrello:", err);
    }
  }, [utenteLoggato, settoreAttivo, carrello]);

  const totaleCarrello = useMemo(() => carrello.reduce((acc, item) => acc + item.prezzo, 0), [carrello]);

  const gestisciCheckout = useCallback(() => {
    if (!utenteLoggato || carrello.length === 0) return;
    const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";

    chiediConferma(
      "Conferma Ordine",
      `Confermi l'invio di ${carrello.length} ${carrello.length === 1 ? 'capo' : 'capi'} per il settore ${settoreAttivo.toUpperCase()} (€${totaleCarrello.toFixed(2)})? L'ordine verrà registrato nel sistema.`,
      async () => {
        setIsCheckout(true);
        try {
          const batch = writeBatch(db);
          const ordiniColRef = collection(db, "ordini");

          carrello.forEach((item) => {
            const newOrdRef = doc(ordiniColRef);
            batch.set(newOrdRef, {
              ...item,
              totale: item.prezzo,
              disciplina: settoreAttivo,
              stato_pagamento: "In attesa",
              pagato: false,
              completato: false,
              archiviato: false,
              utente_id: utenteLoggato.id,
              acquirente: `${utenteLoggato.nome || ''} ${utenteLoggato.cognome || ''}`.trim() || utenteLoggato.email,
              email_acquirente: utenteLoggato.email,
              articoli: [item],
              creato_il: serverTimestamp()
            });
          });

          const userRef = doc(db, "utenti", utenteLoggato.id);
          batch.update(userRef, { [campoCarrello]: [] });
          await batch.commit();

          setMostraModalCarrello(false);
          setMostraModalSuccessoOrdine(true);
        } catch (error) { 
          mostraMessaggio("Errore: " + error.message, "error"); 
        } finally { 
          setIsCheckout(false); 
        }
      },
      "Conferma e Invia"
    );
  }, [carrello, totaleCarrello, utenteLoggato, settoreAttivo, chiediConferma, mostraMessaggio]);

  // EXCEL EXPORT BASATO SU SCALE DI TAGLIE.JS
  const generaFileXlsx = useCallback((ordiniDaElaborare) => {
    const tuttiArticoli = [];
    ordiniDaElaborare.forEach(ord => {
      if (ord.articoli && ord.articoli.length > 0) {
        ord.articoli.forEach(art => tuttiArticoli.push({ 
          ...art, 
          atleta: art.atleta || ord.atleta || "-"
        }));
      } else {
        tuttiArticoli.push({
          nomeProdotto: ord.nomeProdotto,
          taglia: ord.taglia,
          atleta: ord.atleta || "-",
          nomePersonalizzato: ord.nomePersonalizzato,
          numeroPersonalizzato: ord.numeroPersonalizzato,
          colorePersonalizzato: ord.colorePersonalizzato
        });
      }
    });

    const isNuoto = settoreAttivo === 'nuoto';
    const nomeSettoreTitolo = isNuoto ? 'NUOTO' : 'PALLANUOTO';
    const wb = XLSX.utils.book_new();

    const sequenzaCanonicaTaglie = Array.from(new Set([
      ...TAGLIA_UNICA,
      ...TAGLIE_TSHIRT_UNISEX_COMPLETO.filter(t => t.toLowerCase().includes('junior')),
      ...TAGLIE_PN_COSTUME_DONNA_COMPLETO.filter(t => t.toLowerCase().includes('junior')),
      ...TAGLIE_NUOTO_COSTUME_DONNA_COMPLETO.filter(t => t.toLowerCase().includes('junior')),
      ...TAGLIE_SHORTS_UNISEX,
      ...TAGLIE_NUOTO_COSTUME_UOMO,
      ...TAGLIE_PN_COSTUME_UOMO,
      ...TAGLIE_TSHIRT_UNISEX_COMPLETO,
      ...TAGLIE_PN_COSTUME_DONNA_COMPLETO,
      ...TAGLIE_NUOTO_COSTUME_DONNA_COMPLETO
    ]));

    const confrontaTaglie = (tagliaA, tagliaB) => {
      const a = (tagliaA || "Taglia Unica").trim();
      const b = (tagliaB || "Taglia Unica").trim();

      if (a === b) return 0;

      const idxA = sequenzaCanonicaTaglie.findIndex(t => t.toLowerCase() === a.toLowerCase());
      const idxB = sequenzaCanonicaTaglie.findIndex(t => t.toLowerCase() === b.toLowerCase());

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    };

    const blackBorders = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const styleBanner = {
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "001F54" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: blackBorders
    };

    const styleSezioneTitle = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: blackBorders
    };

    const styleHeaderCol = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "E2E8F0" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: blackBorders
    };

    const styleHeaderTotal = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "001F54" } },
      fill: { fgColor: { rgb: "BFDBFE" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: blackBorders
    };

    const styleCella = (alt, align = "center", bold = false, isDimmed = false) => ({
      font: { 
        name: "Calibri", 
        sz: 10, 
        bold: bold, 
        color: { rgb: isDimmed ? "64748B" : (bold ? "0F172A" : "1E293B") } 
      },
      fill: { fgColor: { rgb: alt ? "F8FAFC" : "FFFFFF" } },
      alignment: { horizontal: align, vertical: "center" },
      border: blackBorders
    });

    const styleCellaZero = {
      font: { name: "Calibri", sz: 10, color: { rgb: "94A3B8" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: blackBorders
    };

    const nomiProdottiUnivoci = Array.from(new Set(tuttiArticoli.map(a => a.nomeProdotto || "Capo")));
    const numCols1 = nomiProdottiUnivoci.length + 2;

    const tagliePresentiSet = new Set(tuttiArticoli.map(a => (a.taglia || "Taglia Unica").trim()));
    const elencoTaglieOrdinate = Array.from(tagliePresentiSet).sort(confrontaTaglie);

    const dataWs1 = [
      [{ v: `CIRCOLO NUOTO LUCCA - ${nomeSettoreTitolo}`, s: styleBanner }, ...Array(numCols1 - 1).fill({ v: "", s: styleBanner })],
      [{ v: "Taglia", s: styleHeaderCol }, ...nomiProdottiUnivoci.map(p => ({ v: p, s: styleHeaderCol })), { v: "Totale", s: styleHeaderTotal }]
    ];

    const totaliPerProdotto = {};
    nomiProdottiUnivoci.forEach(p => { totaliPerProdotto[p] = 0; });
    let totaleGenerale = 0;

    elencoTaglieOrdinate.forEach((taglia, idx) => {
      const alt = idx % 2 !== 0;
      let sommaRiga = 0;
      const riga = [{ v: taglia, s: styleCella(alt, "left", true) }];

      nomiProdottiUnivoci.forEach(nomeProd => {
        const conteggio = tuttiArticoli.filter(a => {
          const tagliaArt = (a.taglia || "Taglia Unica").trim().toLowerCase();
          return a.nomeProdotto === nomeProd && tagliaArt === taglia.toLowerCase();
        }).length;
        totaliPerProdotto[nomeProd] += conteggio;
        sommaRiga += conteggio;

        if (conteggio === 0) {
          riga.push({ v: "-", t: "s", s: styleCellaZero });
        } else {
          riga.push({ v: conteggio, t: "n", s: styleCella(alt, "center", false) });
        }
      });

      totaleGenerale += sommaRiga;
      riga.push({ v: sommaRiga, t: "n", s: styleHeaderTotal });
      dataWs1.push(riga);
    });

    dataWs1.push([
      { v: "TOTALE", s: styleHeaderTotal },
      ...nomiProdottiUnivoci.map(p => ({ v: totaliPerProdotto[p], t: "n", s: styleHeaderTotal })),
      { v: totaleGenerale, t: "n", s: styleHeaderTotal }
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(dataWs1);
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols1 - 1 } }];
    ws1['!cols'] = [{ wch: 18 }, ...nomiProdottiUnivoci.map(() => ({ wch: 22 })), { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Riepilogo Taglie");

    const NUM_COLS_2 = 4;
    const dataWs2 = [
      [{ v: `CIRCOLO NUOTO LUCCA - ${nomeSettoreTitolo}`, s: styleBanner }, ...Array(NUM_COLS_2 - 1).fill({ v: "", s: styleBanner })]
    ];
    let rigaCorrente = 1;
    const mergesWs2 = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS_2 - 1 } }];

    const gruppiPersonalizzatiPerArticolo = new Map();

    tuttiArticoli.forEach(art => {
      const haNome = Boolean(art.nomePersonalizzato && String(art.nomePersonalizzato).trim() !== "");
      const haNumero = Boolean(art.numeroPersonalizzato && String(art.numeroPersonalizzato).trim() !== "");
      const haColore = Boolean(art.colorePersonalizzato && String(art.colorePersonalizzato).trim() !== "");

      if (haNome || haNumero || haColore) {
        const nomeArticolo = (art.nomeProdotto || "Articolo").trim();
        if (!gruppiPersonalizzatiPerArticolo.has(nomeArticolo)) {
          gruppiPersonalizzatiPerArticolo.set(nomeArticolo, []);
        }
        gruppiPersonalizzatiPerArticolo.get(nomeArticolo).push(art);
      }
    });

    if (gruppiPersonalizzatiPerArticolo.size === 0) {
      dataWs2.push([
        { v: "Nessun articolo con personalizzazioni registrato per questo ordine.", s: styleCella(false, "left") },
        ...Array(NUM_COLS_2 - 1).fill({ v: "", s: styleCella(false) })
      ]);
      mergesWs2.push({ s: { r: rigaCorrente, c: 0 }, e: { r: rigaCorrente, c: NUM_COLS_2 - 1 } });
    } else {
      let sezioneIndex = 1;

      gruppiPersonalizzatiPerArticolo.forEach((listaCapi, nomeArticolo) => {
        listaCapi.sort((a, b) => {
          const cmpTaglia = confrontaTaglie(a.taglia, b.taglia);
          if (cmpTaglia !== 0) return cmpTaglia;

          const numA = parseInt(a.numeroPersonalizzato, 10);
          const numB = parseInt(b.numeroPersonalizzato, 10);
          const hasNumA = !isNaN(numA);
          const hasNumB = !isNaN(numB);

          if (hasNumA && hasNumB) {
            if (numA !== numB) return numA - numB;
          } else if (hasNumA) {
            return -1;
          } else if (hasNumB) {
            return 1;
          }

          const atlA = (a.atleta || '').trim();
          const atlB = (b.atleta || '').trim();
          return atlA.localeCompare(atlB, 'it', { sensitivity: 'base' });
        });

        const articoloUsaNome = listaCapi.some(a => a.nomePersonalizzato && String(a.nomePersonalizzato).trim() !== "");
        const articoloUsaNumero = listaCapi.some(a => a.numeroPersonalizzato && String(a.numeroPersonalizzato).trim() !== "");
        const articoloUsaColore = listaCapi.some(a => a.colorePersonalizzato && String(a.colorePersonalizzato).trim() !== "");

        dataWs2.push([
          { v: `${sezioneIndex}. ${nomeArticolo.toUpperCase()} (${listaCapi.length} CAPI)`, s: styleSezioneTitle },
          ...Array(NUM_COLS_2 - 1).fill({ v: "", s: styleSezioneTitle })
        ]);
        mergesWs2.push({ s: { r: rigaCorrente, c: 0 }, e: { r: rigaCorrente, c: NUM_COLS_2 - 1 } });
        rigaCorrente++;

        dataWs2.push([
          { v: "Taglia", s: styleHeaderCol },
          { v: "Nome Stampato", s: articoloUsaNome ? styleHeaderTotal : styleHeaderCol },
          { v: "N° Calotta", s: articoloUsaNumero ? styleHeaderTotal : styleHeaderCol },
          { v: "Colore Calotta", s: articoloUsaColore ? styleHeaderTotal : styleHeaderCol }
        ]);
        rigaCorrente++;

        listaCapi.forEach((art, idx) => {
          const alt = idx % 2 !== 0;

          const valoreNome = articoloUsaNome 
            ? (art.nomePersonalizzato ? String(art.nomePersonalizzato).toUpperCase().trim() : "-")
            : "-";

          const valoreNumero = articoloUsaNumero 
            ? (art.numeroPersonalizzato ? `N° ${art.numeroPersonalizzato}` : "-")
            : "-";

          const valoreColore = articoloUsaColore 
            ? (art.colorePersonalizzato ? String(art.colorePersonalizzato).toUpperCase().trim() : "BIANCA")
            : "-";

          dataWs2.push([
            { v: art.taglia || "Taglia Unica", s: styleCella(alt, "center", true) },
            { v: valoreNome, s: styleCella(alt, "center", articoloUsaNome && valoreNome !== "-", !articoloUsaNome) },
            { v: valoreNumero, s: styleCella(alt, "center", articoloUsaNumero && valoreNumero !== "-", !articoloUsaNumero) },
            { v: valoreColore, s: styleCella(alt, "center", articoloUsaColore && valoreColore !== "-", !articoloUsaColore) }
          ]);
          rigaCorrente++;
        });

        sezioneIndex++;
      });
    }

    const ws2 = XLSX.utils.aoa_to_sheet(dataWs2);
    ws2['!merges'] = mergesWs2;
    ws2['!cols'] = [
      { wch: 14 },
      { wch: 32 },
      { wch: 16 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Personalizzazioni");

    return wb;
  }, [settoreAttivo]);

  const mandaInLavorazioneConEmail = useCallback(async (ordiniSelezionati) => {
    const daAggiornare = ordiniSelezionati && ordiniSelezionati.length > 0 
      ? ordiniSelezionati 
      : ordiniAttiviAdmin.filter(o => o.stato_pagamento === "In attesa");

    if (daAggiornare.length === 0) return;

    setInvioProduzioneInCorso(true);
    try {
      const batch = writeBatch(db);
      daAggiornare.forEach(ord => {
        batch.update(doc(db, "ordini", ord.id), { 
          stato_pagamento: "In lavorazione",
          completato: false,
          inviato_produzione_il: serverTimestamp()
        });
      });
      await batch.commit();

      const wb = generaFileXlsx(daAggiornare);
      const nomeFile = `ORDINE_${settoreAttivo.toUpperCase()}_LUCCA.xlsx`;
      XLSX.writeFile(wb, nomeFile);

      const emailFornitore = "marcoardito.okeo@gmail.com";
      const emailFornitore2 = "lencioni.stefano@libero.it";

      const oggettoEmail = encodeURIComponent(`Ordine Materiale ${settoreAttivo.toUpperCase()} - Circolo Nuoto Lucca`);
      
      const corpoEmail = encodeURIComponent(
`Spettabili Marco e Stefano,

in allegato trasmettiamo il file riepilogativo relativo ai capi ordinati per il settore ${settoreAttivo.toUpperCase()}.

Dettaglio fornitura:
- Capi totali ordinati: ${daAggiornare.length}
- File allegato: ${nomeFile}

Restiamo a disposizione per qualsiasi chiarimento.

Cordiali saluti,
ASD Circolo Nuoto Lucca`
      );

      setTimeout(() => {
        window.location.href = `mailto:${emailFornitore},${emailFornitore2}?subject=${oggettoEmail}&body=${corpoEmail}`;
      }, 400);

      mostraMessaggio("In Lavorazione", `${daAggiornare.length} articoli inoltrati. File scaricato ed email pronta.`, "success");
    } catch (error) {
      mostraMessaggio("Errore: " + error.message, "error");
    } finally {
      setInvioProduzioneInCorso(false);
    }
  }, [ordiniAttiviAdmin, settoreAttivo, generaFileXlsx, mostraMessaggio]);

  const impostaProntiRitiroAdmin = useCallback(async (ordiniSelezionati) => {
    const daAggiornare = ordiniSelezionati && ordiniSelezionati.length > 0
      ? ordiniSelezionati
      : ordiniAttiviAdmin.filter(o => o.stato_pagamento === "In lavorazione");

    if (daAggiornare.length === 0) return;

    try {
      const batch = writeBatch(db);
      const riepilogoPerCliente = new Map();

      daAggiornare.forEach(ord => {
        batch.update(doc(db, "ordini", ord.id), {
          stato_pagamento: "Pronto per il ritiro",
          pronto_ritiro_il: serverTimestamp(),
          aggiornato_il: serverTimestamp()
        });

        const emailKey = (ord.email_acquirente || '').trim().toLowerCase();
        const uidKey = ord.utente_id || null;
        const chiaveGruppo = uidKey || emailKey;
        if (!chiaveGruppo) return;

        if (!riepilogoPerCliente.has(chiaveGruppo)) {
          riepilogoPerCliente.set(chiaveGruppo, {
            uid: uidKey,
            email: emailKey,
            tipologie: new Set(),
            profili: new Set()
          });
        }

        const entry = riepilogoPerCliente.get(chiaveGruppo);
        const listaCapi = Array.isArray(ord.articoli) && ord.articoli.length > 0 ? ord.articoli : [ord];
        listaCapi.forEach(capo => {
          const nomeTip = (capo.nomeProdotto || ord.nomeProdotto || '').trim();
          const nomeProf = (capo.atleta || ord.atleta || '').trim();
          if (nomeTip) entry.tipologie.add(nomeTip);
          if (nomeProf) entry.profili.add(nomeProf);
        });
      });

      await batch.commit();

      for (const [, info] of riepilogoPerCliente.entries()) {
        let uid = info.uid;
        if (!uid && info.email) {
          const qUser = query(collection(db, "utenti"), where("email", "==", info.email));
          const snapUser = await getDocs(qUser);
          if (!snapUser.empty) uid = snapUser.docs[0].id;
        }
        if (!uid) continue;

        const tipologieArr = Array.from(info.tipologie);
        const profiliArr = Array.from(info.profili);
        const testoTipologie = tipologieArr.length > 0 ? tipologieArr.join(', ') : 'Articoli';
        const testoProfili = profiliArr.length > 0 ? ` per ${profiliArr.join(', ')}` : '';

        const notifRef = doc(db, "utenti", uid, "notifiche", `pronto_ritiro_${settoreAttivo.toLowerCase()}`);
        await setDoc(notifRef, {
          tipo: 'pronto_ritiro',
          titolo: 'Materiale Pronto per il Ritiro',
          messaggio: `È arrivato il materiale (${testoTipologie}) ordinato${testoProfili} per il settore ${settoreAttivo.toUpperCase()}.`,
          tipologie: tipologieArr,
          profili: profiliArr,
          disciplina: settoreAttivo,
          letto: false,
          creato_il: serverTimestamp(),
          aggiornato_il: serverTimestamp()
        }, { merge: true });
      }

      mostraMessaggio(
        "Pronti al Ritiro", 
        `${daAggiornare.length} articoli impostati come pronti per la consegna e notifiche inviate.`, 
        "success"
      );
    } catch (error) {
      console.error("Errore aggiornamento pronti al ritiro:", error);
      mostraMessaggio("Errore: " + error.message, "error");
    }
  }, [ordiniAttiviAdmin, settoreAttivo, mostraMessaggio]);

  const esportaCsvAdmin = useCallback(() => {
    try {
      if (ordiniAttiviAdmin.length === 0) return;
      const wb = generaFileXlsx(ordiniAttiviAdmin);
      XLSX.writeFile(wb, `ORDINE_${settoreAttivo.toUpperCase()}_LUCCA.xlsx`);
      mostraMessaggio("Esportato", "File scaricato con successo.", "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  }, [ordiniAttiviAdmin, settoreAttivo, generaFileXlsx, mostraMessaggio]);

  const archiviaOrdineCorrenteAdmin = useCallback(async (titoloArchivio) => {
    const daArchiviare = ordiniAttiviAdmin;
    if (daArchiviare.length === 0) {
      mostraMessaggio("Nessun Ordine", "Non ci sono ordini attivi da archiviare.", "warning");
      return;
    }

    const nomeLotto = (titoloArchivio || `Ordine ${new Date().toLocaleDateString('it-IT')}`).trim();

    try {
      const batch = writeBatch(db);
      const archivioRef = doc(collection(db, "archivio_ordini"));
      const totaleValore = daArchiviare.reduce((acc, o) => acc + Number(o.prezzo || o.totale || 0), 0);
      const totalePagato = daArchiviare.reduce((acc, o) => acc + (o.pagato ? Number(o.prezzo || o.totale || 0) : 0), 0);

      batch.set(archivioRef, {
        titolo: nomeLotto,
        disciplina: settoreAttivo,
        totale_capi: daArchiviare.length,
        valore_totale: totaleValore,
        incasso_saldato: totalePagato,
        ordini_ids: daArchiviare.map(o => o.id),
        data_archiviazione: serverTimestamp()
      });

      daArchiviare.forEach(ord => {
        batch.update(doc(db, "ordini", ord.id), {
          archiviato: true,
          lotto_archivio: nomeLotto,
          archiviato_il: serverTimestamp()
        });
      });

      await batch.commit();
      mostraMessaggio("Ordine Archiviato", `"${nomeLotto}" salvato nello storico. Ora puoi iniziare un nuovo ordine.`, "success");
    } catch (err) {
      console.error("Errore archiviazione:", err);
      mostraMessaggio("Errore", "Impossibile archiviare l'ordine: " + err.message, "error");
    }
  }, [ordiniAttiviAdmin, settoreAttivo, mostraMessaggio]);

  const esportaArchivioXlsxAdmin = useCallback((archivioDoc) => {
    if (!archivioDoc) return;
    const idsSet = new Set(archivioDoc.ordini_ids || []);
    const ordiniDelLotto = tuttiGliOrdiniAdmin.filter(
      o => idsSet.has(o.id) || (o.archiviato && o.lotto_archivio === archivioDoc.titolo)
    );

    if (ordiniDelLotto.length === 0) {
      mostraMessaggio("Dati non trovati", "Nessun capo associato a questo archivio.", "warning");
      return;
    }

    try {
      const wb = generaFileXlsx(ordiniDelLotto);
      const nomeSanitizzato = archivioDoc.titolo.replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `ARCHIVIO_${nomeSanitizzato}_${settoreAttivo.toUpperCase()}.xlsx`);
      mostraMessaggio("Esportato", `Excel "${archivioDoc.titolo}" scaricato.`, "success");
    } catch (err) {
      mostraMessaggio("Errore", "Impossibile esportare l'archivio: " + err.message, "error");
    }
  }, [tuttiGliOrdiniAdmin, settoreAttivo, generaFileXlsx, mostraMessaggio]);

  const ordiniAdminRaggruppatiPerUtente = useMemo(() => {
    const gruppiMap = new Map();
    const termine = (ricercaAdmin || '').toLowerCase().trim();

    const mappaProfiliPerChiave = new Map();
    if (termine) {
      (tuttiGliUtenti || []).forEach(u => {
        const tuttiProfiliRaw = [
          ...(Array.isArray(u.atleti_pallanuoto) ? u.atleti_pallanuoto : []),
          ...(Array.isArray(u.atleti_nuoto) ? u.atleti_nuoto : []),
          ...(Array.isArray(u.atleti) ? u.atleti : [])
        ];
        const testiProfili = tuttiProfiliRaw.map(p => {
          if (typeof p === 'object' && p !== null) {
            return `${p.nome || ''} ${p.cognome || ''} ${p.categoria || ''}`.toLowerCase();
          }
          return String(p).toLowerCase();
        }).join(' ');

        if (u.id) mappaProfiliPerChiave.set(`uid:${u.id}`, testiProfili);
        if (u.email) mappaProfiliPerChiave.set(`email:${String(u.email).toLowerCase().trim()}`, testiProfili);
      });
    }

    ordiniAttiviAdmin.forEach(ord => {
      const matchStato = filtroStatoAdmin === 'Tutti' || ord.stato_pagamento === filtroStatoAdmin;
      if (!matchStato) return;

      const acquirenteStr = (ord.acquirente || '').toLowerCase();
      const emailStr = (ord.email_acquirente || '').toLowerCase();
      const uidStr = (ord.utente_id || '').toLowerCase();

      const listaCapi = Array.isArray(ord.articoli) && ord.articoli.length > 0 ? ord.articoli : [ord];
      const infoProfiliOrdine = [
        ord.atleta || '',
        ord.categoria || '',
        ...listaCapi.map(c => `${c.atleta || ''} ${c.categoria || ''}`)
      ].join(' ').toLowerCase();

      const infoProfiliAccount = (ord.utente_id && mappaProfiliPerChiave.get(`uid:${ord.utente_id}`))
        || mappaProfiliPerChiave.get(`email:${emailStr}`)
        || '';

      const matchRicerca = !termine ||
        acquirenteStr.includes(termine) ||
        emailStr.includes(termine) ||
        uidStr.includes(termine) ||
        infoProfiliOrdine.includes(termine) ||
        infoProfiliAccount.includes(termine);

      if (matchRicerca) {
        const chiaveUtente = ord.email_acquirente || "Sconosciuta";
        if (!gruppiMap.has(chiaveUtente)) {
          gruppiMap.set(chiaveUtente, {
            acquirente: ord.acquirente || "Utente",
            email: chiaveUtente,
            ordini: [],
            totaleDovuto: 0,
            totalePagato: 0
          });
        }
        const gruppo = gruppiMap.get(chiaveUtente);
        gruppo.ordini.push(ord);
        const importo = Number(ord.prezzo || ord.totale || 0);
        if (ord.pagato) gruppo.totalePagato += importo;
        else gruppo.totaleDovuto += importo;
      }
    });
    return Array.from(gruppiMap.values());
  }, [ordiniAttiviAdmin, ricercaAdmin, filtroStatoAdmin, tuttiGliUtenti]);

  const ordiniInAttesaCount = useMemo(() => {
    return ordiniAttiviAdmin.filter(o => o.stato_pagamento === "In attesa").length;
  }, [ordiniAttiviAdmin]);

  const inizialiUtente = useMemo(() => {
    if (!utenteLoggato) return "CN";
    const n = utenteLoggato.nome || "";
    const c = utenteLoggato.cognome || "";
    if (n && c) return `${n[0]}${c[0]}`.toUpperCase();
    return utenteLoggato.email?.slice(0, 2).toUpperCase() || "CN";
  }, [utenteLoggato]);

  const statisticheAdmin = useMemo(() => {
    const stats = { 
      inAttesa: 0, 
      inLavorazione: 0, 
      pronti: 0, 
      completati: 0, 
      incassoTotale: 0, 
      incassoVerificato: 0, 
      totaleArticoliVenduti: 0 
    };

    const clientiInAttesa = new Set();
    const clientiInLavorazione = new Set();
    const clientiPronti = new Set();
    const clientiCompletati = new Set();

    (ordiniAttiviAdmin || []).forEach(o => {
      const email = o.email_acquirente || o.utente_id || 'anonimo';
      if (o.stato_pagamento === 'In attesa') clientiInAttesa.add(email);
      if (o.stato_pagamento === 'In lavorazione') clientiInLavorazione.add(email);
      if (o.stato_pagamento === 'Pronto per il ritiro') clientiPronti.add(email);
      if (o.stato_pagamento === 'Completato') clientiCompletati.add(email);

      const val = Number(o.prezzo || o.totale || 0);
      stats.incassoTotale += val;
      if (o.pagato) {
        stats.incassoVerificato += val;
        stats.totaleArticoliVenduti += (Array.isArray(o.articoli) && o.articoli.length > 0 ? o.articoli.length : 1);
      }
    });

    stats.inAttesa = clientiInAttesa.size;
    stats.inLavorazione = clientiInLavorazione.size;
    stats.pronti = clientiPronti.size;
    stats.completati = clientiCompletati.size;
    return stats;
  }, [ordiniAttiviAdmin]);

  const haSollecitoAttivo = useMemo(() => {
    return notificheSettoreCorrente.some(n => n.tipo === 'sollecito' || Boolean(n.linkPaypal));
  }, [notificheSettoreCorrente]);

  const calcolaDebitoTotaleUtente = useCallback(async (emailUtente, utenteId, settore) => {
    let tot = 0;
    const targetEmail = (emailUtente || '').toLowerCase().trim();

    try {
      const qOrdini = query(
        collection(db, "ordini"),
        where("disciplina", "==", settore)
      );
      const snap = await getDocs(qOrdini);

      snap.forEach(docSnap => {
        const o = docSnap.data();
        if (o.stato_pagamento === "Annullato") return;

        const matchEmail = targetEmail && (o.email_acquirente || '').toLowerCase().trim() === targetEmail;
        const matchUid = utenteId && o.utente_id === utenteId;

        if (matchEmail || matchUid) {
          if (!o.pagato) {
            const lista = Array.isArray(o.articoli) && o.articoli.length > 0 ? o.articoli : [o];
            lista.forEach(capo => {
              tot += Number(capo.prezzo || o.prezzo || o.totale || 0);
            });
          }
        }
      });
    } catch (err) {
      console.error("Errore calcolo debito utente:", err);
    }

    return tot;
  }, []);

  const aggiornaNotificaSollecitoUtente = useCallback(async (uidTarget, emailTarget, settore, creaSeNonEsiste = false) => {
    let uid = uidTarget;

    if (!uid && emailTarget) {
      const emailPulita = emailTarget.trim();
      const qUser = query(collection(db, "utenti"), where("email", "==", emailPulita));
      let snap = await getDocs(qUser);

      if (snap.empty) {
        const qUserLower = query(collection(db, "utenti"), where("email", "==", emailPulita.toLowerCase()));
        snap = await getDocs(qUserLower);
      }

      if (!snap.empty) {
        uid = snap.docs[0].id;
      }
    }

    if (!uid) return;

    const notifRef = doc(db, "utenti", uid, "notifiche", `sollecito_${settore.toLowerCase()}`);
    const debito = await calcolaDebitoTotaleUtente(emailTarget, uid, settore);

    if (debito <= 0) {
      await deleteDoc(notifRef).catch(() => {});
      return;
    }

    const snapNotif = await getDoc(notifRef);

    if (!snapNotif.exists() && !creaSeNonEsiste) {
      return;
    }

    const linkPaypal = formattaPaypalLink(PAYPAL_LINKS[settore] || PAYPAL_LINKS.pallanuoto, debito);

    await setDoc(notifRef, {
      tipo: 'sollecito',
      titolo: 'Avviso di Pagamento Saldo',
      messaggio: `Risulta un saldo pendente di €${debito.toFixed(2)} per le forniture di ${settore.toUpperCase()}.`,
      totaleDovuto: debito,
      disciplina: settore,
      linkPaypal: linkPaypal,
      letto: false,
      creato_il: serverTimestamp(),
      aggiornato_il: serverTimestamp()
    }, { merge: true });
  }, [calcolaDebitoTotaleUtente]);

  const inviaSollecitoSingolo = useCallback(async (gruppoCliente) => {
    if (!gruppoCliente || gruppoCliente.totaleDovuto <= 0) return;

    try {
      const targetUid = gruppoCliente.ordini[0]?.utente_id || null;
      await aggiornaNotificaSollecitoUtente(targetUid, gruppoCliente.email, settoreAttivo, true);
      
      const capiNonPagati = [];
      gruppoCliente.ordini.forEach(o => {
        if (!o.pagato) {
          const lista = Array.isArray(o.articoli) && o.articoli.length > 0 ? o.articoli : [o];
          lista.forEach(c => {
            capiNonPagati.push(`• ${c.nomeProdotto} (${c.atleta || 'Profilo'}) - €${Number(c.prezzo || 0).toFixed(2)}`);
          });
        }
      });

      const importoStr = `€${Number(gruppoCliente.totaleDovuto).toFixed(2)}`;
      const linkPaypal = formattaPaypalLink(linkPaypalSettore, gruppoCliente.totaleDovuto);

      const oggetto = encodeURIComponent(`Sollecito Saldo Forniture ${settoreAttivo.toUpperCase()} - Circolo Nuoto Lucca`);
      const corpo = encodeURIComponent(
`Gentile ${gruppoCliente.acquirente},

ti ricordiamo che risulta ancora da saldare il materiale sportivo per il settore ${settoreAttivo.toUpperCase()}:

${capiNonPagati.join('\n')}

Totale complessivo da saldare: ${importoStr}

Puoi effettuare il pagamento direttamente al seguente link PayPal ufficiale:
${linkPaypal}

Ti chiediamo cortesemente di selezionare l'opzione FAMILIARI E AMICI e di indicare nella causale il nome dell'atleta o dei profili a cui sono intestati i capi.

Cordiali saluti,
Circolo Nuoto Lucca`
      );

      window.location.href = `mailto:${gruppoCliente.email}?subject=${oggetto}&body=${corpo}`;
      mostraMessaggio("Sollecito Inviato", `Email aperta e notifica in-app recapitata (${importoStr}).`, "success");
    } catch (err) {
      mostraMessaggio("Errore", "Impossibile preparare il sollecito: " + err.message, "error");
    }
  }, [aggiornaNotificaSollecitoUtente, settoreAttivo, linkPaypalSettore, mostraMessaggio]);

  const inviaSollecitoMassivo = useCallback(() => {
    const clientiMorosi = ordiniAdminRaggruppatiPerUtente.filter(g => g.totaleDovuto > 0);
    if (clientiMorosi.length === 0) {
      mostraMessaggio("Nessun Debito", "Tutti gli ordini risultano saldati.", "info");
      return;
    }

    chiediConferma(
      "Sollecito Massivo In-App",
      `Inviare una notifica in-app con il saldo aggiornato a tutti i ${clientiMorosi.length} clienti con ordini pendenti?`,
      async () => {
        try {
          let inviati = 0;
          for (const cliente of clientiMorosi) {
            const targetUid = cliente.ordini[0]?.utente_id || null;
            await aggiornaNotificaSollecitoUtente(targetUid, cliente.email, settoreAttivo, true);
            inviati++;
          }
          mostraMessaggio("Solleciti Inviati", `Notifica in-app recapitata a ${inviati} account.`, "success");
        } catch (err) {
          mostraMessaggio("Errore", err.message, "error");
        }
      },
      "Invia a Tutti"
    );
  }, [ordiniAdminRaggruppatiPerUtente, settoreAttivo, aggiornaNotificaSollecitoUtente, chiediConferma, mostraMessaggio]);

  const handleAggiornaStatoOrdineAdmin = useCallback(async (ordId, dataAggiornamento) => {
    try {
      const ordTarget = tuttiGliOrdiniAdmin.find(o => o.id === ordId);
      let payload = {
        ...dataAggiornamento,
        aggiornato_il: serverTimestamp()
      };

      if (dataAggiornamento.stato_pagamento && dataAggiornamento.stato_pagamento !== "Completato") {
        payload.completato = false;

        if (ordTarget?.articoli && ordTarget.articoli.length > 0) {
          payload.articoli = ordTarget.articoli.map(art => ({
            ...art,
            completato: false,
            consegnato_il: null
          }));
        }
      }

      if (dataAggiornamento.stato_pagamento === "Completato") {
        payload.completato = true;
        const oraConsegna = new Date().toISOString();

        if (ordTarget?.articoli && ordTarget.articoli.length > 0) {
          payload.articoli = ordTarget.articoli.map(art => ({
            ...art,
            completato: true,
            consegnato_il: art.consegnato_il || oraConsegna
          }));
        }
      }

      await updateDoc(doc(db, "ordini", ordId), payload);

      if (dataAggiornamento.pagato !== undefined || dataAggiornamento.stato_pagamento !== undefined) {
        if (ordTarget) {
          const email = ordTarget.email_acquirente;
          const uid = ordTarget.utente_id;
          const settore = ordTarget.disciplina || settoreAttivo;
          await aggiornaNotificaSollecitoUtente(uid, email, settore);
        }
      }
    } catch (err) {
      mostraMessaggio("Errore", "Impossibile aggiornare lo stato dell'ordine: " + err.message, "error");
    }
  }, [tuttiGliOrdiniAdmin, settoreAttivo, aggiornaNotificaSollecitoUtente, mostraMessaggio]);

  const handleToggleCompletatoArticolo = useCallback(async (idOrdine, idUnivoco) => {
    try {
      const ordTarget = tuttiGliOrdiniAdmin.find(o => o.id === idOrdine);
      if (!ordTarget) return;

      const listaArticoli = Array.isArray(ordTarget.articoli) && ordTarget.articoli.length > 0 
        ? ordTarget.articoli 
        : [ordTarget];

      const articoliAggiornati = listaArticoli.map(art => {
        const matchUnivoco = (art.idUnivoco || ordTarget.id) === idUnivoco;
        if (matchUnivoco) {
          const prossimoCompletato = !art.completato;
          return { 
            ...art, 
            completato: prossimoCompletato,
            consegnato_il: prossimoCompletato ? new Date().toISOString() : null
          };
        }
        return art;
      });

      const tuttiCompletati = articoliAggiornati.every(a => a.completato);
      const nuovoStatoOrdine = tuttiCompletati ? "Completato" : "Pronto per il ritiro";

      await updateDoc(doc(db, "ordini", idOrdine), {
        articoli: articoliAggiornati,
        completato: tuttiCompletati,
        stato_pagamento: nuovoStatoOrdine,
        aggiornato_il: serverTimestamp()
      });

      mostraMessaggio("Aggiornato", "Stato consegna aggiornato.", "success");
    } catch (err) {
      console.error("Errore toggle completato:", err);
      mostraMessaggio("Errore", "Impossibile aggiornare la consegna: " + err.message, "error");
    }
  }, [tuttiGliOrdiniAdmin, mostraMessaggio]);

  const handleConfermaPagamentoNotifica = useCallback(async (notifica) => {
    if (!utenteLoggato || !notifica?.id) return;
    try {
      await deleteDoc(doc(db, "utenti", utenteLoggato.id, "notifiche", notifica.id));
    } catch (err) {
      console.error("Errore eliminazione sollecito:", err);
    }
  }, [utenteLoggato]);

  const handleRichiestaAnnullaOrdine = useCallback((ord) => {
    const nomeCapo = ord.nomeProdotto || (ord.articoli && ord.articoli[0]?.nomeProdotto) || "questo ordine";
    const nomeAtleta = ord.atleta || (ord.articoli && ord.articoli[0]?.atleta) || "cliente";

    chiediConferma(
      "CONFERMA ANNULLAMENTO",
      `Sei sicuro di voler annullare definitivamente l'ordine "${nomeCapo}" intestato a ${nomeAtleta}? Questa operazione è irreversibile.`,
      async () => {
        try {
          await deleteDoc(doc(db, "ordini", ord.id));
          mostraMessaggio("Ordine Annullato", "L'ordine è stato rimosso definitivamente.", "info");
        } catch (err) {
          mostraMessaggio("Errore", "Impossibile annullare l'ordine: " + err.message, "error");
        }
      },
      "Annulla Ordine"
    );
  }, [chiediConferma, mostraMessaggio]);

  const handleRichiestaCancellaArticolo = useCallback((capo) => {
    const targetId = capo.ordinePadreId || capo.idOrdinePadre || capo.id;
    const nomeArt = capo.nomeProdotto || "questo capo";

    chiediConferma(
      "ELIMINA ARTICOLO",
      `Confermi l'eliminazione definitiva del capo "${nomeArt}" dall'elenco forniture?`,
      async () => {
        try {
          await deleteDoc(doc(db, "ordini", targetId));
          mostraMessaggio("Articolo Rimosso", "Il capo è stato eliminato con successo.", "info");
        } catch (err) {
          mostraMessaggio("Errore: Errore durante la cancellazione: " + err.message, "error");
        }
      },
      "Elimina Definitivamente"
    );
  }, [chiediConferma, mostraMessaggio]);

  const handleCreaOrdineAdminPerUtente = useCallback(async (datiOrdine) => {
    try {
      const listaDaCreare = Array.isArray(datiOrdine) ? datiOrdine : [datiOrdine];
      if (listaDaCreare.length === 0) return;

      const batch = writeBatch(db);
      const ordiniColRef = collection(db, "ordini");

      listaDaCreare.forEach(itemOrdine => {
        const {
          utenteId,
          emailAcquirente,
          nomeAcquirente,
          atleta,
          categoria,
          prodotto,
          taglia,
          nomePersonalizzato,
          numeroPersonalizzato,
          colorePersonalizzato,
          pagatoSubito
        } = itemOrdine;

        const nuovoCapo = {
          idUnivoco: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          prodottoId: prodotto.id,
          nomeProdotto: prodotto.nome,
          prezzo: Number(prodotto.prezzo || 0),
          taglia: prodotto.taglia_unica ? "Taglia Unica" : taglia,
          taglia_unica: Boolean(prodotto.taglia_unica),
          atleta: (atleta || "Profilo Generale").trim(),
          categoria: categoria || "Extra",
          immagine_url: prodotto.immagine_url || null,
          nomePersonalizzato: nomePersonalizzato ? nomePersonalizzato.trim().toUpperCase() : null,
          numeroPersonalizzato: numeroPersonalizzato || null,
          colorePersonalizzato: colorePersonalizzato || null
        };

        const newDocRef = doc(ordiniColRef);
        batch.set(newDocRef, {
          ...nuovoCapo,
          totale: nuovoCapo.prezzo,
          disciplina: settoreAttivo,
          stato_pagamento: "In attesa",
          pagato: Boolean(pagatoSubito),
          completato: false,
          archiviato: false,
          utente_id: utenteId,
          acquirente: nomeAcquirente,
          email_acquirente: (emailAcquirente || "").toLowerCase().trim(),
          articoli: [nuovoCapo],
          creato_da_admin: true,
          creato_il: serverTimestamp()
        });
      });

      await batch.commit();
      mostraMessaggio(
        "Ordine Creato",
        `${listaDaCreare.length} ${listaDaCreare.length === 1 ? 'capo aggiunto' : 'capi aggiunti'} con successo.`,
        "success"
      );
    } catch (err) {
      console.error("Errore creazione ordine admin:", err);
      mostraMessaggio("Errore", "Impossibile creare l'ordine: " + err.message, "error");
    }
  }, [settoreAttivo, mostraMessaggio]);

  const handleModificaProfiloDaAdmin = useCallback(async (utenteId, vecchioNome, nuoviDati) => {
    try {
      const isN = settoreAttivo === 'nuoto';
      const campoAtleti = isN ? "atleti_nuoto" : "atleti_pallanuoto";
      const campoCarrello = isN ? "carrello_nuoto" : "carrello_pallanuoto";

      const userRef = doc(db, "utenti", utenteId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        mostraMessaggio("Errore", "Utente non trovato.", "error");
        return;
      }

      const userData = userSnap.data();
      const listaVecchia = userData[campoAtleti] || (!isN ? (userData.atleti || []) : []);
      const nuovoNomeCompleto = `${nuoviDati.nome} ${nuoviDati.cognome}`.trim();

      const listaAggiornata = listaVecchia.map(a => {
        const n = typeof a === 'object' ? `${a.nome || ''} ${a.cognome || ''}`.trim() : String(a).trim();
        if (n.toLowerCase() === vecchioNome.toLowerCase()) {
          return {
            nome: nuoviDati.nome.trim(),
            cognome: nuoviDati.cognome.trim(),
            categoria: nuoviDati.categoria
          };
        }
        return a;
      });

      const carrelloVecchi = userData[campoCarrello] || (!isN ? (userData.carrello || []) : []);
      const carrelloAggiornato = (Array.isArray(carrelloVecchi) ? carrelloVecchi : []).map(item => {
        if ((item.atleta || '').toLowerCase() === vecchioNome.toLowerCase()) {
          return {
            ...item,
            atleta: nuovoNomeCompleto,
            categoria: nuoviDati.categoria
          };
        }
        return item;
      });

      const batch = writeBatch(db);
      batch.update(userRef, {
        [campoAtleti]: listaAggiornata,
        [campoCarrello]: carrelloAggiornato
      });

      const qOrdini = query(
        collection(db, "ordini"),
        where("utente_id", "==", utenteId),
        where("disciplina", "==", settoreAttivo)
      );
      const snapOrdini = await getDocs(qOrdini);

      snapOrdini.forEach(ordDoc => {
        const o = ordDoc.data();
        if (o.stato_pagamento === "Annullato") return;

        let modificato = false;
        const articoliAgg = (o.articoli || []).map(art => {
          if ((art.atleta || '').toLowerCase() === vecchioNome.toLowerCase()) {
            modificato = true;
            return {
              ...art,
              atleta: nuovoNomeCompleto,
              categoria: nuoviDati.categoria
            };
          }
          return art;
        });

        if ((o.atleta || '').toLowerCase() === vecchioNome.toLowerCase()) {
          modificato = true;
        }

        if (modificato) {
          batch.update(doc(db, "ordini", ordDoc.id), {
            atleta: (o.atleta && o.atleta.toLowerCase() === vecchioNome.toLowerCase()) ? nuovoNomeCompleto : o.atleta,
            categoria: (o.atleta && o.atleta.toLowerCase() === vecchioNome.toLowerCase()) ? nuoviDati.categoria : o.categoria,
            articoli: articoliAgg,
            aggiornato_il: serverTimestamp()
          });
        }
      });

      await batch.commit();
      mostraMessaggio("Profilo Aggiornato", `Profilo aggiornato in "${nuovoNomeCompleto}" (${nuoviDati.categoria}).`, "success");
    } catch (err) {
      console.error("Errore modifica profilo admin:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [settoreAttivo, mostraMessaggio]);

  const handleEliminaProfiloDaAdmin = useCallback(async (utenteId, profiloDaEliminare) => {
    try {
      const isN = settoreAttivo === 'nuoto';
      const campoAtleti = isN ? "atleti_nuoto" : "atleti_pallanuoto";
      const userRef = doc(db, "utenti", utenteId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        mostraMessaggio("Errore", "Utente non trovato.", "error");
        return;
      }

      const dati = userSnap.data();
      const listaAttuale = dati[campoAtleti] || (!isN ? (dati.atleti || []) : []);
      const nomeTarget = (profiloDaEliminare.nomeCompleto || `${profiloDaEliminare.nome || ''} ${profiloDaEliminare.cognome || ''}`).trim().toLowerCase();

      const qOrdini = query(
        collection(db, "ordini"),
        where("utente_id", "==", utenteId),
        where("disciplina", "==", settoreAttivo)
      );
      const snapOrdini = await getDocs(qOrdini);
      let haPendenti = false;

      snapOrdini.forEach(docSnap => {
        const o = docSnap.data();
        if (o.stato_pagamento === "Annullato") return;

        const listaCapi = Array.isArray(o.articoli) && o.articoli.length > 0 ? o.articoli : [o];
        const appartiene = listaCapi.some(c => (c.atleta || o.atleta || '').toLowerCase().trim() === nomeTarget);

        if (appartiene && (!o.pagato || o.stato_pagamento === "In attesa" || o.stato_pagamento === "In lavorazione")) {
          haPendenti = true;
        }
      });

      if (haPendenti) {
        mostraMessaggio(
          "Eliminazione non consentita",
          `Impossibile eliminare il profilo "${profiloDaEliminare.nomeCompleto}": risultano ordini pendenti o non saldati.`,
          "warning"
        );
        return;
      }

      const nuovaLista = listaAttuale.filter(a => {
        const n = typeof a === 'object' ? `${a.nome || ''} ${a.cognome || ''}`.trim().toLowerCase() : String(a).trim().toLowerCase();
        return n !== nomeTarget;
      });

      await updateDoc(userRef, { [campoAtleti]: nuovaLista });
      mostraMessaggio("Profilo Rimosso", `Il profilo "${profiloDaEliminare.nomeCompleto}" è stato eliminato.`, "info");
    } catch (err) {
      console.error("Errore rimozione profilo admin:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [settoreAttivo, mostraMessaggio]);

  const handleEliminaAccountDaAdmin = useCallback(async (utenteId) => {
    try {
      const qOrdini = query(collection(db, "ordini"), where("utente_id", "==", utenteId));
      const snapOrdini = await getDocs(qOrdini);
      let haPendenti = false;

      snapOrdini.forEach(docSnap => {
        const o = docSnap.data();
        if (o.stato_pagamento === "Annullato") return;
        if (!o.pagato || o.stato_pagamento === "In attesa" || o.stato_pagamento === "In lavorazione") {
          haPendenti = true;
        }
      });

      if (haPendenti) {
        mostraMessaggio(
          "Eliminazione non consentita",
          "Impossibile eliminare l'account: risultano ordini pendenti o non saldati.",
          "warning"
        );
        return;
      }

      await deleteDoc(doc(db, "utenti", utenteId));
      mostraMessaggio("Account Eliminato", "L'account cliente e tutti i suoi profili sono stati eliminati da Firestore.", "info");
    } catch (err) {
      console.error("Errore eliminazione account admin:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [mostraMessaggio]);

  const handleAggiungiProfiloDaAdmin = useCallback(async (utenteId, nuovoProfilo) => {
    try {
      const campoAtleti = settoreAttivo === 'nuoto' ? "atleti_nuoto" : "atleti_pallanuoto";
      const userRef = doc(db, "utenti", utenteId);
      await updateDoc(userRef, {
        [campoAtleti]: arrayUnion(nuovoProfilo)
      });
      mostraMessaggio("Profilo Creato", `Profilo registrato con successo per ${nuovoProfilo.nome} ${nuovoProfilo.cognome}.`, "success");
    } catch (err) {
      console.error("Errore aggiunta profilo admin:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [settoreAttivo, mostraMessaggio]);

  const handleModificaAccountDaAdmin = useCallback(async (utenteId, datiAccount) => {
    try {
      const nuovoNomeCompleto = `${datiAccount.nome.trim()} ${datiAccount.cognome.trim()}`.trim();
      const userRef = doc(db, "utenti", utenteId);

      const batch = writeBatch(db);
      batch.update(userRef, {
        nome: datiAccount.nome.trim(),
        cognome: datiAccount.cognome.trim(),
        aggiornato_il: serverTimestamp()
      });

      const qOrdini = query(
        collection(db, "ordini"),
        where("utente_id", "==", utenteId)
      );
      const snapOrdini = await getDocs(qOrdini);

      snapOrdini.forEach(ordDoc => {
        batch.update(doc(db, "ordini", ordDoc.id), {
          acquirente: nuovoNomeCompleto,
          aggiornato_il: serverTimestamp()
        });
      });

      await batch.commit();
      mostraMessaggio("Account Aggiornato", `Nominativo salvato in "${nuovoNomeCompleto}".`, "success");
    } catch (err) {
      console.error("Errore modifica account admin:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [mostraMessaggio]);

  const handleRimuoviDalCarrelloUtenteDaAdmin = useCallback(async (utenteId, idUnivoco) => {
    try {
      const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";
      const isN = settoreAttivo === 'nuoto';
      const userRef = doc(db, "utenti", utenteId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        mostraMessaggio("Errore", "Utente non trovato.", "error");
        return;
      }

      const userData = userSnap.data();
      const carrelloAttuale = userData[campoCarrello] || (!isN ? (userData.carrello || []) : []);
      const carrelloNuovo = (Array.isArray(carrelloAttuale) ? carrelloAttuale : []).filter(
        item => item.idUnivoco !== idUnivoco
      );

      await updateDoc(userRef, { [campoCarrello]: carrelloNuovo });
      mostraMessaggio("Carrello Aggiornato", "Capo rimosso dal carrello dell'utente.", "info");
    } catch (err) {
      console.error("Errore rimozione capo carrello utente:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [settoreAttivo, mostraMessaggio]);

  const handleAggiornaCapoCarrelloUtenteDaAdmin = useCallback(async (utenteId, capoAggiornato) => {
    try {
      const campoCarrello = settoreAttivo === 'nuoto' ? "carrello_nuoto" : "carrello_pallanuoto";
      const isN = settoreAttivo === 'nuoto';
      const userRef = doc(db, "utenti", utenteId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        mostraMessaggio("Errore", "Utente non trovato.", "error");
        return;
      }

      const userData = userSnap.data();
      const carrelloAttuale = userData[campoCarrello] || (!isN ? (userData.carrello || []) : []);
      const carrelloNuovo = (Array.isArray(carrelloAttuale) ? carrelloAttuale : []).map(item => {
        if (item.idUnivoco === capoAggiornato.idUnivoco) {
          return { ...capoAggiornato };
        }
        return item;
      });

      await updateDoc(userRef, { [campoCarrello]: carrelloNuovo });
      mostraMessaggio("Carrello Aggiornato", "Articolo nel carrello modificato con successo.", "success");
    } catch (err) {
      console.error("Errore aggiornamento capo carrello utente:", err);
      mostraMessaggio("Errore", err.message, "error");
    }
  }, [settoreAttivo, mostraMessaggio]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-3 border-[#002b80] border-t-transparent animate-spin mb-3.5"></div>
        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Caricamento in corso...</span>
      </div>
    );
  }

  if (!utenteLoggato) {
    return (
      <Auth 
        onLoginSuccess={(datiUtente) => {
          setAuthError(null);
          setUtenteLoggato(datiUtente);
        }} 
        externalError={authError}
        onClearExternalError={() => setAuthError(null)}
        onSettoreChange={cambiaSettore}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 antialiased bg-slate-50/60 flex flex-col">
      
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
      
      <CustomModal 
        modalConfig={modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <ModalCarrello 
        isOpen={mostraModalCarrello}
        onClose={() => setMostraModalCarrello(false)}
        carrello={carrello}
        totaleCarrello={totaleCarrello}
        onRimuoviDalCarrello={rimuoviDalCarrello}
        onAggiornaCarrelloItem={aggiornaCarrelloItem}
        onCheckout={gestisciCheckout}
        onChiediConferma={chiediConferma}
        listaAtleti={atletiSettoreAttivo}
        prodotti={prodotti}
        isCheckout={isCheckout}
        onZoomFoto={(src, alt) => setZoomImage({ src, alt })}
      />

      <ModalGuidaPrimoAccesso 
        isOpen={mostraGuidaPrimoAccesso}
        onClose={chiudiGuidaPrimoAccesso}
      />

      {/* POPUP CONFERMA ORDINE E ISTRUZIONI DI PAGAMENTO */}
      {mostraModalSuccessoOrdine && (
        <div 
          className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setMostraModalSuccessoOrdine(false)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg shadow-2xs">
                  <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Ordine Confermatissimo!</h3>
              </div>
              <button 
                type="button"
                onClick={() => setMostraModalSuccessoOrdine(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs cursor-pointer transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
              <p>Il tuo ordine è stato confermato e inviato correttamente al sistema.</p>
              <p>Adesso puoi procedere con il pagamento in qualsiasi momento cliccando sul tasto apposito <strong>"Da saldare: €..."</strong> presente nella barra superiore dell'applicazione.</p>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-[#002b80] text-xs font-bold leading-relaxed">
                ℹ️ <strong>Nota bene:</strong> Gli articoli e le relative personalizzazioni possono essere modificati fintanto che lo stato degli articoli risulta in <strong>"In attesa"</strong>, anche nel caso in cui l'ordine risulti già saldato.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostraModalSuccessoOrdine(false)}
                className="w-full h-12 rounded-2xl text-sm font-black bg-[#002b80] hover:bg-[#002060] text-white flex items-center justify-center cursor-pointer shadow-xs transition-all active:scale-[0.99]"
              >
                Ho capito, procedi
              </button>
            </div>
          </div>
        </div>
      )}

      {mostraModalProfilo && (
        <ModalProfilo 
          utente={utenteLoggato}
          onClose={() => setMostraModalProfilo(false)}
          onAggiornaProfilo={aggiornaProfilo}
          onCancellaAccount={cancellaAccount}
        />
      )}

      {zoomImage && (
        <LightboxModal 
          src={zoomImage.src} 
          alt={zoomImage.alt} 
          onClose={() => setZoomImage(null)} 
        />
      )}

      {ordineInModifica && (
        <ModalModificaOrdine 
          ordine={ordineInModifica}
          listaAtleti={atletiSettoreAttivo}
          prodotti={prodotti}
          onClose={() => setOrdineInModifica(null)}
          onSalva={async (ordId, nuoviArticoli) => {
            const nuovoTotale = nuoviArticoli.reduce((acc, a) => acc + Number(a.prezzo || 0), 0);
            await updateDoc(doc(db, "ordini", ordId), { 
              articoli: nuoviArticoli,
              prezzo: nuovoTotale,
              totale: nuovoTotale,
              aggiornato_il: serverTimestamp()
            });
            setOrdineInModifica(null);
            mostraMessaggio("Modificato", "Fornitura aggiornata con successo.", "success");
          }}
        />
      )}

      <Navbar 
        settoreUtente={settoreAttivo}
        onCambiaSettore={cambiaSettore}
        mostraSelettoreSettore={!adminRuolo || isSuperAdmin}
        sollecitiPerSettore={sollecitiPerSettore}
        carrelloCount={carrello.length}
        totaleCarrello={totaleCarrello}
        isUserAdmin={isUserAdminNelSettore}
        isSuperAdmin={isSuperAdmin}
        inizialiUtente={inizialiUtente}
        adminTab={adminTab}
        onSetAdminTab={handleCambiaAdminTab}
        onApriCarrello={() => setMostraModalCarrello(true)}
        onApriProfilo={() => setMostraModalProfilo(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:pt-24 pb-8 flex-1">
        {!isUserAdminNelSettore ? (
          <>
            <BannerNotifiche 
              notifiche={notificheSettoreCorrente}
              onConfermaPagamento={handleConfermaPagamentoNotifica}
            />
            <NegozioUtente 
              key={settoreAttivo}
              utenteLoggato={utenteLoggato}
              prodotti={prodotti}
              carrello={carrello}
              totaleCarrello={totaleCarrello}
              ordiniUtente={ordiniUtente}
              isCheckout={isCheckout}
              categorieAtleti={categorieCorrenti}
              settoreUtente={settoreAttivo}
              linkPaypal={linkPaypalSettore}
              haSollecitoAttivo={haSollecitoAttivo}
              listaAtleti={atletiSettoreAttivo}
              onAggiungiAlCarrello={aggiungiAlCarrello}
              onRimuoviDalCarrello={rimuoviDalCarrello}
              onCheckout={gestisciCheckout}
              onZoomFoto={(src, alt) => setZoomImage({ src, alt })}
              onAggiungiAtleta={aggiungiAtletaFamiglia}
              onModificaAtleta={modificaAtletaFamiglia}
              onRimuoviAtleta={rimuoviAtletaFamiglia}
              onApriModificaOrdine={setOrdineInModifica}
              onAnnullaOrdine={handleRichiestaAnnullaOrdine}
              onCancellaArticolo={handleRichiestaCancellaArticolo}
            />
          </>
        ) : (
          <PannelloAdmin 
            adminTab={adminTab}
            statistiche={statisticheAdmin}
            ricerca={ricercaAdmin}
            onSetRicerca={setRicercaAdmin}
            filtroStato={filtroStatoAdmin}
            onSetFiltroStato={setFiltroStatoAdmin}
            ordiniRaggruppati={ordiniAdminRaggruppatiPerUtente}
            tuttiGliOrdini={ordiniAttiviAdmin}
            archivioOrdini={archivioOrdiniAdmin}
            tuttiGliUtenti={tuttiGliUtenti}
            ordiniInAttesaCount={ordiniInAttesaCount}
            invioProduzioneInCorso={invioProduzioneInCorso}
            onInviaProduzione={mandaInLavorazioneConEmail}
            onImpostaProntiRitiro={impostaProntiRitiroAdmin}
            onEsportaCsv={esportaCsvAdmin}
            onArchiviaOrdineCorrente={archiviaOrdineCorrenteAdmin}
            onEsportaArchivioXlsx={esportaArchivioXlsxAdmin}
            onAggiornaOrdine={handleAggiornaStatoOrdineAdmin}
            onToggleCompletatoArticolo={handleToggleCompletatoArticolo}
            onApriModificaOrdine={setOrdineInModifica}
            onAnnullaOrdine={handleRichiestaAnnullaOrdine}
            onCancellaArticolo={handleRichiestaCancellaArticolo}
            onInviaSollecitoMassivo={inviaSollecitoMassivo}
            onInviaSollecitoSingolo={inviaSollecitoSingolo}
            nuovoProd={nuovoProd}
            onSetNuovoProd={setNuovoProd}
            fileInputRef={fileInputRef}
            anteprimaImmagine={anteprimaImmagine}
            fileImmagine={fileImmagine}
            onFileChange={handleFileChange}
            onRimuoviFile={rimuoviFileSelezionato}
            uploadingImage={uploadingImage}
            onCreaProdotto={creaProdottoAdmin}
            prodotti={prodotti}
            onEliminaProdotto={eliminaProdottoAdmin}
            onModificaProdotto={modificaProdottoAdmin}
            onToggleVisibilitaProdotto={toggleVisibilitaProdottoAdmin}
            settoreUtente={settoreAttivo}
            categorieSettore={categorieCorrenti}
            onZoomFoto={(src, alt) => setZoomImage({ src, alt })}
            onCreaOrdinePerUtente={handleCreaOrdineAdminPerUtente}
            onModificaProfiloUtente={handleModificaProfiloDaAdmin}
            onAggiungiProfiloUtente={handleAggiungiProfiloDaAdmin}
            onEliminaProfiloUtente={handleEliminaProfiloDaAdmin}
            onEliminaAccountUtente={handleEliminaAccountDaAdmin}
            onModificaAccountUtente={handleModificaAccountDaAdmin}
            onRimuoviCapoCarrelloUtente={handleRimuoviDalCarrelloUtenteDaAdmin}
            onModificaCapoCarrelloUtente={handleAggiornaCapoCarrelloUtenteDaAdmin}
            mostraMessaggio={mostraMessaggio}
            chiediConferma={chiediConferma}
          />
        )}
      </main>
    </div>
  );
}