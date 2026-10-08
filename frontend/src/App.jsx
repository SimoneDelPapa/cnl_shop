import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Auth from './Auth';
import Navbar from './components/Navbar';
import NegozioUtente from './components/NegozioUtente';
import PannelloAdmin from './components/PannelloAdmin';
import { SCALA_NUMERICA, SCALA_LETTERALE, generaRangeTaglie } from './utils/taglie';
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

// NUOVI LINK PAYPAL AGGIORNATI E SALVATI
const PAYPAL_LINKS = {
  pallanuoto: "https://paypal.me/PallanuotoLucca",
  nuoto: "https://www.paypal.me/CircoloNuotoLucca"
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
  const [loading, setLoading] = useState(true);
  const [isCheckout, setIsCheckout] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [invioProduzioneInCorso, setInvioProduzioneInCorso] = useState(false);
  const [ordineInModifica, setOrdineInModifica] = useState(null);
  const [notificheUtente, setNotificheUtente] = useState([]);
  const [mostraModalProfilo, setMostraModalProfilo] = useState(false);
  const [mostraModalCarrello, setMostraModalCarrello] = useState(false);
  const [mostraGuidaPrimoAccesso, setMostraGuidaPrimoAccesso] = useState(false);

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

  const [adminTab, setAdminTab] = useState('ordini');
  const [filtroStatoAdmin, setFiltroStatoAdmin] = useState('Tutti');
  const [ricercaAdmin, setRicercaAdmin] = useState('');

  const [nuovoProd, setNuovoProd] = useState({ 
    nome: '', 
    prezzo: '', 
    immagine_url: '', 
    taglia_unica: false,
    tipo_taglie: 'letterale',
    taglia_min: 'XS',
    taglia_max: 'XL',
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
    return (r === "pallanuoto" || r === "nuoto") ? r : null;
  }, [utenteLoggato]);

  const settoreAttivo = adminRuolo || settoreScelto;

  const cambiaSettore = useCallback((nuovoSettore) => {
    if (adminRuolo) return;
    setSettoreScelto(nuovoSettore);
    sessionStorage.setItem("cnl_settore_richiesto", nuovoSettore);
    
    // Riporta istantaneamente lo scroll in alto senza ricaricare la pagina
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [adminRuolo]);

  const linkPaypalSettore = PAYPAL_LINKS[settoreAttivo] || PAYPAL_LINKS.pallanuoto;
  const categorieCorrenti = useMemo(() => {
    return settoreAttivo === 'nuoto' ? CATEGORIE_NUOTO : CATEGORIE_PALLANUOTO;
  }, [settoreAttivo]);

  const isUserAdminNelSettore = useMemo(() => {
    return Boolean(adminRuolo && adminRuolo === settoreAttivo);
  }, [adminRuolo, settoreAttivo]);

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

  // CONTROLLO ATTIVAZIONE GUIDA PRIMO ACCESSO (Asincrono per evitare render a cascata)
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

  // SCROLL-LOCK SENZA POSIZIONAMENTO FISSO DEL BODY (NON ROMPE LA NAVBAR)
  const isQualcheModalAperto = Boolean(
    mostraModalCarrello || 
    mostraGuidaPrimoAccesso || 
    mostraModalProfilo || 
    zoomImage || 
    ordineInModifica || 
    modalConfig.isOpen
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
      if (user) {
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

      if (utenteLoggato.isAdmin && utenteLoggato.isAdmin !== "no") {
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
      if (n.tipo === 'sollecito' || Boolean(n.linkPaypal)) {
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

      const tipo = nuovoProd.tipo_taglie || (nuovoProd.taglia_unica ? 'unica' : 'letterale');
      const minVal = nuovoProd.taglia_min || (tipo === 'numerica' ? '38' : 'XS');
      const maxVal = nuovoProd.taglia_max || (tipo === 'numerica' ? '48' : 'XL');
      const taglieDisponibili = generaRangeTaglie(tipo, minVal, maxVal);

      const batchRef = collection(db, "prodotti");
      await setDoc(doc(batchRef), {
        nome: nuovoProd.nome.trim(),
        prezzo: parseFloat(nuovoProd.prezzo) || 0,
        disciplina: settoreAttivo,
        immagine_url: imageUrl,
        attivo: true,
        taglia_unica: Boolean(tipo === 'unica'),
        tipo_taglie: tipo,
        taglia_min: tipo === 'unica' ? null : minVal,
        taglia_max: tipo === 'unica' ? null : maxVal,
        taglie_disponibili: taglieDisponibili,
        personalizzabile_nome: Boolean(nuovoProd.personalizzabile_nome),
        personalizzabile_numero: settoreAttivo === 'nuoto' ? false : Boolean(nuovoProd.personalizzabile_numero),
        personalizzabile_colore: settoreAttivo === 'nuoto' ? false : Boolean(nuovoProd.personalizzabile_colore),
        creato_il: serverTimestamp()
      });
      setNuovoProd({ 
        nome: '', 
        prezzo: '', 
        immagine_url: '', 
        taglia_unica: false,
        tipo_taglie: 'letterale',
        taglia_min: 'XS',
        taglia_max: 'XL',
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
    
    // VERIFICA SE L'IMPORTO È MAGGIORE DI ZERO E GENERA IL LINK CON L'IMPORTO ANNESSO
    const linkPaypalConImporto = totaleCarrello > 0 
      ? `${linkPaypalSettore}/${totaleCarrello.toFixed(2)}` 
      : linkPaypalSettore;

    chiediConferma(
      "Conferma Ordine",
      `Confermi l'invio di ${carrello.length} ${carrello.length === 1 ? 'capo' : 'capi'} per il settore ${settoreAttivo.toUpperCase()} (€${totaleCarrello.toFixed(2)})? Si aprirà PayPal per il pagamento.`,
      async () => {
        setIsCheckout(true);
        const popupRef = window.open('about:blank', '_blank');

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

          if (popupRef && !popupRef.closed) {
            popupRef.location.href = linkPaypalConImporto;
          } else {
            const a = document.createElement('a');
            a.href = linkPaypalConImporto;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } catch (error) { 
          if (popupRef && !popupRef.closed) popupRef.close();
          mostraMessaggio("Errore: " + error.message, "error"); 
        } finally { 
          setIsCheckout(false); 
        }
      },
      "Procedi su PayPal"
    );
  }, [carrello, totaleCarrello, utenteLoggato, settoreAttivo, linkPaypalSettore, chiediConferma, mostraMessaggio]);

  // EXCEL EXPORT (Personalizzazioni raggruppate per Articolo, senza Acquirente)
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

    // STILI EXCEL CONDIVISI
    const styleBanner = {
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "002B80" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    const styleSezioneTitle = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "left", vertical: "center" }
    };
    const styleHeaderCol = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "E2E8F0" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    const styleHeaderTotal = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "002B80" } },
      fill: { fgColor: { rgb: "DBEAFE" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    const styleCella = (alt, align = "center", bold = false, isDimmed = false) => ({
      font: { 
        name: "Calibri", 
        sz: 10, 
        bold: bold, 
        color: { rgb: isDimmed ? "94A3B8" : (bold ? "0F172A" : "334155") } 
      },
      fill: { fgColor: { rgb: alt ? "F8FAFC" : "FFFFFF" } },
      alignment: { horizontal: align, vertical: "center" }
    });

    // ========================================================
    // FOGLIO 1: RIEPILOGO TAGLIE
    // ========================================================
    const nomiProdottiUnivoci = Array.from(new Set(tuttiArticoli.map(a => a.nomeProdotto || "Capo")));
    const numCols1 = nomiProdottiUnivoci.length + 2;

    const tagliePresentiSet = new Set(tuttiArticoli.map(a => (a.taglia || "Taglia Unica").trim().toUpperCase()));
    const elencoTaglieOrdinate = [];

    if (tagliePresentiSet.has("TAGLIA UNICA")) {
      elencoTaglieOrdinate.push("Taglia Unica");
      tagliePresentiSet.delete("TAGLIA UNICA");
    }

    SCALA_LETTERALE.forEach(t => {
      if (tagliePresentiSet.has(t.toUpperCase())) {
        elencoTaglieOrdinate.push(t);
        tagliePresentiSet.delete(t.toUpperCase());
      }
    });

    SCALA_NUMERICA.forEach(t => {
      if (tagliePresentiSet.has(t)) {
        elencoTaglieOrdinate.push(t);
        tagliePresentiSet.delete(t);
      }
    });

    Array.from(tagliePresentiSet).forEach(t => elencoTaglieOrdinate.push(t));

    const dataWs1 = [
      [{ v: `CIRCOLO NUOTO LUCCA - ${nomeSettoreTitolo} (RIEPILOGO TAGLIE)`, s: styleBanner }, ...Array(numCols1 - 1).fill({ v: "", s: styleBanner })],
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
          const tagliaArt = (a.taglia || "Taglia Unica").trim().toUpperCase();
          return a.nomeProdotto === nomeProd && tagliaArt === taglia.toUpperCase();
        }).length;
        totaliPerProdotto[nomeProd] += conteggio;
        sommaRiga += conteggio;
        riga.push({ v: conteggio, t: "n", s: styleCella(alt, "center", false) });
      });

      totaleGenerale += sommaRiga;
      riga.push({ v: sommaRiga, t: "n", s: styleHeaderTotal });
      dataWs1.push(riga);
    });

    dataWs1.push([
      { v: "TOTALE ASSOLUTO", s: styleHeaderTotal },
      ...nomiProdottiUnivoci.map(p => ({ v: totaliPerProdotto[p], t: "n", s: styleHeaderTotal })),
      { v: totaleGenerale, t: "n", s: styleHeaderTotal }
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(dataWs1);
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols1 - 1 } }];
    ws1['!cols'] = [{ wch: 18 }, ...nomiProdottiUnivoci.map(() => ({ wch: 22 })), { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Riepilogo Taglie");

    // ========================================================
    // FOGLIO 2: PERSONALIZZAZIONI RAGGRUPPATE PER ARTICOLO (SENZA ACQUIRENTE)
    // ========================================================
    const NUM_COLS_2 = 5;
    const dataWs2 = [
      [{ v: `CIRCOLO NUOTO LUCCA - ${nomeSettoreTitolo} (DETTAGLIO PERSONALIZZAZIONI PER ARTICOLO)`, s: styleBanner }, ...Array(NUM_COLS_2 - 1).fill({ v: "", s: styleBanner })],
      []
    ];
    let rigaCorrente = 2;
    const mergesWs2 = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS_2 - 1 } }];

    // Raggruppa i capi personalizzati per Tipo Articolo
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
        // Verifica quali campi sono effettivamente usati da QUESTO tipo di articolo
        const articoloUsaNome = listaCapi.some(a => a.nomePersonalizzato && String(a.nomePersonalizzato).trim() !== "");
        const articoloUsaNumero = listaCapi.some(a => a.numeroPersonalizzato && String(a.numeroPersonalizzato).trim() !== "");
        const articoloUsaColore = listaCapi.some(a => a.colorePersonalizzato && String(a.colorePersonalizzato).trim() !== "");

        // Titolo Sezione per Tipologia Articolo
        dataWs2.push([
          { v: `${sezioneIndex}. ${nomeArticolo.toUpperCase()} (${listaCapi.length} CAPI)`, s: styleSezioneTitle },
          ...Array(NUM_COLS_2 - 1).fill({ v: "", s: styleSezioneTitle })
        ]);
        mergesWs2.push({ s: { r: rigaCorrente, c: 0 }, e: { r: rigaCorrente, c: NUM_COLS_2 - 1 } });
        rigaCorrente++;

        // Intestazione Colonne uniforme
        dataWs2.push([
          { v: "Taglia", s: styleHeaderCol },
          { v: "Nome Atleta", s: styleHeaderCol },
          { v: "Nome / Testo da Applicare", s: articoloUsaNome ? styleHeaderTotal : styleHeaderCol },
          { v: "N° Calotta", s: articoloUsaNumero ? styleHeaderTotal : styleHeaderCol },
          { v: "Colore Calotta", s: articoloUsaColore ? styleHeaderTotal : styleHeaderCol }
        ]);
        rigaCorrente++;

        // Righe Capi
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
            { v: art.taglia || "Unica", s: styleCella(alt, "center", true) },
            { v: art.atleta || "-", s: styleCella(alt, "left") },
            { v: valoreNome, s: styleCella(alt, "center", articoloUsaNome && valoreNome !== "-", !articoloUsaNome) },
            { v: valoreNumero, s: styleCella(alt, "center", articoloUsaNumero && valoreNumero !== "-", !articoloUsaNumero) },
            { v: valoreColore, s: styleCella(alt, "center", articoloUsaColore && valoreColore !== "-", !articoloUsaColore) }
          ]);
          rigaCorrente++;
        });

        // Riga vuota di separazione tra le tabelle degli articoli
        dataWs2.push([]);
        rigaCorrente++;
        sezioneIndex++;
      });
    }

    const ws2 = XLSX.utils.aoa_to_sheet(dataWs2);
    ws2['!merges'] = mergesWs2;
    ws2['!cols'] = [
      { wch: 14 }, // Taglia
      { wch: 26 }, // Nome Atleta
      { wch: 32 }, // Nome / Testo da Applicare
      { wch: 16 }, // N° Calotta
      { wch: 20 }  // Colore Calotta
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Personalizzazioni");

    return wb;
  }, [settoreAttivo]);

  const mandaInLavorazioneConEmail = useCallback(async (ordiniSelezionati) => {
    const daAggiornare = ordiniSelezionati && ordiniSelezionati.length > 0 
      ? ordiniSelezionati 
      : tuttiGliOrdiniAdmin.filter(o => o.stato_pagamento === "In attesa");

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

      mostraMessaggio("In Lavorazione", `${daAggiornare.length} articoli inoltrati.`, "success");
    } catch (error) {
      mostraMessaggio("Errore: " + error.message, "error");
    } finally {
      setInvioProduzioneInCorso(false);
    }
  }, [tuttiGliOrdiniAdmin, settoreAttivo, generaFileXlsx, mostraMessaggio]);

  const esportaCsvAdmin = useCallback(() => {
    try {
      if (tuttiGliOrdiniAdmin.length === 0) return;
      const wb = generaFileXlsx(tuttiGliOrdiniAdmin);
      XLSX.writeFile(wb, `ORDINI_${settoreAttivo.toUpperCase()}_LUCCA.xlsx`);
      mostraMessaggio("Esportato", "File scaricato con successo.", "success");
    } catch (err) {
      mostraMessaggio("Errore: " + err.message, "error");
    }
  }, [tuttiGliOrdiniAdmin, settoreAttivo, generaFileXlsx, mostraMessaggio]);

  const ordiniAdminRaggruppatiPerUtente = useMemo(() => {
    const gruppiMap = new Map();
    tuttiGliOrdiniAdmin.forEach(ord => {
      const matchStato = filtroStatoAdmin === 'Tutti' || ord.stato_pagamento === filtroStatoAdmin;
      const termine = ricercaAdmin.toLowerCase().trim();
      const acquirenteStr = (ord.acquirente || '').toLowerCase();
      const emailStr = (ord.email_acquirente || '').toLowerCase();

      if (matchStato && (!termine || acquirenteStr.includes(termine) || emailStr.includes(termine))) {
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
  }, [tuttiGliOrdiniAdmin, ricercaAdmin, filtroStatoAdmin]);

  const ordiniInAttesaCount = useMemo(() => {
    return tuttiGliOrdiniAdmin.filter(o => o.stato_pagamento === "In attesa").length;
  }, [tuttiGliOrdiniAdmin]);

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

    (tuttiGliOrdiniAdmin || []).forEach(o => {
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
  }, [tuttiGliOrdiniAdmin]);

  const haSollecitoAttivo = useMemo(() => {
    return notificheSettoreCorrente.some(n => n.tipo === 'sollecito' || Boolean(n.linkPaypal));
  }, [notificheSettoreCorrente]);

  // ========================================================
  // LOGICA SOLLECITO CENTRALIZZATA & SINCRONIZZATA
  // ========================================================

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

  const aggiornaNotificaSollecitoUtente = useCallback(async (uidTarget, emailTarget, settore, forzato = false) => {
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

    if (!uid) {
      console.warn("Impossibile trovare UID utente per sollecito:", { uidTarget, emailTarget });
      return;
    }

    const notifRef = doc(db, "utenti", uid, "notifiche", `sollecito_${settore.toLowerCase()}`);
    const debito = await calcolaDebitoTotaleUtente(emailTarget, uid, settore);

    if (debito <= 0) {
      await deleteDoc(notifRef).catch(() => {});
      return;
    }

    if (!forzato) {
      const snapNotif = await getDoc(notifRef);
      if (!snapNotif.exists()) {
        return;
      }
    }

    const linkPaypal = debito > 0 
      ? `${PAYPAL_LINKS[settore] || PAYPAL_LINKS.pallanuoto}/${debito.toFixed(2)}` 
      : (PAYPAL_LINKS[settore] || PAYPAL_LINKS.pallanuoto);

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
      
      const linkPaypal = gruppoCliente.totaleDovuto > 0 
        ? `${linkPaypalSettore}/${Number(gruppoCliente.totaleDovuto).toFixed(2)}` 
        : linkPaypalSettore;

      const oggetto = encodeURIComponent(`Sollecito Saldo Forniture ${settoreAttivo.toUpperCase()} - Circolo Nuoto Lucca`);
      const corpo = encodeURIComponent(
`Gentile ${gruppoCliente.acquirente},

ti ricordiamo che risulta ancora da saldare il materiale sportivo per il settore ${settoreAttivo.toUpperCase()}:

${capiNonPagati.join('\n')}

Totale complessivo da saldare: ${importoStr}

Puoi effettuare il pagamento direttamente al seguente link PayPal ufficiale:
${linkPaypal}

Ti chiediamo cortesemente di indicare nella causale il nome dell'atleta o dei profili a cui sono intestati i capi.

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
            completato: false
          }));
        }
      }

      if (dataAggiornamento.stato_pagamento === "Completato") {
        payload.completato = true;

        if (ordTarget?.articoli && ordTarget.articoli.length > 0) {
          payload.articoli = ordTarget.articoli.map(art => ({
            ...art,
            completato: true
          }));
        }
      }

      await updateDoc(doc(db, "ordini", ordId), payload);

      if (dataAggiornamento.pagato !== undefined) {
        if (ordTarget) {
          const email = ordTarget.email_acquirente;
          const uid = ordTarget.utente_id;
          const settore = ordTarget.disciplina || settoreAttivo;
          await aggiornaNotificaSollecitoUtente(uid, email, settore, false);
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
          return { ...art, completato: !art.completato };
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
      
      {/* Toast Notification in-app */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
      
      {/* Modali globali */}
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

      {/* NAVBAR STICKY DIRETTA */}
      <Navbar 
        settoreUtente={settoreAttivo}
        onCambiaSettore={cambiaSettore}
        mostraSelettoreSettore={!adminRuolo}
        sollecitiPerSettore={sollecitiPerSettore}
        carrelloCount={carrello.length}
        totaleCarrello={totaleCarrello}
        isUserAdmin={isUserAdminNelSettore}
        inizialiUtente={inizialiUtente}
        adminTab={adminTab}
        onSetAdminTab={setAdminTab}
        onApriCarrello={() => setMostraModalCarrello(true)}
        onApriProfilo={() => setMostraModalProfilo(true)}
        onLogout={handleLogout}
      />

      {/* MAIN CON PADDING NATURALE */}
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
            onSetAdminTab={setAdminTab}
            statistiche={statisticheAdmin}
            ricerca={ricercaAdmin}
            onSetRicerca={setRicercaAdmin}
            filtroStato={filtroStatoAdmin}
            onSetFiltroStato={setFiltroStatoAdmin}
            ordiniRaggruppati={ordiniAdminRaggruppatiPerUtente}
            tuttiGliOrdini={tuttiGliOrdiniAdmin}
            ordiniInAttesaCount={ordiniInAttesaCount}
            invioProduzioneInCorso={invioProduzioneInCorso}
            onInviaProduzione={mandaInLavorazioneConEmail}
            onImpostaProntiRitiro={() => {}}
            onEsportaCsv={esportaCsvAdmin}
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
          />
        )}
      </main>
    </div>
  );
}