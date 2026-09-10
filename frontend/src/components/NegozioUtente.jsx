import { useState } from 'react';
import ProdottoCard from './ProdottoCard';
import GestioneAtleti from './GestioneAtleti';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPenToSquare, 
  faBan, 
  faTrashCan, 
  faArrowRight,
  faXmark,
  faCircleInfo,
  faClock,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

export default function NegozioUtente({
  utenteLoggato,
  prodotti,
  carrello,
  totaleCarrello,
  ordiniUtente,
  isCheckout,
  categorieAtleti,
  settoreUtente,
  linkPaypal,
  onAggiungiAlCarrello,
  onRimuoviDalCarrello,
  onCheckout,
  onZoomFoto,
  onAggiungiAtleta,
  onRimuoviAtleta,
  onApriModificaOrdine,
  onAnnullaOrdine,
  onCancellaArticolo
}) {
  const [mostraModalPaypal, setMostraModalPaypal] = useState(false);
  const [ordiniEspansi, setOrdiniEspansi] = useState(() => new Set());

  const toggleEspandiOrdine = (id) => {
    setOrdiniEspansi(prev => {
      const nuovoSet = new Set(prev);
      if (nuovoSet.has(id)) nuovoSet.delete(id);
      else nuovoSet.add(id);
      return nuovoSet;
    });
  };

  const procediAPaypal = () => {
    setMostraModalPaypal(false);
    window.open(linkPaypal, '_blank', 'noopener,noreferrer');
  };

  const prodottiVisibili = prodotti.filter(p => p.attivo !== false);

  const formattaData = (timestamp) => {
    if (!timestamp) return "Data non disp.";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-8">
      
      {/* MODAL INFORMATIVO SALDO PAYPAL */}
      {mostraModalPaypal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setMostraModalPaypal(false)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-lg shadow-2xs">
                  <FontAwesomeIcon icon={faPaypal} />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block">Saldo Ordini</span>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Reindirizzamento su PayPal</h3>
                </div>
              </div>
              <button 
                onClick={() => setMostraModalPaypal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                <FontAwesomeIcon icon={faCircleInfo} className="text-[#002b80] mt-0.5 text-sm shrink-0" />
                <p>
                  Stai per accedere al portale PayPal ufficiale del <strong>Circolo Nuoto Lucca ({settoreUtente})</strong> per saldare forniture in sospeso.
                </p>
              </div>
              <p>
                Inserisci l'importo esatto del tuo ordine e indica nella causale il <strong>codice ordine</strong> o il <strong>nome dell'atleta</strong>.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setMostraModalPaypal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={procediAPaypal}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#003087] hover:bg-[#002060] text-white transition-all shadow-md shadow-blue-950/15 flex items-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPaypal} />
                <span>Vai a PayPal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gestione Famiglia Atleti */}
      {!utenteLoggato.is_admin && (
        <GestioneAtleti 
          atleti={utenteLoggato.atleti || []}
          categorie={categorieAtleti}
          onAggiungiAtleta={onAggiungiAtleta}
          onRimuoviAtleta={onRimuoviAtleta}
        />
      )}

      {/* Catalogo Prodotti */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Catalogo Ufficiale</h2>
            <span className="text-xs font-bold text-slate-400">Materiale sportivo sociale ordinabile</span>
          </div>
          <span className="text-xs font-black text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
            {prodottiVisibili.length} capi disponibili
          </span>
        </div>

        {prodottiVisibili.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl shadow-2xs">
            <p className="text-xs text-slate-400 font-semibold">Nessun articolo disponibile al momento per questo settore.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prodottiVisibili.map(prodotto => (
              <ProdottoCard 
                key={prodotto.id} 
                prodotto={prodotto} 
                onAggiungi={onAggiungiAlCarrello} 
                isUserAdmin={utenteLoggato.is_admin}
                listaAtleti={utenteLoggato.atleti || []}
                onZoomFoto={onZoomFoto}
              />
            ))}
          </div>
        )}
      </section>

      {/* Carrello Attivo con Numeri Grandi */}
      {carrello.length > 0 && (
        <section className="bg-white border-2 border-blue-200 rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-950/5 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block">Riepilogo Ordine</span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">Articoli Selezionati ({carrello.length})</h3>
            </div>
            <div className="flex items-baseline gap-1.5 self-end sm:self-auto bg-blue-50/70 border border-blue-100 px-4 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-[#002b80] uppercase">Totale:</span>
              <span className="text-2xl sm:text-3xl font-black text-[#002b80] tabular-nums">
                €{totaleCarrello.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 mb-6">
            {carrello.map((item) => (
              <div key={item.idUnivoco} className="py-3.5 flex justify-between items-center text-xs gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{item.nomeProdotto}</h4>
                  <p className="text-slate-500 font-medium mt-1">
                    Atleta: <strong className="text-slate-800 font-bold">{item.atleta}</strong> • Taglia: <strong className="text-slate-800">{item.taglia}</strong>
                  </p>
                  {(item.colorePersonalizzato || item.nomePersonalizzato || item.numeroPersonalizzato) && (
                    <p className="text-[#002b80] font-black text-[11px] mt-1 bg-blue-50/70 w-fit px-2 py-0.5 rounded-md border border-blue-100">
                      {item.colorePersonalizzato && `${item.colorePersonalizzato} `}
                      {item.nomePersonalizzato && `"${item.nomePersonalizzato}" `}
                      {item.numeroPersonalizzato && `N°${item.numeroPersonalizzato}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-black text-slate-900 text-base sm:text-lg tabular-nums">
                    €{Number(item.prezzo || 0).toFixed(2)}
                  </span>
                  <button 
                    onClick={() => onRimuoviDalCarrello(item.idUnivoco)} 
                    className="w-9 h-9 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Rimuovi dal carrello"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
              Confermando verrai guidato al saldo rapido su PayPal con importo preimpostato.
            </p>
            <button 
              onClick={onCheckout} 
              disabled={isCheckout} 
              className="w-full sm:w-auto px-7 py-3 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-950/15 disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>{isCheckout ? "Salvataggio..." : "Conferma e Paga con PayPal"}</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[11px]" />
            </button>
          </div>
        </section>
      )}

      {/* Storico Ordini Inviati: Struttura Accordion Salvaspazio */}
      {!utenteLoggato.is_admin && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">I Tuoi Ordini Inviati</h2>
              <span className="text-xs font-bold text-slate-400">Tracciamento e gestione delle forniture richieste</span>
            </div>

            <button
              type="button"
              onClick={() => setMostraModalPaypal(true)}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#003087] hover:bg-[#002060] text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              title="Apri PayPal per saldare ordini rimasti in sospeso"
            >
              <FontAwesomeIcon icon={faPaypal} />
              <span>Paga con PayPal</span>
            </button>
          </div>

          {ordiniUtente.length === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200/80 rounded-3xl shadow-2xs">
              <p className="text-xs text-slate-400 italic font-semibold">Non hai ancora effettuato ordini.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ordiniUtente.map((ord) => {
                const isEspanso = ordiniEspansi.has(ord.id);
                return (
                  <div 
                    key={`user-ord-${ord.id}`} 
                    className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                      isEspanso 
                        ? 'border-slate-300 shadow-md ring-1 ring-slate-200' 
                        : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Header Compresso Accordion */}
                    <div 
                      onClick={() => toggleEspandiOrdine(ord.id)}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isEspanso ? 'bg-slate-50/80 border-b border-slate-200/70' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                          isEspanso ? 'bg-[#002b80] text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <FontAwesomeIcon icon={isEspanso ? faChevronUp : faChevronDown} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              #{ord.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {(ord.articoli || []).length} {ord.articoli?.length === 1 ? 'capo' : 'capi'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                            <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[10px]" />
                            <span>{formattaData(ord.creato_il)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Badge Stato */}
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                          ord.stato_pagamento === 'Completato' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : ord.stato_pagamento === 'In lavorazione'
                            ? 'bg-blue-50 text-[#002b80] border-blue-200'
                            : ord.stato_pagamento === 'Pronto per il ritiro'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {ord.stato_pagamento}
                        </span>

                        {/* Badge Saldo */}
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                          ord.pagato ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                        }`}>
                          {ord.pagato ? "Saldato" : "Non saldato"}
                        </span>

                        {/* Importo Totale in Grande */}
                        <div className="text-right pl-2">
                          <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                            €{Number(ord.totale || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dettaglio Espanso Ordine */}
                    {isEspanso && (
                      <div className="p-4 sm:p-5 space-y-3 bg-white animate-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            Capi inclusi nell'ordine
                          </span>
                          <div className="flex items-center gap-2">
                            {ord.stato_pagamento === "In attesa" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onApriModificaOrdine(ord); }}
                                className="px-2.5 py-1 text-xs font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>Modifica</span>
                              </button>
                            )}

                            {!ord.pagato && ord.stato_pagamento === "In attesa" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onAnnullaOrdine(ord); }}
                                className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faBan} />
                                <span>Annulla Ordine</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {(ord.articoli || []).map((art, idx) => (
                            <div key={`user-art-${idx}`} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <div>
                                <span className="font-bold text-slate-900">{art.nomeProdotto}</span> ({art.taglia}) • Atleta: <strong className="text-slate-800">{art.atleta}</strong>
                                {(art.nomePersonalizzato || art.numeroPersonalizzato || art.colorePersonalizzato) && (
                                  <p className="text-[11px] text-[#002b80] font-black mt-0.5">
                                    {art.colorePersonalizzato && `${art.colorePersonalizzato} `}
                                    {art.nomePersonalizzato && `"${art.nomePersonalizzato}" `}
                                    {art.numeroPersonalizzato && `N°${art.numeroPersonalizzato}`}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-900 text-sm tabular-nums">
                                  €{Number(art.prezzo || 0).toFixed(2)}
                                </span>
                                {!ord.pagato && ord.stato_pagamento === "In attesa" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onCancellaArticolo(ord, art.idUnivoco); }}
                                    className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                                    title="Cancella capo dall'ordine"
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

    </div>
  );
}