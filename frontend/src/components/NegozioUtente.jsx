import { useState, useMemo, useEffect } from 'react';
import ProdottoCard from './ProdottoCard';
import GestioneAtleti from './GestioneAtleti';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashCan, 
  faXmark, 
  faStore, 
  faReceipt, 
  faBoxOpen, 
  faShirt,
  faClock,
  faCircleCheck,
  faTruckFast,
  faBoxesPacking,
  faPenToSquare,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

export default function NegozioUtente({
  utenteLoggato,
  prodotti,
  ordiniUtente = [],
  categorieAtleti,
  settoreUtente,
  linkPaypal,
  haSollecitoAttivo = false,
  listaAtleti = [],
  onAggiungiAlCarrello,
  onZoomFoto,
  onAggiungiAtleta,
  onModificaAtleta,
  onRimuoviAtleta,
  onApriModificaOrdine,
  onAnnullaOrdine
}) {
  const [mostraModalPaypal, setMostraModalPaypal] = useState(false);
  const [vistaAttiva, setVistaAttiva] = useState('catalogo');
  const [atletiEspansi, setAtletiEspansi] = useState(() => new Set());

  // Tracciamo il settore precedente per rilevare il cambio durante il render (senza cascading render)
  const [prevSettore, setPrevSettore] = useState(settoreUtente);

  if (prevSettore !== settoreUtente) {
    setPrevSettore(settoreUtente);
    setVistaAttiva('catalogo');
    setAtletiEspansi(new Set());
  }

  // Nell'useEffect rimane solo la sincronizzazione con l'API esterna del browser (window DOM)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [settoreUtente]);

  const toggleAtletaEspanso = (nomeAtleta) => {
    setAtletiEspansi(prev => {
      const nuovo = new Set(prev);
      if (nuovo.has(nomeAtleta)) nuovo.delete(nomeAtleta);
      else nuovo.add(nomeAtleta);
      return nuovo;
    });
  };

  const procediAPaypal = () => {
    setMostraModalPaypal(false);
    
    // VERIFICA SE C'È UN IMPORTO DA SALDARE MAGGIORE DI ZERO E CONCATENA L'IMPORTO AL LINK
    const urlDinamico = totaleDaSaldare > 0 
      ? `${linkPaypal}/${totaleDaSaldare.toFixed(2)}` 
      : linkPaypal;

    const a = document.createElement('a');
    a.href = urlDinamico;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const prodottiVisibili = prodotti.filter(p => p.attivo !== false);

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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return "Recente";
    }
  };

  const ordiniPerAtleta = useMemo(() => {
    const map = new Map();

    ordiniUtente.forEach(ord => {
      const listaCapi = ord.articoli && ord.articoli.length > 0 
        ? ord.articoli.map(a => ({ 
            ...a, 
            idOrdinePadre: ord.id, 
            statoOrdine: ord.stato_pagamento, 
            pagatoOrdine: ord.pagato, 
            dataCreazione: ord.creato_il 
          }))
        : [{
            idUnivoco: ord.id,
            idOrdinePadre: ord.id,
            nomeProdotto: ord.nomeProdotto,
            taglia: ord.taglia,
            prezzo: ord.prezzo || ord.totale,
            atleta: ord.atleta || "Profilo Generale",
            categoria: ord.categoria || "Extra",
            nomePersonalizzato: ord.nomePersonalizzato,
            numeroPersonalizzato: ord.numeroPersonalizzato,
            colorePersonalizzato: ord.colorePersonalizzato,
            immagine_url: ord.immagine_url,
            completato: ord.stato_pagamento === "Completato",
            statoOrdine: ord.stato_pagamento,
            pagatoOrdine: ord.pagato,
            dataCreazione: ord.creato_il
          }];

      listaCapi.forEach(capo => {
        const nomeAtl = (capo.atleta || "Profilo Generale").trim();
        if (!map.has(nomeAtl)) {
          map.set(nomeAtl, []);
        }
        map.get(nomeAtl).push(capo);
      });
    });

    return Array.from(map.entries()).map(([atleta, articoli]) => ({
      atleta,
      articoli
    }));
  }, [ordiniUtente]);

  // Calcolo diretto senza useMemo: istantaneo, zero overhead e pienamente conforme al React Compiler
  const totaleCapiRichiesti = ordiniPerAtleta.reduce((acc, g) => acc + g.articoli.length, 0);

  const totaleDaSaldare = ordiniPerAtleta.reduce((acc, g) => {
    return acc + g.articoli.reduce((subAcc, a) => {
      if (!a.pagatoOrdine && a.statoOrdine !== "Annullato") {
        return subAcc + Number(a.prezzo || 0);
      }
      return subAcc;
    }, 0);
  }, 0);

  return (
    <div className="w-full max-w-full space-y-4 box-border">
      
      {/* MODAL SALDO PAYPAL CON TASTO X E SOLO PULSANTE PAGA A LARGHEZZA INTERA */}
      {mostraModalPaypal && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setMostraModalPaypal(false)}
        >
          <div 
            className="relative w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* INTESTAZIONE CON X */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faPaypal} className="text-[#002b80] text-xl" />
                <h3 className="text-base font-black text-slate-900">Saldo Ordini</h3>
              </div>
              <button 
                type="button"
                onClick={() => setMostraModalPaypal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm cursor-pointer transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* CONTENUTO SCORREVOLE */}
            <div className="space-y-3 text-sm text-slate-600 font-semibold leading-relaxed flex-1 overflow-y-auto pr-1">
              <p>Stai accedendo al canale PayPal ufficiale per <strong>{settoreUtente.toUpperCase()}</strong>.</p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-sm">
                <span className="font-bold text-amber-800">Da saldare:</span>
                <span className="font-black text-amber-950 text-base tabular-nums">€{totaleDaSaldare.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400">Specifica il profilo nella causale del versamento.</p>
            </div>

            {/* PULSANTE PAGA SU TUTTA LA RIGA */}
            <div className="mt-4 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={procediAPaypal}
                className="w-full h-12 rounded-xl text-sm font-black bg-[#002b80] hover:bg-[#002060] text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                <FontAwesomeIcon icon={faPaypal} className="text-base" />
                <span>Paga</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GESTIONE PROFILI ATLETI */}
      {!utenteLoggato.is_admin && (
        <GestioneAtleti 
          atleti={listaAtleti}
          categorie={categorieAtleti}
          onAggiungiAtleta={onAggiungiAtleta}
          onModificaAtleta={onModificaAtleta}
          onRimuoviAtleta={onRimuoviAtleta}
        />
      )}

      {/* BARRA SWITCH CATALOGO / FORNITURE CON TASTO SALDO SEMPRE VISIBILE */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 box-border">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setVistaAttiva('catalogo')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
              vistaAttiva === 'catalogo'
                ? 'bg-white text-[#002b80] font-black shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faStore} className="text-xs sm:text-sm" />
            <span>Catalogo</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-black ${
              vistaAttiva === 'catalogo' ? 'bg-blue-50 text-[#002b80]' : 'bg-slate-200 text-slate-600'
            }`}>
              {prodottiVisibili.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaAttiva('ordini')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
              vistaAttiva === 'ordini'
                ? 'bg-white text-[#002b80] font-black shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faReceipt} className="text-xs sm:text-sm" />
            <span>Ordini</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-black ${
              vistaAttiva === 'ordini' ? 'bg-blue-50 text-[#002b80]' : 'bg-slate-200 text-slate-600'
            }`}>
              {totaleCapiRichiesti}
            </span>
          </button>
        </div>

        {/* TASTO SALDO RICONOSCIBILE E PROMINENTE */}
        {!haSollecitoAttivo && (
          <button
            type="button"
            onClick={() => setMostraModalPaypal(true)}
            className="h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#003087] to-[#0070ba] hover:from-[#002060] hover:to-[#005ea6] text-white flex items-center justify-center gap-2.5 cursor-pointer shrink-0 whitespace-nowrap shadow-sm border border-blue-400/30 active:scale-[0.98]"
          >
            <FontAwesomeIcon icon={faPaypal} className="text-sm sm:text-base text-sky-200" />
            <span>Da Saldare: €{totaleDaSaldare.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* VISTA 1: CATALOGO PRODOTTI */}
      {vistaAttiva === 'catalogo' && (
        <section className="w-full animate-in fade-in duration-150">
          {prodottiVisibili.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/90 rounded-3xl shadow-2xs">
              <p className="text-sm font-bold text-slate-400">Nessun articolo a catalogo per {settoreUtente}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full box-border">
              {prodottiVisibili.map(prodotto => (
                <ProdottoCard 
                  key={prodotto.id} 
                  prodotto={prodotto} 
                  onAggiungi={onAggiungiAlCarrello} 
                  isUserAdmin={utenteLoggato.is_admin}
                  listaAtleti={listaAtleti}
                  settoreUtente={settoreUtente}
                  onZoomFoto={onZoomFoto}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* VISTA 2: FORNITURE RICHIESTE */}
      {vistaAttiva === 'ordini' && (
        <section className="w-full space-y-3.5 animate-in fade-in duration-150">
          {ordiniPerAtleta.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-3">
              <FontAwesomeIcon icon={faBoxOpen} className="text-slate-300 text-3xl" />
              <p className="text-sm font-bold text-slate-500">Nessun capo richiesto per {settoreUtente}.</p>
            </div>
          ) : (
            ordiniPerAtleta.map(({ atleta, articoli }) => {
              const isAperto = atletiEspansi.has(atleta);
              const capiSaldati = articoli.filter(a => a.pagatoOrdine).length;
              const tuttiSaldati = capiSaldati === articoli.length;

              return (
                <div 
                  key={`atleta-block-${atleta}`} 
                  className={`bg-white border rounded-3xl overflow-hidden transition-all ${
                    isAperto 
                      ? 'border-slate-300 shadow-md ring-1 ring-slate-200' 
                      : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div 
                    onClick={() => toggleAtletaEspanso(atleta)}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                      isAperto ? 'bg-slate-50/70 border-b border-slate-200/80' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isAperto ? 'bg-[#002b80] text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <FontAwesomeIcon icon={isAperto ? faChevronUp : faChevronDown} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                            {atleta}
                          </h3>
                          <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                            {articoli.length} {articoli.length === 1 ? 'capo' : 'capi'}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                          {isAperto ? "Clicca per comprimere" : "Clicca per vedere i capi"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                        tuttiSaldati 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {tuttiSaldati ? "Saldato" : `${capiSaldati}/${articoli.length} pagati`}
                      </span>
                    </div>
                  </div>

                  {isAperto && (
                    <div className="p-4 sm:p-6 space-y-3 bg-white animate-in slide-in-from-top-1 duration-150">
                      {articoli.map((art, idx) => {
                        const isSaldato = Boolean(art.pagatoOrdine);
                        const stato = art.statoOrdine || "In attesa";
                        const isConsegnato = Boolean(art.completato || stato === 'Completato');
                        const isInAttesa = stato === "In attesa";

                        return (
                          <div 
                            key={`ticket-${art.idUnivoco || idx}`}
                            className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                          >
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                              {art.immagine_url ? (
                                <div 
                                  onClick={() => onZoomFoto && onZoomFoto(art.immagine_url, art.nomeProdotto)}
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 cursor-zoom-in shadow-2xs"
                                  title="Ingrandisci"
                                >
                                  <img src={art.immagine_url} alt="" className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center shrink-0 text-lg shadow-2xs">
                                  <FontAwesomeIcon icon={faShirt} />
                                </div>
                              )}

                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                                    {art.nomeProdotto}
                                  </h4>
                                  <span className="text-xs font-black uppercase text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                    Taglia: {art.taglia}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                  <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                                  <span>{formattaData(art.dataCreazione)}</span>
                                </div>

                                {(art.nomePersonalizzato || art.numeroPersonalizzato || art.colorePersonalizzato) && (
                                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                    {art.nomePersonalizzato && (
                                      <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                        "{art.nomePersonalizzato}"
                                      </span>
                                    )}
                                    {art.numeroPersonalizzato && (
                                      <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                        N° {art.numeroPersonalizzato}
                                      </span>
                                    )}
                                    {art.colorePersonalizzato && (
                                      <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                        {art.colorePersonalizzato}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-200/70 shrink-0">
                              <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                                isConsegnato
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : stato === 'Pronto per il ritiro'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : stato === 'In lavorazione'
                                  ? 'bg-blue-50 text-[#002b80] border-blue-300'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={isConsegnato ? faCircleCheck : stato === 'Pronto per il ritiro' ? faBoxesPacking : faTruckFast} 
                                  className="text-xs" 
                                />
                                <span>{isConsegnato ? 'Consegnato' : stato}</span>
                              </span>

                              <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                                isSaldato ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                              }`}>
                                {isSaldato ? "Saldato" : "Non saldato"}
                              </span>

                              <span className="text-base font-black text-slate-900 tabular-nums px-1">
                                €{Number(art.prezzo || 0).toFixed(2)}
                              </span>

                              {isInAttesa && onApriModificaOrdine && (
                                <button
                                  type="button"
                                  onClick={() => onApriModificaOrdine({ id: art.idOrdinePadre, ...art, articoli: [art] })}
                                  className="h-9 w-9 sm:w-auto sm:px-3 text-xs font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                  title="Modifica capo"
                                >
                                  <FontAwesomeIcon icon={faPenToSquare} />
                                  <span className="hidden sm:inline">Modifica</span>
                                </button>
                              )}

                              {/* ANNULLA FORNITURA IN ROSSO CON CONFERMA */}
                              {!isSaldato && isInAttesa && (
                                <button
                                  type="button"
                                  onClick={() => onAnnullaOrdine({ id: art.idOrdinePadre, totale: art.prezzo, articoli: [art] })}
                                  className="h-9 w-9 sm:w-auto sm:px-3 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                                  title="Annulla fornitura"
                                >
                                  <FontAwesomeIcon icon={faTrashCan} />
                                  <span className="hidden sm:inline">Annulla</span>
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}

    </div>
  );
}