import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Auth from './Auth';
import Navbar from './components/Navbar';
import NegozioUtente from './components/NegozioUtente';
import PannelloAdmin from './components/PannelloAdmin';
import LightboxModal from './components/LightboxModal';
import ModalModificaOrdine from './components/ModalModificaOrdine';
import ModalProfilo from './components/ModalProfilo';
import CustomModal from './components/CustomModal';
import BannerNotifiche from './components/BannerNotifiche';

// Firebase SDK
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';

const PAYPAL_LINKS = {
  pallanuoto: "https://paypal.me/pallanuotolucca?country.x=IT&locale.x=it_IT",
  nuoto: "https://paypal.me/circolonuotolucca?country.x=IT&locale.x=it_IT"
};

const CATEGORIE_ATLETI = [
  "Maschile",
  "Femminile",
  "U18",
  "U16",
  "U14",
  "U12",
  "Extra"
];

export default function App() {
  const [utenteLoggato, setUtenteLoggato] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [prodotti, setProdotti] = useState([]);
  const [carrello, setCarrello] = useState([]);
  const [ordiniUtente, setOrdiniUtente] = useState([]);
  const [tuttiGliOrdiniAdmin, setTuttiGliOrdiniAdmin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckout, setIsCheckout] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [invioProduzioneInCorso, setInvioProduzioneInCorso] = useState(false);
  const [ordineInModifica, setOrdineInModifica] = useState(null);
  const [notificheUtente, setNotificheUtente] = useState([]);
  const [mostraModalProfilo, setMostraModalProfilo] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    tipo: 'info',
    titolo: '',
    messaggio: '',
    onConferma: null,
    testoConferma: 'Conferma',
    testoAnnulla: 'Annulla'
  });

  const mostraMessaggio = useCallback((titolo, messaggio, tipo = 'success') => {
    setModalConfig({
      isOpen: true,
      tipo,
      titolo,
      messaggio,
      onConferma: null
    });
  }, []);

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
    return localStorage.getItem("cnl_admin_tab") || 'ordini';
  });

  const [nuovoProd, setNuovoProd] = useState({ 
    nome: '', 
    prezzo: '', 
    immagine_url: '',
    taglia_unica: false,
    personalizzabile_nome: false,
    personalizzabile_numero: false,
    personalizzabile_colore: false
  });
  const [fileImmagine, setFileImmagine] = useState(null);
  const [anteprimaImmagine, setAnteprimaImmagine] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [ricercaAdmin, setRicercaAdmin] = useState('');
  const [filtroStatoAdmin, setFiltroStatoAdmin] = useState('Tutti');

  const settoreUtente = utenteLoggato?.settore || 'pallanuoto';
  const linkPaypalSettore = PAYPAL_LINKS[settoreUtente] || PAYPAL_LINKS.pallanuoto;

  useEffect(() => {
    localStorage.setItem("cnl_admin_tab", adminTab);
  }, [adminTab]);

  // Sincronizzazione Autenticazione con supporto chiavi composite per email condivise tra settori
  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const settoreRichiesto = sessionStorage.getItem("cnl_settore_richiesto") || 'pallanuoto';
        const compositeKey = `${user.uid}_${settoreRichiesto}`;
        const userDocRef = doc(db, "utenti", compositeKey);
        
        unsubscribeDoc = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            setAuthError(null);
            setUtenteLoggato({
              id: compositeKey,
              auth_uid: user.uid,
              email: user.email,
              atleti: Array.isArray(data.atleti) ? data.atleti : [],
              ...data,
              settore: data.settore || settoreRichiesto
            });
            setLoading(false);
          } else {
            // Tentativo fallback per vecchi account legacy
            const legacyRef = doc(db, "utenti", user.uid);
            onSnapshot(legacyRef, (legSnap) => {
              if (legSnap.exists() && legSnap.data().settore === settoreRichiesto) {
                const legData = legSnap.data();
                setAuthError(null);
                setUtenteLoggato({
                  id: user.uid,
                  auth_uid: user.uid,
                  email: user.email,
                  atleti: Array.isArray(legData.atleti) ? legData.atleti : [],
                  ...legData,
                  settore: legData.settore
                });
              } else {
                setUtenteLoggato(null);
              }
              setLoading(false);
            });
          }
        }, (err) => {
          console.error("Errore snapshot utente:", err);
          setLoading(false);
        });

      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setUtenteLoggato(null);
        setOrdiniUtente([]);
        setTuttiGliOrdiniAdmin([]);
        setCarrello([]);
        setNotificheUtente([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const aggiornaProfilo = async (nuoviDati) => {
    if (!utenteLoggato) return;
    try {
      await updateDoc(doc(db, "utenti", utenteLoggato.id), nuoviDati);
      mostraMessaggio("Profilo Aggiornato", "I tuoi dati sono stati aggiornati con successo.", "success");
    } catch (err) {
      mostraMessaggio("Errore", "Impossibile aggiornare il profilo: " + err.message, "error");
    }
  };

  const cancellaAccount = () => {
    if (!utenteLoggato) return;
    chiediConferma(
      "CANCELLAZIONE DEFINITIVA",
      "Attenzione: stai per eliminare definitivamente il tuo account per questo settore. L'operazione NON è reversibile. Confermi di voler procedere?",
      async () => {
        try {
          const user = auth.currentUser;
          await deleteDoc(doc(db, "utenti", utenteLoggato.id));
          if (user) {
            await deleteUser(user).catch(() => {});
          }
          mostraMessaggio("Account Eliminato", "Il tuo account è stato cancellato con successo.", "info");
        } catch (err) {
          mostraMessaggio("Errore Cancellazione", "Errore: " + err.message, "error");
        }
      },
      "Elimina Definitivamente"
    );
  };

  useEffect(() => {
    if (!utenteLoggato || utenteLoggato.is_admin) return;
    const qNotif = query(
      collection(db, "utenti", utenteLoggato.id, "notifiche"),
      orderBy("creato_il", "desc")
    );
    const unsubscribe = onSnapshot(qNotif, (snapshot) => {
      setNotificheUtente(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Errore notifiche:", err));

    return () => unsubscribe();
  }, [utenteLoggato]);

  const eliminaNotificaUtente = useCallback(async (notificaId) => {
    if (!utenteLoggato) return;
    try {
      await deleteDoc(doc(db, "utenti", utenteLoggato.id, "notifiche", notificaId));
    } catch (err) {
      console.error("Errore cancellazione notifica:", err);
    }
  }, [utenteLoggato]);

  useEffect(() => {
    if (!utenteLoggato || utenteLoggato.is_admin) return;
    const q = query(collection(db, "ordini"), where("utente_id", "==", utenteLoggato.id));
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
  }, [utenteLoggato]);

  useEffect(() => {
    if (!utenteLoggato || !utenteLoggato.is_admin) return;
    const q = query(collection(db, "ordini"), where("disciplina", "==", settoreUtente));
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
  }, [utenteLoggato, settoreUtente]);

  useEffect(() => {
    if (!utenteLoggato) return;
    const q = query(collection(db, "prodotti"), orderBy("creato_il", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.disciplina === settoreUtente || p.disciplina === 'entrambi');
      setProdotti(prods);
    }, (error) => console.error("Errore prodotti:", error));

    return () => unsubscribe();
  }, [utenteLoggato, settoreUtente]);

  const aggiungiAtletaFamiglia = async (nuovoAtleta) => {
    if (!utenteLoggato || utenteLoggato.is_admin) return;
    try {
      const userRef = doc(db, "utenti", utenteLoggato.id);
      await updateDoc(userRef, {
        atleti: arrayUnion(nuovoAtleta)
      });
      mostraMessaggio("Successo", "Profilo aggiunto correttamente al nucleo familiare.", "success");
    } catch (err) {
      mostraMessaggio("Errore", "Errore aggiunta profilo: " + err.message, "error");
    }
  };

  const rimuoviAtletaFamiglia = async (atletaDaRimuovere) => {
    if (!utenteLoggato || utenteLoggato.is_admin) return;
    const nomeVisualizzato = typeof atletaDaRimuovere === 'object' 
      ? `${atletaDaRimuovere.nome} ${atletaDaRimuovere.cognome}` 
      : atletaDaRimuovere;

    chiediConferma(
      "Elimina Profilo",
      `Vuoi rimuovere il profilo di ${nomeVisualizzato}?`,
      async () => {
        try {
          const userRef = doc(db, "utenti", utenteLoggato.id);
          await updateDoc(userRef, {
            atleti: arrayRemove(atletaDaRimuovere)
          });
          mostraMessaggio("Rimosso", "Profilo eliminato con successo.", "success");
        } catch (err) {
          mostraMessaggio("Errore", "Errore rimozione profilo: " + err.message, "error");
        }
      },
      "Elimina"
    );
  };

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
      await addDoc(collection(db, "prodotti"), {
        nome: nuovoProd.nome.trim(),
        prezzo: parseFloat(nuovoProd.prezzo) || 0,
        disciplina: settoreUtente,
        immagine_url: imageUrl,
        attivo: true,
        taglia_unica: Boolean(nuovoProd.taglia_unica),
        personalizzabile_nome: Boolean(nuovoProd.personalizzabile_nome),
        personalizzabile_numero: Boolean(nuovoProd.personalizzabile_numero),
        personalizzabile_colore: Boolean(nuovoProd.personalizzabile_colore),
        creato_il: serverTimestamp()
      });
      setNuovoProd({ 
        nome: '', prezzo: '', immagine_url: '', taglia_unica: false,
        personalizzabile_nome: false, personalizzabile_numero: false, personalizzabile_colore: false
      });
      rimuoviFileSelezionato();
      mostraMessaggio("Pubblicato", "Articolo pubblicato con successo nel catalogo!", "success");
    } catch (err) {
      mostraMessaggio("Errore", "Errore: " + err.message, "error");
    } finally {
      setUploadingImage(false);
    }
  }, [nuovoProd, fileImmagine, settoreUtente, mostraMessaggio]);

  const modificaProdottoAdmin = useCallback(async (prodottoId, datiAggiornati) => {
    try {
      await updateDoc(doc(db, "prodotti", prodottoId), {
        ...datiAggiornati,
        aggiornato_il: serverTimestamp()
      });
      mostraMessaggio("Aggiornato", "Articolo aggiornato con successo!", "success");
    } catch (err) {
      mostraMessaggio("Errore", "Errore aggiornamento articolo: " + err.message, "error");
    }
  }, [mostraMessaggio]);

  const toggleVisibilitaProdottoAdmin = useCallback(async (prodottoId, nuovoStato) => {
    try {
      await updateDoc(doc(db, "prodotti", prodottoId), {
        attivo: nuovoStato
      });
    } catch (err) {
      mostraMessaggio("Errore", "Errore cambio visibilità: " + err.message, "error");
    }
  }, [mostraMessaggio]);

  const eliminaProdottoAdmin = useCallback(async (id) => {
    chiediConferma(
      "Elimina Articolo",
      "Eliminare definitivamente questo articolo dal catalogo?",
      async () => {
        try {
          await deleteDoc(doc(db, "prodotti", id));
          mostraMessaggio("Eliminato", "Articolo eliminato dal catalogo.", "success");
        } catch (err) { 
          mostraMessaggio("Errore", "Errore: " + err.message, "error"); 
        }
      },
      "Elimina"
    );
  }, [chiediConferma, mostraMessaggio]);

  const aggiornaOrdineAdmin = useCallback(async (ordineId, datiAggiornati) => {
    try {
      await updateDoc(doc(db, "ordini", ordineId), datiAggiornati);
    } catch (err) { 
      console.error("Errore aggiornamento:", err); 
    }
  }, []);

  const salvaCampiModificatiOrdine = useCallback(async (ordineId, nuoviArticoli) => {
    try {
      await updateDoc(doc(db, "ordini", ordineId), {
        articoli: nuoviArticoli,
        modificato_il: serverTimestamp()
      });
      mostraMessaggio("Aggiornato", "Ordine aggiornato con successo!", "success");
      setOrdineInModifica(null);
    } catch (err) {
      mostraMessaggio("Errore", "Errore aggiornamento ordine: " + err.message, "error");
    }
  }, [mostraMessaggio]);

  const cancellaArticoloDaOrdine = useCallback(async (ordine, articoloIdUnivoco) => {
    if (ordine.pagato || ordine.stato_pagamento !== "In attesa") {
      mostraMessaggio("Non consentito", "Operazione non consentita: l'ordine è già saldato o è già stato inoltrato alla produzione.", "warning");
      return;
    }
    
    chiediConferma(
      "Rimuovi Articolo",
      "Rimuovere questo articolo dall'ordine?",
      async () => {
        try {
          const articoliAggiornati = (ordine.articoli || []).filter(a => a.idUnivoco !== articoloIdUnivoco);
          if (articoliAggiornati.length === 0) {
            await deleteDoc(doc(db, "ordini", ordine.id));
            mostraMessaggio("Annullato", "Tutti gli articoli sono stati rimossi: l'ordine è stato annullato.", "success");
            return;
          }
          const nuovoTotale = articoliAggiornati.reduce((acc, a) => acc + (a.prezzo || 0), 0);
          await updateDoc(doc(db, "ordini", ordine.id), {
            articoli: articoliAggiornati,
            totale: nuovoTotale
          });
          mostraMessaggio("Aggiornato", "Articolo rimosso e totale aggiornato!", "success");
        } catch (err) {
          mostraMessaggio("Errore", "Errore rimozione articolo: " + err.message, "error");
        }
      },
      "Rimuovi"
    );
  }, [chiediConferma, mostraMessaggio]);

  const annullaInteroOrdine = useCallback(async (ordine) => {
    if (ordine.pagato || ordine.stato_pagamento !== "In attesa") {
      mostraMessaggio("Non consentito", "Operazione non consentita: l'ordine è già saldato o è già stato inoltrato alla produzione.", "warning");
      return;
    }

    chiediConferma(
      "Annulla Ordine",
      `Vuoi annullare definitivamente l'ordine #${ordine.id.slice(-6).toUpperCase()}?`,
      async () => {
        try {
          await deleteDoc(doc(db, "ordini", ordine.id));
          mostraMessaggio("Annullato", "Ordine annullato con successo.", "success");
        } catch (err) {
          mostraMessaggio("Errore", "Errore annullamento ordine: " + err.message, "error");
        }
      },
      "Annulla Ordine"
    );
  }, [chiediConferma, mostraMessaggio]);

  const ordiniInAttesaCount = useMemo(() => {
    return tuttiGliOrdiniAdmin.filter(o => o.stato_pagamento === "In attesa").length;
  }, [tuttiGliOrdiniAdmin]);

  // Generatore Distinta XLS Multi-Tab Formattata
  const generaXmlDistinta = useCallback((ordiniDaElaborare) => {
    const TAGLIE_STANDARD = [
      "Taglia Unica", "6A", "8A", "10A", "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"
    ];

    const tuttiArticoli = [];
    ordiniDaElaborare.forEach(ord => {
      (ord.articoli || []).forEach(art => {
        tuttiArticoli.push({
          ...art,
          acquirente: ord.acquirente || ord.email_acquirente || "-"
        });
      });
    });

    const nomiProdottiUnivoci = Array.from(new Set(tuttiArticoli.map(a => a.nomeProdotto || "Capo")));
    const totaliPerProdotto = {};
    nomiProdottiUnivoci.forEach(nome => { totaliPerProdotto[nome] = 0; });
    let totaleGeneraleAssoluto = 0;

    const nomeSettoreTitolo = settoreUtente === 'pallanuoto' ? 'PALLANUOTO' : 'NUOTO';

    let xmlFoglio1 = `<Worksheet ss:Name="Riepilogo Taglie"><Table>`;
    xmlFoglio1 += `<Column ss:Width="110"/>`;
    nomiProdottiUnivoci.forEach(() => { xmlFoglio1 += `<Column ss:Width="130"/>`; });
    xmlFoglio1 += `<Column ss:Width="90"/>`;

    const colSpan = nomiProdottiUnivoci.length + 2;
    xmlFoglio1 += `
      <Row ss:Height="28">
        <Cell ss:MergeAcross="${colSpan - 1}" ss:StyleID="sHeaderBanner">
          <Data ss:Type="String">CIRCOLO NUOTO LUCCA - ${nomeSettoreTitolo}</Data>
        </Cell>
      </Row>
    `;

    xmlFoglio1 += `<Row ss:Height="24">`;
    xmlFoglio1 += `<Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Taglia</Data></Cell>`;
    nomiProdottiUnivoci.forEach(prod => {
      xmlFoglio1 += `<Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">${prod}</Data></Cell>`;
    });
    xmlFoglio1 += `<Cell ss:StyleID="sHeaderColTotal"><Data ss:Type="String">Totale Riga</Data></Cell>`;
    xmlFoglio1 += `</Row>`;

    TAGLIE_STANDARD.forEach((taglia, index) => {
      let sommaRiga = 0;
      const stileRiga = index % 2 === 0 ? "sCella" : "sCellaAlt";
      const stileTaglia = index % 2 === 0 ? "sTaglia" : "sTagliaAlt";

      xmlFoglio1 += `<Row ss:Height="20">`;
      xmlFoglio1 += `<Cell ss:StyleID="${stileTaglia}"><Data ss:Type="String">${taglia}</Data></Cell>`;

      nomiProdottiUnivoci.forEach(nomeProd => {
        const conteggio = tuttiArticoli.filter(a => {
          const tagliaArt = (a.taglia || "Taglia Unica").trim().toUpperCase();
          return a.nomeProdotto === nomeProd && tagliaArt === taglia.toUpperCase();
        }).length;

        totaliPerProdotto[nomeProd] += conteggio;
        sommaRiga += conteggio;
        xmlFoglio1 += `<Cell ss:StyleID="${stileRiga}"><Data ss:Type="Number">${conteggio}</Data></Cell>`;
      });

      totaleGeneraleAssoluto += sommaRiga;
      xmlFoglio1 += `<Cell ss:StyleID="sTotaleRiga"><Data ss:Type="Number">${sommaRiga}</Data></Cell>`;
      xmlFoglio1 += `</Row>`;
    });

    xmlFoglio1 += `<Row ss:Height="24">`;
    xmlFoglio1 += `<Cell ss:StyleID="sTotaleFinale"><Data ss:Type="String">TOTALE ARTICOLI</Data></Cell>`;
    nomiProdottiUnivoci.forEach(nomeProd => {
      xmlFoglio1 += `<Cell ss:StyleID="sTotaleFinale"><Data ss:Type="Number">${totaliPerProdotto[nomeProd]}</Data></Cell>`;
    });
    xmlFoglio1 += `<Cell ss:StyleID="sTotaleAssoluto"><Data ss:Type="Number">${totaleGeneraleAssoluto}</Data></Cell>`;
    xmlFoglio1 += `</Row>`;
    xmlFoglio1 += `</Table></Worksheet>`;

    let xmlFoglio2 = `<Worksheet ss:Name="Personalizzazioni"><Table>`;
    xmlFoglio2 += `<Column ss:Width="170"/>`;
    xmlFoglio2 += `<Column ss:Width="90"/>`;
    xmlFoglio2 += `<Column ss:Width="160"/>`;
    xmlFoglio2 += `<Column ss:Width="80"/>`;
    xmlFoglio2 += `<Column ss:Width="120"/>`;
    xmlFoglio2 += `<Column ss:Width="170"/>`;

    xmlFoglio2 += `
      <Row ss:Height="28">
        <Cell ss:MergeAcross="5" ss:StyleID="sHeaderBanner">
          <Data ss:Type="String">ELENCO PERSONALIZZAZIONI</Data>
        </Cell>
      </Row>
    `;

    const tipiArticoloUnivoci = Array.from(
      new Set(tuttiArticoli.map(a => (a.nomeProdotto || "ALTRO").trim()))
    ).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));

    tipiArticoloUnivoci.forEach(tipoCapo => {
      const articoliDelGruppo = tuttiArticoli.filter(
        a => (a.nomeProdotto || "ALTRO").trim() === tipoCapo
      );

      articoliDelGruppo.sort((a, b) => {
        const numA = parseInt(a.numeroPersonalizzato, 10);
        const numB = parseInt(b.numeroPersonalizzato, 10);
        const haNumA = !isNaN(numA);
        const haNumB = !isNaN(numB);

        if (haNumA && haNumB) {
          if (numA !== numB) return numA - numB;
        } else if (haNumA) {
          return -1;
        } else if (haNumB) {
          return 1;
        }

        const nomeA = (a.nomePersonalizzato || '').trim().toUpperCase();
        const nomeB = (b.nomePersonalizzato || '').trim().toUpperCase();
        if (nomeA && nomeB && nomeA !== nomeB) {
          return nomeA.localeCompare(nomeB, 'it');
        } else if (nomeA) {
          return -1;
        } else if (nomeB) {
          return 1;
        }

        return (a.taglia || '').localeCompare(b.taglia || '', 'it');
      });

      xmlFoglio2 += `
        <Row ss:Height="24">
          <Cell ss:MergeAcross="5" ss:StyleID="sHeaderBanner">
            <Data ss:Type="String">${tipoCapo.toUpperCase()} (Totale: ${articoliDelGruppo.length} pz)</Data>
          </Cell>
        </Row>
        <Row ss:Height="22">
          <Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Articolo</Data></Cell>
          <Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Taglia</Data></Cell>
          <Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Nome</Data></Cell>
          <Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Numero</Data></Cell>
          <Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Colore</Data></Cell>
          <Cell ss:StyleID="sHeaderCol"><Data ss:Type="String">Acquirente</Data></Cell>
        </Row>
      `;

      articoliDelGruppo.forEach((art, idx) => {
        const stileRiga = idx % 2 === 0 ? "sCella" : "sCellaAlt";
        const stileBold = idx % 2 === 0 ? "sTaglia" : "sTagliaAlt";

        xmlFoglio2 += `<Row ss:Height="20">`;
        xmlFoglio2 += `<Cell ss:StyleID="${stileBold}"><Data ss:Type="String">${art.nomeProdotto || "-"}</Data></Cell>`;
        xmlFoglio2 += `<Cell ss:StyleID="${stileRiga}"><Data ss:Type="String">${art.taglia || "Unica"}</Data></Cell>`;
        xmlFoglio2 += `<Cell ss:StyleID="${stileBold}"><Data ss:Type="String">${art.nomePersonalizzato ? art.nomePersonalizzato.toUpperCase() : "-"}</Data></Cell>`;
        xmlFoglio2 += `<Cell ss:StyleID="${stileRiga}"><Data ss:Type="String">${art.numeroPersonalizzato ? `N° ${art.numeroPersonalizzato}` : "-"}</Data></Cell>`;
        xmlFoglio2 += `<Cell ss:StyleID="${stileRiga}"><Data ss:Type="String">${art.colorePersonalizzato ? art.colorePersonalizzato.toUpperCase() : "-"}</Data></Cell>`;
        xmlFoglio2 += `<Cell ss:StyleID="${stileRiga}"><Data ss:Type="String">${art.acquirente || "-"}</Data></Cell>`;
        xmlFoglio2 += `</Row>`;
      });

      xmlFoglio2 += `<Row ss:Height="14"></Row>`;
    });

    xmlFoglio2 += `</Table></Worksheet>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="sHeaderBanner">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#001a4d"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#002B80" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sHeaderCol">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sHeaderColTotal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#002B80"/>
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sCella">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#334155"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sCellaAlt">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#334155"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sTaglia">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sTagliaAlt">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sTotaleRiga">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#002B80"/>
   <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sTotaleFinale">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#002B80"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#002B80"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#002B80"/>
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sTotaleAssoluto">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#002B80"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#002B80"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#002B80"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#002B80"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#002B80" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${xmlFoglio1}
 ${xmlFoglio2}
</Workbook>`;
  }, [settoreUtente]);

  const mandaInLavorazioneConEmail = useCallback(async () => {
    const daAggiornare = tuttiGliOrdiniAdmin.filter(o => o.stato_pagamento === "In attesa");
    if (daAggiornare.length === 0) {
      mostraMessaggio("Nessun Ordine", "Nessun ordine con stato 'In attesa' da mandare in lavorazione.", "info");
      return;
    }

    const nomeSettoreFile = settoreUtente === 'pallanuoto' ? 'PALLANUOTO' : 'NUOTO';
    const nomeFile = `ORDINE_${nomeSettoreFile}_LUCCA.xls`;
    const nomeSettoreTesto = settoreUtente === 'pallanuoto' ? 'Pallanuoto' : 'Nuoto';

    chiediConferma(
      "Manda in Lavorazione",
      `Confermi il passaggio a "In lavorazione" di ${daAggiornare.length} ordini per il settore ${nomeSettoreTesto}?\n` +
      `Il file ${nomeFile} verrà scaricato automaticamente e si aprirà l'email per simonedelpapa@outlook.it.`,
      async () => {
        setInvioProduzioneInCorso(true);
        try {
          const batch = writeBatch(db);
          daAggiornare.forEach(ord => {
            const docRef = doc(db, "ordini", ord.id);
            batch.update(docRef, { 
              stato_pagamento: "In lavorazione",
              inviato_produzione_il: serverTimestamp()
            });
          });
          await batch.commit();

          const xmlDoc = generaXmlDistinta(daAggiornare);
          const blob = new Blob([xmlDoc], { type: 'application/vnd.ms-excel;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = nomeFile;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          const emailDestinatario = "simonedelpapa@outlook.it";
          const oggettoMail = encodeURIComponent(`Ordine ${nomeSettoreTesto} Lucca`);
          const corpoMail = encodeURIComponent(
            `Gentile Okeo,\n\nIn allegato trovate la distinta (${nomeFile}) contenente il riepilogo taglie e le relative personalizzazioni per gli ordini approvati del settore ${nomeSettoreTesto}.\n\nRestiamo in attesa di conferma.\n\nCordiali saluti,\nCircolo Nuoto Lucca`
          );

          window.open(`mailto:${emailDestinatario}?subject=${oggettoMail}&body=${corpoMail}`, '_blank');

          mostraMessaggio(
            "Operazione Completata",
            `File Excel ${nomeFile} scaricato con successo e ${daAggiornare.length} ordini messi in lavorazione!\nAllega il file appena scaricato all'email che si è aperta.`,
            "success"
          );
        } catch (error) {
          mostraMessaggio("Errore", "Errore durante l'operazione: " + error.message, "error");
        } finally {
          setInvioProduzioneInCorso(false);
        }
      },
      "Procedi"
    );
  }, [tuttiGliOrdiniAdmin, settoreUtente, generaXmlDistinta, chiediConferma, mostraMessaggio]);

  const esportaCsvAdmin = useCallback(() => {
    try {
      if (tuttiGliOrdiniAdmin.length === 0) {
        mostraMessaggio("Nessun Ordine", "Non ci sono ordini da esportare per questo settore.", "info");
        return;
      }
      const nomeSettoreFile = settoreUtente === 'pallanuoto' ? 'PALLANUOTO' : 'NUOTO';
      const nomeFile = `ORDINE_${nomeSettoreFile}_LUCCA.xls`;

      const xmlDoc = generaXmlDistinta(tuttiGliOrdiniAdmin);
      const blob = new Blob([xmlDoc], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      mostraMessaggio("Esportazione Completata", `File ${nomeFile} generato con successo!`, "success");
    } catch (err) {
      mostraMessaggio("Errore Esportazione", "Si è verificato un errore: " + err.message, "error");
    }
  }, [tuttiGliOrdiniAdmin, settoreUtente, generaXmlDistinta, mostraMessaggio]);

  const aggiungiAlCarrello = useCallback((item) => setCarrello(prev => [...prev, item]), []);
  const rimuoviDalCarrello = useCallback((idUnivoco) => setCarrello(prev => prev.filter(item => item.idUnivoco !== idUnivoco)), []);
  const totaleCarrello = useMemo(() => carrello.reduce((acc, item) => acc + item.prezzo, 0), [carrello]);

  const gestisciCheckout = useCallback(() => {
    if (!utenteLoggato) return;
    if (carrello.length === 0) return;

    setModalConfig({
      isOpen: true,
      tipo: 'info',
      titolo: 'Reindirizzamento a PayPal',
      messaggio: `Il tuo ordine è pronto! Cliccando su "Procedi al Pagamento", l'ordine verrà registrato e si aprirà il canale PayPal del Circolo Nuoto Lucca (${settoreUtente}) con l'importo esatto di €${totaleCarrello.toFixed(2)}.`,
      testoConferma: 'Procedi al Pagamento',
      testoAnnulla: 'Annulla',
      onConferma: async () => {
        setIsCheckout(true);
        try {
          await addDoc(collection(db, "ordini"), {
            totale: totaleCarrello,
            disciplina: settoreUtente,
            stato_pagamento: "In attesa",
            pagato: false,
            utente_id: utenteLoggato.id,
            acquirente: `${utenteLoggato.nome || ''} ${utenteLoggato.cognome || ''}`.trim() || utenteLoggato.email,
            email_acquirente: utenteLoggato.email,
            articoli: carrello,
            creato_il: serverTimestamp()
          });
          
          setCarrello([]);
          
          const linkPaypalConImporto = `${linkPaypalSettore}/${totaleCarrello.toFixed(2)}`;
          window.open(linkPaypalConImporto, '_blank', 'noopener,noreferrer');
        } catch (error) { 
          mostraMessaggio("Errore", "Errore durante l'invio dell'ordine: " + error.message, "error"); 
        } finally { 
          setIsCheckout(false); 
        }
      }
    });
  }, [carrello, totaleCarrello, utenteLoggato, settoreUtente, linkPaypalSettore, mostraMessaggio]);

  const gestisciLogout = useCallback(async () => {
    try {
      sessionStorage.removeItem("cnl_settore_richiesto");
      localStorage.removeItem("cnl_admin_tab");
      await signOut(auth);
    } catch (err) {
      console.error("Errore logout:", err);
    }
  }, []);

  const ordiniAdminRaggruppatiPerUtente = useMemo(() => {
    const gruppiMap = new Map();
    tuttiGliOrdiniAdmin.forEach(ord => {
      const matchStato = filtroStatoAdmin === 'Tutti' || ord.stato_pagamento === filtroStatoAdmin;
      const termine = ricercaAdmin.toLowerCase().trim();
      const acquirenteStr = (ord.acquirente || '').toLowerCase();
      const emailStr = (ord.email_acquirente || '').toLowerCase();
      const matchId = String(ord.id).toLowerCase().includes(termine);
      const matchAtleta = (ord.articoli || []).some(art => (art.atleta || '').toLowerCase().includes(termine));

      if (matchStato && (termine === '' || acquirenteStr.includes(termine) || emailStr.includes(termine) || matchId || matchAtleta)) {
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
        if (ord.pagato) {
          gruppo.totalePagato += (ord.totale || 0);
        } else {
          gruppo.totaleDovuto += (ord.totale || 0);
        }
      }
    });
    return Array.from(gruppiMap.values());
  }, [tuttiGliOrdiniAdmin, ricercaAdmin, filtroStatoAdmin]);

  const inviaSollecitoSingolo = useCallback(async (gruppo) => {
    if (gruppo.totaleDovuto <= 0) return;

    const utenteId = gruppo.ordini[0]?.utente_id;
    if (!utenteId) {
      mostraMessaggio("Errore", "Impossibile identificare l'ID dell'utente.", "error");
      return;
    }

    const dettagliOrdini = gruppo.ordini
      .filter(o => !o.pagato)
      .map(o => ({
        idOrdine: o.id,
        stato: o.stato_pagamento,
        totale: o.totale,
        capi: (o.articoli || []).map(a => `${a.nomeProdotto} (${a.atleta})`).join(", ")
      }));

    const linkPaypalConImporto = `${linkPaypalSettore}/${gruppo.totaleDovuto.toFixed(2)}`;
    const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    chiediConferma(
      "Invia Sollecito",
      `Inviare una notifica di sollecito a ${gruppo.acquirente} per un totale dovuto di €${gruppo.totaleDovuto.toFixed(2)}?`,
      async () => {
        try {
          await addDoc(collection(db, "utenti", utenteId, "notifiche"), {
            titolo: "Sollecito Pagamento Ordini",
            messaggio: `Risultano ordini non saldati per un totale di €${gruppo.totaleDovuto.toFixed(2)}. Clicca sul pulsante per completare il pagamento tramite PayPal.`,
            totaleDovuto: gruppo.totaleDovuto,
            dettagliOrdini: dettagliOrdini,
            linkPaypal: linkPaypalConImporto,
            data_invio: dataOggi,
            creato_il: serverTimestamp()
          });

          const subject = encodeURIComponent("Sollecito Pagamento - CNL Shop");
          const body = encodeURIComponent(
            `Ciao ${gruppo.acquirente},\n\nTi ricordiamo che risultano ordini da saldare su CNL Shop per un totale di €${gruppo.totaleDovuto.toFixed(2)}.\n\nPuoi procedere comodamente al pagamento tramite il link PayPal:\n${linkPaypalConImporto}\n\nGrazie,\nCircolo Nuoto Lucca`
          );
          window.open(`mailto:${gruppo.email}?subject=${subject}&body=${body}`, '_blank');

          mostraMessaggio("Inviato", `Sollecito inviato con successo a ${gruppo.acquirente}!`, "success");
        } catch (err) {
          mostraMessaggio("Errore", "Errore invio sollecito: " + err.message, "error");
        }
      },
      "Invia Notifica"
    );
  }, [linkPaypalSettore, mostraMessaggio, chiediConferma]);

  const inviaSollecitoMassivo = useCallback(async () => {
    const utentiMorosi = ordiniAdminRaggruppatiPerUtente.filter(g => g.totaleDovuto > 0);

    if (utentiMorosi.length === 0) {
      mostraMessaggio("Tutto Saldato", "Non ci sono account con ordini in sospeso da saldare.", "info");
      return;
    }

    chiediConferma(
      "Sollecito Massivo",
      `Confermi l'invio della notifica di saldo a tutti i ${utentiMorosi.length} utenti che hanno ordini non ancora pagati?`,
      async () => {
        try {
          const batch = writeBatch(db);
          const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

          utentiMorosi.forEach(gruppo => {
            const utenteId = gruppo.ordini[0]?.utente_id;
            if (utenteId) {
              const notifRef = doc(collection(db, "utenti", utenteId, "notifiche"));
              const linkPaypalConImporto = `${linkPaypalSettore}/${gruppo.totaleDovuto.toFixed(2)}`;
              const dettagliOrdini = gruppo.ordini
                .filter(o => !o.pagato)
                .map(o => ({
                  idOrdine: o.id,
                  stato: o.stato_pagamento,
                  totale: o.totale,
                  capi: (o.articoli || []).map(a => `${a.nomeProdotto} (${a.atleta})`).join(", ")
                }));

              batch.set(notifRef, {
                titolo: "Sollecito Pagamento Ordini",
                messaggio: `Risultano ordini non saldati per un totale di €${gruppo.totaleDovuto.toFixed(2)}. Clicca sul pulsante per completare il pagamento tramite PayPal.`,
                totaleDovuto: gruppo.totaleDovuto,
                dettagliOrdini: dettagliOrdini,
                linkPaypal: linkPaypalConImporto,
                data_invio: dataOggi,
                creato_il: serverTimestamp()
              });
            }
          });

          await batch.commit();
          mostraMessaggio("Inoltro Completato", `Notifiche inviate a ${utentiMorosi.length} utenti con successo!`, "success");
        } catch (err) {
          mostraMessaggio("Errore", "Errore durante l'invio massivo: " + err.message, "error");
        }
      },
      "Invia a Tutti"
    );
  }, [ordiniAdminRaggruppatiPerUtente, linkPaypalSettore, mostraMessaggio, chiediConferma]);

  const statisticheAdmin = useMemo(() => {
    const stats = { inAttesa: 0, inLavorazione: 0, pronti: 0, completati: 0, incassoTotale: 0, incassoVerificato: 0, totaleArticoliVenduti: 0 };
    tuttiGliOrdiniAdmin.forEach(o => {
      if (o.stato_pagamento === 'In attesa') stats.inAttesa++;
      if (o.stato_pagamento === 'In lavorazione') stats.inLavorazione++;
      if (o.stato_pagamento === 'Pronto per il ritiro') stats.pronti++;
      if (o.stato_pagamento === 'Completato') stats.completati++;
      stats.incassoTotale += (o.totale || 0);
      if (o.pagato) {
        stats.incassoVerificato += (o.totale || 0);
        if (o.articoli) stats.totaleArticoliVenduti += o.articoli.length;
      }
    });
    return stats;
  }, [tuttiGliOrdiniAdmin]);

  const inizialiUtente = useMemo(() => {
    if (!utenteLoggato) return "CN";
    const nome = utenteLoggato.nome || "";
    const cognome = utenteLoggato.cognome || "";
    if (nome && cognome) return `${nome[0]}${cognome[0]}`.toUpperCase();
    if (nome) return nome.slice(0, 2).toUpperCase();
    return utenteLoggato.email?.slice(0, 2).toUpperCase() || "CN";
  }, [utenteLoggato]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-9 h-9 rounded-full border-3 border-[#002b80] border-t-transparent animate-spin mb-3"></div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Caricamento in corso...</span>
      </div>
    );
  }

  if (!utenteLoggato) {
    return (
      <div className="font-sans antialiased min-h-screen bg-slate-50">
        <Auth 
          onLoginSuccess={(datiUtente) => {
            setAuthError(null);
            setUtenteLoggato(datiUtente);
          }} 
          externalError={authError}
          onClearExternalError={() => setAuthError(null)}
          onSettoreChange={() => setAuthError(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 antialiased bg-slate-50/60">
      
      <CustomModal 
        modalConfig={modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
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
          listaAtleti={utenteLoggato.atleti || []}
          prodotti={prodotti}
          onClose={() => setOrdineInModifica(null)}
          onSalva={salvaCampiModificatiOrdine}
        />
      )}

      <Navbar 
        settoreUtente={settoreUtente}
        carrelloCount={carrello.length}
        totaleCarrello={totaleCarrello}
        isUserAdmin={utenteLoggato.is_admin}
        inizialiUtente={inizialiUtente}
        utenteLoggato={utenteLoggato}
        adminTab={adminTab}
        onSetAdminTab={setAdminTab}
        onApriProfilo={() => setMostraModalProfilo(true)}
        onLogout={gestisciLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!utenteLoggato.is_admin ? (
          <>
            <BannerNotifiche 
              notifiche={notificheUtente}
              onEliminaNotifica={eliminaNotificaUtente}
            />
            <NegozioUtente 
              utenteLoggato={utenteLoggato}
              prodotti={prodotti}
              carrello={carrello}
              totaleCarrello={totaleCarrello}
              ordiniUtente={ordiniUtente}
              isCheckout={isCheckout}
              categorieAtleti={CATEGORIE_ATLETI}
              settoreUtente={settoreUtente}
              linkPaypal={linkPaypalSettore}
              onAggiungiAlCarrello={aggiungiAlCarrello}
              onRimuoviDalCarrello={rimuoviDalCarrello}
              onCheckout={gestisciCheckout}
              onZoomFoto={(src, alt) => setZoomImage({ src, alt })}
              onAggiungiAtleta={aggiungiAtletaFamiglia}
              onRimuoviAtleta={rimuoviAtletaFamiglia}
              onApriModificaOrdine={setOrdineInModifica}
              onAnnullaOrdine={annullaInteroOrdine}
              onCancellaArticolo={cancellaArticoloDaOrdine}
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
            ordiniInAttesaCount={ordiniInAttesaCount}
            invioProduzioneInCorso={invioProduzioneInCorso}
            onInviaProduzione={mandaInLavorazioneConEmail}
            onEsportaCsv={esportaCsvAdmin}
            onAggiornaOrdine={aggiornaOrdineAdmin}
            onApriModificaOrdine={setOrdineInModifica}
            onAnnullaOrdine={annullaInteroOrdine}
            onCancellaArticolo={cancellaArticoloDaOrdine}
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
            onInviaSollecitoMassivo={inviaSollecitoMassivo}
            onInviaSollecitoSingolo={inviaSollecitoSingolo}
            settoreUtente={settoreUtente}
            onZoomFoto={(src, alt) => setZoomImage({ src, alt })}
          />
        )}
      </main>
    </div>
  );
}