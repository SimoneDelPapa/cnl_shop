import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCartShopping, 
  faXmark, 
  faTrashCan, 
  faPenToSquare, 
  faArrowRight, 
  faShirt,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

const TAGLIE = ["Taglia Unica", "6A", "8A", "10A", "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const NUMERI_CALOTTA = Array.from({ length: 15 }, (_, i) => i + 1);

export default function ModalCarrello({
  isOpen,
  onClose,
  carrello = [],
  totaleCarrello = 0,
  onRimuoviDalCarrello,
  onAggiornaCarrelloItem,
  onCheckout,
  onChiediConferma,
  listaAtleti = [],
  prodotti = [],
  isCheckout = false,
  onZoomFoto
}) {
  const [itemInModifica, setItemInModifica] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRimuovi = (item) => {
    if (onChiediConferma) {
      onChiediConferma(
        "Rimuovi dal Carrello",
        `Rimuovere "${item.nomeProdotto}" per ${item.atleta} dal carrello?`,
        () => onRimuoviDalCarrello(item.idUnivoco),
        "Rimuovi"
      );
    } else {
      onRimuoviDalCarrello(item.idUnivoco);
    }
  };

  const apriModifica = (item) => {
    const schedaCatalogo = prodotti.find(p => p.id === item.prodottoId || p.nome === item.nomeProdotto) || {};
    setItemInModifica({
      ...item,
      schedaCatalogo,
      nomePersonalizzato: item.nomePersonalizzato || '',
      numeroPersonalizzato: item.numeroPersonalizzato || '',
      colorePersonalizzato: item.colorePersonalizzato || 'BIANCA'
    });
  };

  const getCategoriaAtleta = (nomeAtleta) => {
    const trovato = listaAtleti.find(a => {
      const nomeCompleto = typeof a === 'object' ? `${a.nome} ${a.cognome}`.trim() : a;
      return nomeCompleto === nomeAtleta;
    });
    return typeof trovato === 'object' ? (trovato.categoria || '') : '';
  };

  const handleSalvaModifica = (e) => {
    e.preventDefault();
    if (!itemInModifica) return;

    const cat = getCategoriaAtleta(itemInModifica.atleta);
    const rawNum = itemInModifica.numeroPersonalizzato;
    const num = parseInt(rawNum, 10);
    const haNum = !isNaN(num) && rawNum !== '';
    const isU14oU18 = cat === 'U14' || cat === 'U18';

    const isPortiereRossoObbligatorio = haNum && (num === 1 || (num === 13 && !isU14oU18));
    const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (num === 13 && isU14oU18);

    let coloreFinale = itemInModifica.colorePersonalizzato || 'BIANCA';
    if (isPortiereRossoObbligatorio) coloreFinale = 'ROSSA';
    else if (!isRossoConsentito && coloreFinale === 'ROSSA') coloreFinale = 'BIANCA';

    const itemAggiornato = {
      ...itemInModifica,
      categoria: cat || itemInModifica.categoria,
      nomePersonalizzato: itemInModifica.nomePersonalizzato?.trim() 
        ? itemInModifica.nomePersonalizzato.trim().toUpperCase().slice(0, 15) 
        : null,
      numeroPersonalizzato: itemInModifica.numeroPersonalizzato !== '' 
        ? itemInModifica.numeroPersonalizzato 
        : null,
      colorePersonalizzato: itemInModifica.schedaCatalogo?.personalizzabile_colore ? coloreFinale : null
    };

    delete itemAggiornato.schedaCatalogo;

    if (onAggiornaCarrelloItem) {
      onAggiornaCarrelloItem(itemAggiornato);
    }
    setItemInModifica(null);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-4xl h-[94dvh] sm:h-[88vh] bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* TESTATA MODALE */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
                <FontAwesomeIcon icon={faCartShopping} />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#002b80] block">
                  Il Tuo Ordine
                </span>
                <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                  Carrello Forniture
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                {carrello.length} {carrello.length === 1 ? 'capo' : 'capi'}
              </span>
              <button 
                type="button"
                onClick={onClose}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          {/* CORPO SCROLLABILE */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
            {carrello.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-200 text-slate-300 flex items-center justify-center text-2xl">
                  <FontAwesomeIcon icon={faShirt} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800">Il tuo carrello è vuoto</h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 max-w-xs">
                  Seleziona i capi dal catalogo e abbinali ai tuoi profili per procedere.
                </p>
              </div>
            ) : (
              carrello.map((item, idx) => (
                <div 
                  key={item.idUnivoco || idx}
                  className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {item.immagine_url ? (
                      <div 
                        onClick={() => onZoomFoto && onZoomFoto(item.immagine_url, item.nomeProdotto)}
                        className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 cursor-zoom-in shadow-2xs"
                      >
                        <img src={item.immagine_url} alt="" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center shrink-0 text-xl shadow-2xs">
                        <FontAwesomeIcon icon={faShirt} />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                          {item.nomeProdotto}
                        </h4>
                        <span className="text-[10px] sm:text-xs font-black uppercase text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                          Taglia: {item.taglia}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-500">
                        Assegnato a: <strong className="text-slate-900">{item.atleta}</strong>
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
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 border-slate-200/70 pt-2.5 sm:pt-0 shrink-0">
                    <span className="text-base sm:text-lg font-black text-[#002b80] tabular-nums mr-1">
                      €{Number(item.prezzo || 0).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => apriModifica(item)}
                      className="h-9 px-3 text-xs font-bold text-[#002b80] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                      <span>Modifica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRimuovi(item)}
                      className="h-9 px-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                      <span>Rimuovi</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PIÈ DI PAGINA CHECKOUT */}
          {carrello.length > 0 && (
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Totale Ordine ({carrello.length} {carrello.length === 1 ? 'capo' : 'capi'})
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#002b80] tabular-nums">
                  €{totaleCarrello.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={isCheckout}
                onClick={onCheckout}
                className="w-full h-12 sm:h-14 bg-[#002b80] hover:bg-[#002060] disabled:bg-slate-300 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
              >
                <FontAwesomeIcon icon={faPaypal} className="text-base sm:text-lg" />
                <span>{isCheckout ? "Elaborazione in corso..." : "Paga con PayPal"}</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POPUP SUB-MODALE PER MODIFICARE IL CAPO DEL CARRELLO (SALVA FULL-WIDTH SENZA ANNULLA E SENZA CHECK) */}
      {itemInModifica && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setItemInModifica(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* TESTATA CON X */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#002b80] block">
                  Carrello
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Modifica {itemInModifica.nomeProdotto}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setItemInModifica(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* FORM SCORREVOLE */}
            <form onSubmit={handleSalvaModifica} className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              {/* Assegna a Profilo */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Assegna a Profilo
                </label>
                <select
                  value={itemInModifica.atleta || ''}
                  onChange={e => {
                    const nuovoAtl = e.target.value;
                    const cat = getCategoriaAtleta(nuovoAtl);
                    setItemInModifica(prev => ({ ...prev, atleta: nuovoAtl, categoria: cat }));
                  }}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                >
                  {listaAtleti.map((atl, i) => {
                    const nomeCompleto = typeof atl === 'object' ? `${atl.nome} ${atl.cognome}`.trim() : atl;
                    const cat = typeof atl === 'object' ? atl.categoria : '';
                    return (
                      <option key={i} value={nomeCompleto}>
                        {nomeCompleto} {cat ? `(${cat})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Taglia Capo */}
              {!itemInModifica.schedaCatalogo?.taglia_unica && itemInModifica.taglia !== "Taglia Unica" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Taglia
                  </label>
                  <select
                    value={itemInModifica.taglia || 'M'}
                    onChange={e => setItemInModifica({ ...itemInModifica, taglia: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                  >
                    {TAGLIE.filter(t => t !== "Taglia Unica").map(t => (
                      <option key={t} value={t}>Taglia: {t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Personalizzazioni */}
              {(itemInModifica.schedaCatalogo?.personalizzabile_nome || 
                itemInModifica.schedaCatalogo?.personalizzabile_numero || 
                itemInModifica.schedaCatalogo?.personalizzabile_colore) && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Personalizzazioni Articolo
                  </span>

                  {itemInModifica.schedaCatalogo?.personalizzabile_nome && (
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

                  <div className="grid grid-cols-2 gap-2">
                    {itemInModifica.schedaCatalogo?.personalizzabile_numero && (
                      <select
                        value={itemInModifica.numeroPersonalizzato || ''}
                        onChange={e => {
                          const n = e.target.value;
                          const cat = getCategoriaAtleta(itemInModifica.atleta);
                          const num = parseInt(n, 10);
                          const isU14oU18 = cat === 'U14' || cat === 'U18';
                          let col = itemInModifica.colorePersonalizzato;

                          if (num === 1 || (num === 13 && !isU14oU18)) {
                            col = 'ROSSA';
                          } else if (col === 'ROSSA' && num !== 13 && !isNaN(num)) {
                            col = 'BIANCA';
                          }

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
                          <option key={n} value={n}>N° {n}</option>
                        ))}
                      </select>
                    )}

                    {itemInModifica.schedaCatalogo?.personalizzabile_colore && (() => {
                      const cat = getCategoriaAtleta(itemInModifica.atleta);
                      const rawNum = itemInModifica.numeroPersonalizzato;
                      const num = parseInt(rawNum, 10);
                      const haNum = !isNaN(num) && rawNum !== '';
                      const isU14oU18 = cat === 'U14' || cat === 'U18';

                      const isPortiereRossoObbligatorio = haNum && (num === 1 || (num === 13 && !isU14oU18));
                      const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (num === 13 && isU14oU18);

                      const coloriOpzioni = isRossoConsentito 
                        ? ["BIANCA", "NERA", "ROSSA"] 
                        : ["BIANCA", "NERA"];

                      return (
                        <div className="relative">
                          <select
                            value={isPortiereRossoObbligatorio ? 'ROSSA' : (itemInModifica.colorePersonalizzato || 'BIANCA')}
                            disabled={isPortiereRossoObbligatorio}
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
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* PULSANTE SALVA MODIFICHE A LARGHEZZA INTERA SENZA ICONA CHECK E SENZA ANNULLA */}
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
    </>
  );
}