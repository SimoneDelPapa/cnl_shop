import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faXmark, 
  faCartPlus, 
  faCartShopping,
  faShirt, 
  faLock,
  faCheck,
  faTrashCan,
  faReceipt,
  faArrowRight,
  faPenToSquare
} from '@fortawesome/free-solid-svg-icons';
import { getTaglieByScalaId } from '../utils/taglie';

const TAGLIE_DEFAULT = ["4XS", "3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
const NUMERI_CALOTTA = Array.from({ length: 15 }, (_, i) => i + 1);

function ContenutoCreaOrdineAdmin({
  account,
  prodotti = [],
  settoreUtente = 'pallanuoto',
  onClose,
  onZoomFoto,
  onConfermaOrdine
}) {
  const isNuoto = settoreUtente === 'nuoto';

  const profiliAccount = useMemo(() => {
    if (!account || !Array.isArray(account.profili)) return [];
    return account.profili.map(p => ({
      nomeCompleto: typeof p === 'object' ? (p.nomeCompleto || `${p.nome || ''} ${p.cognome || ''}`.trim()) : String(p),
      categoria: typeof p === 'object' ? (p.categoria || 'Extra') : 'Extra'
    }));
  }, [account]);

  const prodottiAttivi = useMemo(() => {
    return (prodotti || []).filter(p => p.attivo !== false);
  }, [prodotti]);

  const [configurazioniArticoli, setConfigurazioniArticoli] = useState({});
  const [carrelloDelegato, setCarrelloDelegato] = useState([]);
  const [mostraCarrelloDrawer, setMostraCarrelloDrawer] = useState(false);
  const [itemInModifica, setItemInModifica] = useState(null);
  const [inInvio, setInInvio] = useState(false);

  const getTaglieProdotto = (prod) => {
    if (!prod) return TAGLIE_DEFAULT;
    if (prod.taglia_unica) return ["Taglia Unica"];
    if (prod.scala_taglie_id) {
      const daScala = getTaglieByScalaId(prod.scala_taglie_id);
      if (Array.isArray(daScala) && daScala.length > 0) return daScala;
    }
    if (Array.isArray(prod.taglie_disponibili) && prod.taglie_disponibili.length > 0) {
      return prod.taglie_disponibili;
    }
    return TAGLIE_DEFAULT;
  };

  const getCategoriaByNome = (nomeAtleta) => {
    const trovato = profiliAccount.find(
      p => p.nomeCompleto.toLowerCase() === (nomeAtleta || '').toLowerCase()
    );
    return trovato?.categoria || 'Extra';
  };

  const getConfig = (prod) => {
    const taglieList = getTaglieProdotto(prod);
    const current = configurazioniArticoli[prod.id] || {};
    const profiloDefault = profiliAccount[0]?.nomeCompleto || 'Profilo Generale';
    const atletaValido = current.atleta && profiliAccount.some(p => p.nomeCompleto === current.atleta)
      ? current.atleta
      : profiloDefault;

    const tagliaValida = prod.taglia_unica
      ? "Taglia Unica"
      : (current.taglia && taglieList.includes(current.taglia) ? current.taglia : (taglieList[0] || "M"));

    return {
      atleta: atletaValido,
      taglia: tagliaValida,
      nomePersonalizzato: current.nomePersonalizzato || '',
      numeroPersonalizzato: current.numeroPersonalizzato || '',
      colorePersonalizzato: current.colorePersonalizzato || 'BIANCA',
      pagato: Boolean(current.pagato)
    };
  };

  const aggiornaConfig = (prodId, patch) => {
    setConfigurazioniArticoli(prev => ({
      ...prev,
      [prodId]: {
        ...(prev[prodId] || {}),
        ...patch
      }
    }));
  };

  const handleAggiungiAlCarrelloDelegato = (prod) => {
    if (inInvio) return;

    const taglieList = getTaglieProdotto(prod);
    const cfg = getConfig(prod);
    const categoriaCorrente = getCategoriaByNome(cfg.atleta);
    const numInt = parseInt(cfg.numeroPersonalizzato, 10);
    const haNum = !isNaN(numInt) && cfg.numeroPersonalizzato !== '';
    const isU14oU18 = categoriaCorrente === 'U14' || categoriaCorrente === 'U18' || categoriaCorrente === 'Baby' || categoriaCorrente === 'Extra';

    const isPortiereRossoObbligatorio = haNum && (numInt === 1 || (numInt === 13 && !isU14oU18));
    const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (numInt === 13 && isU14oU18);

    let coloreFinale = cfg.colorePersonalizzato || 'BIANCA';
    if (isPortiereRossoObbligatorio) coloreFinale = 'ROSSA';
    else if (!isRossoConsentito && coloreFinale === 'ROSSA') coloreFinale = 'BIANCA';

    const isUnica = taglieList.length === 1 && taglieList[0] === "Taglia Unica";

    const nuovoArticoloCarrello = {
      idUnivoco: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      utenteId: account.id,
      emailAcquirente: account.email,
      nomeAcquirente: account.nomeCompleto,
      atleta: cfg.atleta || 'Profilo Generale',
      categoria: categoriaCorrente,
      prodotto: prod,
      taglia: isUnica ? "Taglia Unica" : cfg.taglia,
      nomePersonalizzato: !isNuoto && prod.personalizzabile_nome && cfg.nomePersonalizzato.trim()
        ? cfg.nomePersonalizzato.trim().toUpperCase().slice(0, 15)
        : null,
      numeroPersonalizzato: !isNuoto && prod.personalizzabile_numero && cfg.numeroPersonalizzato !== ''
        ? cfg.numeroPersonalizzato
        : null,
      colorePersonalizzato: !isNuoto && prod.personalizzabile_colore ? coloreFinale : null,
      pagatoSubito: Boolean(cfg.pagato)
    };

    setCarrelloDelegato(prev => [...prev, nuovoArticoloCarrello]);
  };

  const apriModificaCarrelloItem = (item) => {
    setItemInModifica({
      ...item,
      atleta: item.atleta || profiliAccount[0]?.nomeCompleto || 'Profilo Generale',
      nomePersonalizzato: item.nomePersonalizzato || '',
      numeroPersonalizzato: item.numeroPersonalizzato ? String(item.numeroPersonalizzato) : '',
      colorePersonalizzato: item.colorePersonalizzato || 'BIANCA'
    });
  };

  const handleSalvaModificaCarrelloItem = (e) => {
    e.preventDefault();
    if (!itemInModifica) return;

    const prod = itemInModifica.prodotto || {};
    const cat = getCategoriaByNome(itemInModifica.atleta);
    const numInt = parseInt(itemInModifica.numeroPersonalizzato, 10);
    const haNum = !isNaN(numInt) && itemInModifica.numeroPersonalizzato !== '';
    const isU14oU18 = cat === 'U14' || cat === 'U18' || cat === 'Baby' || cat === 'Extra';

    const isPortiereRossoObbligatorio = haNum && (numInt === 1 || (numInt === 13 && !isU14oU18));
    const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (numInt === 13 && isU14oU18);

    let coloreFinale = itemInModifica.colorePersonalizzato || 'BIANCA';
    if (isPortiereRossoObbligatorio) coloreFinale = 'ROSSA';
    else if (!isRossoConsentito && coloreFinale === 'ROSSA') coloreFinale = 'BIANCA';

    const aggiornato = {
      ...itemInModifica,
      categoria: cat,
      nomePersonalizzato: !isNuoto && prod.personalizzabile_nome && itemInModifica.nomePersonalizzato?.trim()
        ? itemInModifica.nomePersonalizzato.trim().toUpperCase().slice(0, 15)
        : null,
      numeroPersonalizzato: !isNuoto && prod.personalizzabile_numero && itemInModifica.numeroPersonalizzato !== ''
        ? String(itemInModifica.numeroPersonalizzato)
        : null,
      colorePersonalizzato: !isNuoto && prod.personalizzabile_colore ? coloreFinale : null
    };

    setCarrelloDelegato(prev =>
      prev.map(c => (c.idUnivoco === aggiornato.idUnivoco ? aggiornato : c))
    );
    setItemInModifica(null);
  };

  const togglePagatoArticoloCarrello = (idUnivoco) => {
    setCarrelloDelegato(prev =>
      prev.map(item =>
        item.idUnivoco === idUnivoco
          ? { ...item, pagatoSubito: !item.pagatoSubito }
          : item
      )
    );
  };

  const rimuoviArticoloCarrello = (idUnivoco) => {
    setCarrelloDelegato(prev => {
      const next = prev.filter(item => item.idUnivoco !== idUnivoco);
      if (next.length === 0) setMostraCarrelloDrawer(false);
      return next;
    });
  };

  const totaleCarrelloDelegato = useMemo(() => {
    return carrelloDelegato.reduce((acc, item) => acc + Number(item.prodotto?.prezzo || 0), 0);
  }, [carrelloDelegato]);

  const handleConfermaOrdineCarrello = async () => {
    if (!onConfermaOrdine || carrelloDelegato.length === 0 || inInvio) return;
    setInInvio(true);
    try {
      await onConfermaOrdine(carrelloDelegato);
      setCarrelloDelegato([]);
      setMostraCarrelloDrawer(false);
      onClose();
    } finally {
      setInInvio(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2.5 sm:p-4 md:p-6 animate-in fade-in duration-150 overflow-y-auto"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-4xl h-[92dvh] sm:h-[88vh] bg-white rounded-3xl sm:rounded-[2.25rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* TESTATA */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-base sm:text-lg shadow-inner shrink-0">
                <FontAwesomeIcon icon={faCartPlus} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-700 block truncate">
                  Creazione Ordine Delegata
                </span>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate">
                  Account: <span className="text-[#002b80]">{account.nomeCompleto}</span>{' '}
                  <span className="text-xs font-semibold text-slate-400">({account.email})</span>
                </h3>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {/* CORPO */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 custom-scrollbar">
            {prodottiAttivi.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
                <p className="text-sm font-bold text-slate-400">
                  Nessun articolo a catalogo per questo settore.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prodottiAttivi.map(prod => {
                  const taglieList = getTaglieProdotto(prod);
                  const isUnica = taglieList.length === 1 && taglieList[0] === "Taglia Unica";
                  const juniorTaglie = taglieList.filter(t => t.startsWith("Junior "));
                  const standardTaglie = taglieList.filter(t => !t.startsWith("Junior ") && t !== "Taglia Unica");
                  const haGruppi = juniorTaglie.length > 0 && standardTaglie.length > 0;

                  const cfg = getConfig(prod);
                  const categoriaCorrente = getCategoriaByNome(cfg.atleta);
                  const numInt = parseInt(cfg.numeroPersonalizzato, 10);
                  const haNum = !isNaN(numInt) && cfg.numeroPersonalizzato !== '';
                  const isU14oU18 = categoriaCorrente === 'U14' || categoriaCorrente === 'U18' || categoriaCorrente === 'Baby' || categoriaCorrente === 'Extra';
                  const isPortiereRossoObbligatorio = haNum && (numInt === 1 || (numInt === 13 && !isU14oU18));
                  const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (numInt === 13 && isU14oU18);
                  const coloriOpzioni = isPortiereRossoObbligatorio
                    ? ["ROSSA"]
                    : (isRossoConsentito ? ["BIANCA", "NERA", "ROSSA"] : ["BIANCA", "NERA"]);

                  return (
                    <div 
                      key={prod.id}
                      className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs flex flex-col justify-between space-y-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          onClick={() => prod.immagine_url && onZoomFoto && onZoomFoto(prod.immagine_url, prod.nome)}
                          className={`w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0 ${prod.immagine_url ? 'cursor-zoom-in' : ''}`}
                        >
                          {prod.immagine_url ? (
                            <img src={prod.immagine_url} alt={prod.nome} className="w-full h-full object-contain" />
                          ) : (
                            <FontAwesomeIcon icon={faShirt} className="text-slate-300 text-xl" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-black text-slate-900 leading-tight">{prod.nome}</h4>
                            <span className="text-sm font-black text-[#002b80] tabular-nums shrink-0">
                              €{Number(prod.prezzo || 0).toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                            {isUnica ? "Taglia Unica" : `${taglieList[0]} — ${taglieList[taglieList.length - 1]}`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2.5 border-t border-slate-100">
                        {/* ASSEGNA A PROFILO SU SINGOLO ARTICOLO */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Assegna a Profilo
                          </label>
                          <select
                            value={cfg.atleta}
                            onChange={e => aggiornaConfig(prod.id, { atleta: e.target.value })}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                          >
                            {profiliAccount.length > 0 ? (
                              profiliAccount.map((p, idx) => (
                                <option key={idx} value={p.nomeCompleto}>
                                  {p.nomeCompleto} ({p.categoria})
                                </option>
                              ))
                            ) : (
                              <option value="Profilo Generale">Profilo Generale</option>
                            )}
                          </select>
                        </div>

                        {!isUnica && (
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Taglia
                            </label>
                            <select
                              value={cfg.taglia}
                              onChange={e => aggiornaConfig(prod.id, { taglia: e.target.value })}
                              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                            >
                              {haGruppi ? (
                                <>
                                  <optgroup label="JUNIOR">
                                    {juniorTaglie.map(t => (
                                      <option key={t} value={t}>{t.replace("Junior ", "")}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="STANDARD">
                                    {standardTaglie.map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </optgroup>
                                </>
                              ) : (
                                taglieList.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))
                              )}
                            </select>
                          </div>
                        )}

                        {!isNuoto && (prod.personalizzabile_nome || prod.personalizzabile_numero || prod.personalizzabile_colore) && (
                          <div className="space-y-2">
                            {prod.personalizzabile_nome && (
                              <input
                                type="text"
                                maxLength={15}
                                placeholder="NOME STAMPATO"
                                value={cfg.nomePersonalizzato}
                                onChange={e => aggiornaConfig(prod.id, { nomePersonalizzato: e.target.value.toUpperCase() })}
                                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-black uppercase tracking-wider text-slate-900 focus:outline-none focus:border-[#002b80]"
                              />
                            )}

                            {(prod.personalizzabile_numero || prod.personalizzabile_colore) && (
                              <div className="grid grid-cols-2 gap-2">
                                {prod.personalizzabile_numero && (
                                  <select
                                    value={cfg.numeroPersonalizzato}
                                    onChange={e => {
                                      const n = e.target.value;
                                      const parsed = parseInt(n, 10);
                                      const valido = !isNaN(parsed) && n !== '';
                                      let col = cfg.colorePersonalizzato || 'BIANCA';
                                      if (valido && (parsed === 1 || (parsed === 13 && !isU14oU18))) col = 'ROSSA';
                                      else if (col === 'ROSSA' && (!valido || (parsed !== 13 && isU14oU18) || (parsed !== 1 && parsed !== 13))) col = 'BIANCA';
                                      aggiornaConfig(prod.id, { numeroPersonalizzato: n, colorePersonalizzato: col });
                                    }}
                                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                                  >
                                    <option value="">N° Calotta</option>
                                    {NUMERI_CALOTTA.map(n => (
                                      <option key={n} value={String(n)}>N° {n}</option>
                                    ))}
                                  </select>
                                )}

                                {prod.personalizzabile_colore && (
                                  <div className="relative">
                                    <select
                                      disabled={isPortiereRossoObbligatorio}
                                      value={isPortiereRossoObbligatorio ? 'ROSSA' : cfg.colorePersonalizzato}
                                      onChange={e => aggiornaConfig(prod.id, { colorePersonalizzato: e.target.value })}
                                      className={`w-full h-10 border rounded-xl px-2.5 text-xs font-black cursor-pointer focus:outline-none ${
                                        isPortiereRossoObbligatorio
                                          ? 'bg-amber-50 text-red-700 border-amber-300 pr-6'
                                          : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-[#002b80]'
                                      }`}
                                    >
                                      {coloriOpzioni.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                    {isPortiereRossoObbligatorio && (
                                      <FontAwesomeIcon 
                                        icon={faLock} 
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-600 text-xs pointer-events-none" 
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAggiungiAlCarrelloDelegato(prod)}
                        className="w-full h-10 bg-[#002b80] hover:bg-[#002060] active:scale-[0.98] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faCartPlus} className="text-xs" />
                        <span>Aggiungi al Carrello</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BARRA INFERIORE CON ACCESSO RAPIDO AL CARRELLO E CONFERMA ORDINE */}
          {carrelloDelegato.length > 0 && (
            <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMostraCarrelloDrawer(true)}
                className="flex items-center gap-2.5 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-[#002b80] border border-blue-200 flex items-center justify-center transition-colors">
                  <FontAwesomeIcon icon={faCartShopping} />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {carrelloDelegato.length} {carrelloDelegato.length === 1 ? 'capo nel carrello' : 'capi nel carrello'}
                  </span>
                  <span className="text-xs font-black text-[#002b80] tabular-nums">
                    Totale: €{totaleCarrelloDelegato.toFixed(2)}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMostraCarrelloDrawer(true)}
                className="h-11 px-4 sm:px-5 bg-[#002b80] hover:bg-[#002060] text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <span>Rivedi & Conferma</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALE CARRELLO ORDINE DELEGATO (MODIFICA + SALDATO PER SINGOLO CAPO + CONFERMA ORDINE) */}
      {mostraCarrelloDrawer && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setMostraCarrelloDrawer(false)}
        >
          <div 
            className="relative w-full max-w-2xl max-h-[90dvh] bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-base">
                  <FontAwesomeIcon icon={faCartShopping} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#002b80] block">
                    Carrello Delegato • {account.nomeCompleto}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Articoli Selezionati ({carrelloDelegato.length})
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostraCarrelloDrawer(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {carrelloDelegato.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl">
                  <p className="text-sm font-bold text-slate-400">Il carrello è vuoto.</p>
                </div>
              ) : (
                carrelloDelegato.map(item => (
                  <div 
                    key={item.idUnivoco}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{item.prodotto.nome}</span>
                        <span className="text-[10px] font-black uppercase text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          Taglia: {item.taglia}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        Profilo: <strong className="text-slate-800">{item.atleta}</strong> ({item.categoria})
                      </p>
                      {(item.nomePersonalizzato || item.numeroPersonalizzato || item.colorePersonalizzato) && (
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          {item.nomePersonalizzato && (
                            <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              "{item.nomePersonalizzato}"
                            </span>
                          )}
                          {item.numeroPersonalizzato && (
                            <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              N° {item.numeroPersonalizzato}
                            </span>
                          )}
                          {item.colorePersonalizzato && (
                            <span className="text-[10px] font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              {item.colorePersonalizzato}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/70 shrink-0">
                      <span className="text-sm font-black text-[#002b80] tabular-nums mr-0.5">
                        €{Number(item.prodotto.prezzo || 0).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => apriModificaCarrelloItem(item)}
                        className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#002b80] border border-blue-200 flex items-center justify-center text-xs cursor-pointer transition-colors"
                        title="Modifica articolo e personalizzazioni"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePagatoArticoloCarrello(item.idUnivoco)}
                        className={`h-9 px-3 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-colors ${
                          item.pagatoSubito
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {item.pagatoSubito && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                        <span>{item.pagatoSubito ? "Saldato" : "Non saldato"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => rimuoviArticoloCarrello(item.idUnivoco)}
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center text-xs cursor-pointer transition-colors"
                        title="Rimuovi dal carrello"
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Totale Ordine
                </span>
                <span className="text-xl font-black text-[#002b80] tabular-nums">
                  €{totaleCarrelloDelegato.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={carrelloDelegato.length === 0 || inInvio}
                onClick={handleConfermaOrdineCarrello}
                className="h-12 px-6 bg-[#002b80] hover:bg-[#002060] disabled:bg-slate-300 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99]"
              >
                <FontAwesomeIcon icon={faReceipt} />
                <span>{inInvio ? "Conferma in corso..." : "Conferma Ordine"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODALE MODIFICA ARTICOLO E PERSONALIZZAZIONI NEL CARRELLO DELEGATO */}
      {itemInModifica && (() => {
        const prod = itemInModifica.prodotto || {};
        const taglieList = getTaglieProdotto(prod);
        const isUnica = taglieList.length === 1 && taglieList[0] === "Taglia Unica";
        const juniorTaglie = taglieList.filter(t => t.startsWith("Junior "));
        const standardTaglie = taglieList.filter(t => !t.startsWith("Junior ") && t !== "Taglia Unica");
        const haGruppi = juniorTaglie.length > 0 && standardTaglie.length > 0;

        const cat = getCategoriaByNome(itemInModifica.atleta);
        const numInt = parseInt(itemInModifica.numeroPersonalizzato, 10);
        const haNum = !isNaN(numInt) && itemInModifica.numeroPersonalizzato !== '';
        const isU14oU18 = cat === 'U14' || cat === 'U18' || cat === 'Baby' || cat === 'Extra';
        const isPortiereRossoObbligatorio = haNum && (numInt === 1 || (numInt === 13 && !isU14oU18));
        const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (numInt === 13 && isU14oU18);
        const coloriOpzioni = isPortiereRossoObbligatorio
          ? ["ROSSA"]
          : (isRossoConsentito ? ["BIANCA", "NERA", "ROSSA"] : ["BIANCA", "NERA"]);

        return (
          <div 
            className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
            onClick={() => setItemInModifica(null)}
          >
            <div 
              className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#002b80] block">
                    Carrello Delegato
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    Modifica {prod.nome}
                  </h4>
                </div>
                <button 
                  type="button"
                  onClick={() => setItemInModifica(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              <form onSubmit={handleSalvaModificaCarrelloItem} className="flex-1 overflow-y-auto pr-1 space-y-3.5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Assegna a Profilo
                  </label>
                  <select
                    value={itemInModifica.atleta || ''}
                    onChange={e => setItemInModifica({ ...itemInModifica, atleta: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                  >
                    {profiliAccount.length > 0 ? (
                      profiliAccount.map((p, idx) => (
                        <option key={idx} value={p.nomeCompleto}>
                          {p.nomeCompleto} ({p.categoria})
                        </option>
                      ))
                    ) : (
                      <option value="Profilo Generale">Profilo Generale</option>
                    )}
                  </select>
                </div>

                {!isUnica && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Taglia
                    </label>
                    <select
                      value={taglieList.includes(itemInModifica.taglia) ? itemInModifica.taglia : taglieList[0]}
                      onChange={e => setItemInModifica({ ...itemInModifica, taglia: e.target.value })}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                    >
                      {haGruppi ? (
                        <>
                          <optgroup label="JUNIOR">
                            {juniorTaglie.map(t => (
                              <option key={t} value={t}>{t.replace("Junior ", "")}</option>
                            ))}
                          </optgroup>
                          <optgroup label="STANDARD">
                            {standardTaglie.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </optgroup>
                        </>
                      ) : (
                        taglieList.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {!isNuoto && (prod.personalizzabile_nome || prod.personalizzabile_numero || prod.personalizzabile_colore) && (
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Personalizzazioni Articolo
                    </span>

                    {prod.personalizzabile_nome && (
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="NOME STAMPATO (MAX 15)"
                          value={itemInModifica.nomePersonalizzato || ''}
                          onChange={e => setItemInModifica({
                            ...itemInModifica,
                            nomePersonalizzato: e.target.value.toUpperCase()
                          })}
                          className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-12 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 focus:outline-none focus:border-[#002b80]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                          {(itemInModifica.nomePersonalizzato || '').length}/15
                        </span>
                      </div>
                    )}

                    {(prod.personalizzabile_numero || prod.personalizzabile_colore) && (
                      <div className="grid grid-cols-2 gap-2">
                        {prod.personalizzabile_numero && (
                          <select
                            value={itemInModifica.numeroPersonalizzato || ''}
                            onChange={e => {
                              const n = e.target.value;
                              const parsed = parseInt(n, 10);
                              const valido = !isNaN(parsed) && n !== '';
                              let col = itemInModifica.colorePersonalizzato || 'BIANCA';
                              if (valido && (parsed === 1 || (parsed === 13 && !isU14oU18))) col = 'ROSSA';
                              else if (col === 'ROSSA' && (!valido || (parsed !== 13 && isU14oU18) || (parsed !== 1 && parsed !== 13))) col = 'BIANCA';
                              setItemInModifica({
                                ...itemInModifica,
                                numeroPersonalizzato: n,
                                colorePersonalizzato: col
                              });
                            }}
                            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                          >
                            <option value="">N° Calotta...</option>
                            {NUMERI_CALOTTA.map(n => (
                              <option key={n} value={String(n)}>N° {n}</option>
                            ))}
                          </select>
                        )}

                        {prod.personalizzabile_colore && (
                          <div className="relative">
                            <select
                              disabled={isPortiereRossoObbligatorio}
                              value={isPortiereRossoObbligatorio ? 'ROSSA' : (itemInModifica.colorePersonalizzato || 'BIANCA')}
                              onChange={e => setItemInModifica({ ...itemInModifica, colorePersonalizzato: e.target.value })}
                              className={`w-full h-11 border rounded-xl px-2.5 text-xs sm:text-sm font-black cursor-pointer focus:outline-none ${
                                isPortiereRossoObbligatorio
                                  ? 'bg-amber-50 text-red-700 border-amber-300 font-extrabold pr-7'
                                  : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-[#002b80]'
                              }`}
                            >
                              {coloriOpzioni.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            {isPortiereRossoObbligatorio && (
                              <FontAwesomeIcon 
                                icon={faLock} 
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-600 text-xs pointer-events-none" 
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
        );
      })()}
    </>
  );
}

export default function ModalCreaOrdineAdmin({
  isOpen,
  onClose,
  account,
  prodotti = [],
  settoreUtente = 'pallanuoto',
  onZoomFoto,
  onConfermaOrdine
}) {
  if (!isOpen || !account) return null;

  return (
    <ContenutoCreaOrdineAdmin
      key={`${account.id}_${settoreUtente}`}
      account={account}
      prodotti={prodotti}
      settoreUtente={settoreUtente}
      onClose={onClose}
      onZoomFoto={onZoomFoto}
      onConfermaOrdine={onConfermaOrdine}
    />
  );
}