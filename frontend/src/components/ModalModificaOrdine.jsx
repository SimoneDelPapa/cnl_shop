import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faPenToSquare, faReceipt, faLock } from '@fortawesome/free-solid-svg-icons';

export default function ModalModificaOrdine({
  ordine,
  listaAtleti = [],
  prodotti = [],
  onClose,
  onSalva
}) {
  const TAGLIE = ["Taglia Unica", "6A", "8A", "10A", "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
  const COLORI_DISPONIBILI = ["NERA", "BIANCA", "ROSSA"];
  const NUMERI_DISPONIBILI = Array.from({ length: 15 }, (_, i) => i + 1);

  const [articoliModificati, setArticoliModificati] = useState(() => {
    return (ordine.articoli || []).map(art => ({
      ...art,
      nomePersonalizzato: art.nomePersonalizzato || '',
      numeroPersonalizzato: art.numeroPersonalizzato || '',
      colorePersonalizzato: art.colorePersonalizzato || 'NERA'
    }));
  });

  const getCategoriaAtleta = (nomeAtleta) => {
    if (!nomeAtleta) return '';
    const trovato = listaAtleti.find(a => {
      const nomeCompleto = typeof a === 'object' ? `${a.nome} ${a.cognome}` : a;
      return nomeCompleto === nomeAtleta;
    });
    return typeof trovato === 'object' ? (trovato.categoria || '') : '';
  };

  const aggiornaCampoArticolo = (idUnivoco, campo, valore) => {
    setArticoliModificati(prev =>
      prev.map(art => {
        if (art.idUnivoco !== idUnivoco) return art;

        const updated = { ...art, [campo]: valore };

        const cat = getCategoriaAtleta(campo === 'atleta' ? valore : updated.atleta);
        const num = parseInt(campo === 'numeroPersonalizzato' ? valore : updated.numeroPersonalizzato, 10);
        
        if (num === 1 || (num === 13 && cat !== 'U14' && cat !== 'U18')) {
          updated.colorePersonalizzato = 'ROSSA';
        }

        return updated;
      })
    );
  };

  const handleSalva = (e) => {
    e.preventDefault();
    onSalva(ordine.id, articoliModificati);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-base shadow-2xs">
              <FontAwesomeIcon icon={faPenToSquare} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block">
                Modifica Ordine #{ordine.id.slice(-6).toUpperCase()}
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Personalizzazioni e Taglie Capi
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form onSubmit={handleSalva} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {articoliModificati.map((art, idx) => {
            const schedaCatalogo = prodotti.find(p => 
              (art.prodottoId && p.id === art.prodottoId) ||
              (p.nome && art.nomeProdotto && p.nome.trim().toLowerCase() === art.nomeProdotto.trim().toLowerCase())
            ) || {};

            const isTagliaUnica = Boolean(schedaCatalogo.taglia_unica || art.taglia === 'Taglia Unica');
            const puoNome = Boolean(schedaCatalogo.personalizzabile_nome || art.nomePersonalizzato);
            const puoNumero = Boolean(schedaCatalogo.personalizzabile_numero || art.numeroPersonalizzato);
            const puoColore = Boolean(schedaCatalogo.personalizzabile_colore || art.colorePersonalizzato);

            const cat = getCategoriaAtleta(art.atleta);
            const num = parseInt(art.numeroPersonalizzato, 10);
            const isPortiereRosso = num === 1 || (num === 13 && cat !== 'U14' && cat !== 'U18');

            return (
              <div 
                key={art.idUnivoco || idx}
                className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-3.5 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faReceipt} className="text-[#002b80] text-xs" />
                    <h4 className="font-extrabold text-slate-900 text-sm">{art.nomeProdotto}</h4>
                  </div>
                  <span className="font-black text-[#002b80] text-sm tabular-nums">
                    €{Number(art.prezzo || 0).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                      Profilo Assegnato
                    </label>
                    <select
                      value={art.atleta || ''}
                      onChange={e => aggiornaCampoArticolo(art.idUnivoco, 'atleta', e.target.value)}
                      className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/20 focus:border-[#002b80] cursor-pointer"
                    >
                      {listaAtleti.length > 0 ? (
                        listaAtleti.map((atl, i) => {
                          const nomeAtl = typeof atl === 'object' ? `${atl.nome} ${atl.cognome}` : atl;
                          const c = typeof atl === 'object' ? atl.categoria : '';
                          return <option key={i} value={nomeAtl}>{nomeAtl} {c ? `(${c})` : ''}</option>;
                        })
                      ) : (
                        <option value={art.atleta || "Profilo"}>{art.atleta || "Profilo"}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                      Taglia
                    </label>
                    {!isTagliaUnica ? (
                      <select
                        value={art.taglia || 'M'}
                        onChange={e => aggiornaCampoArticolo(art.idUnivoco, 'taglia', e.target.value)}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/20 focus:border-[#002b80] cursor-pointer"
                      >
                        {TAGLIE.filter(t => t !== "Taglia Unica").map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <div className="h-9 bg-slate-100 border border-slate-200 rounded-xl px-3 flex items-center text-xs font-extrabold text-slate-600">
                        Taglia Unica
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#002b80] block">
                    Personalizzazioni Articolo
                  </span>

                  {(puoNome || puoNumero || puoColore) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {puoNome && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Stampa</label>
                          <input
                            type="text"
                            placeholder="Es. ROSSI"
                            value={art.nomePersonalizzato || ''}
                            onChange={e => aggiornaCampoArticolo(art.idUnivoco, 'nomePersonalizzato', e.target.value.toUpperCase())}
                            className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:border-[#002b80]"
                          />
                        </div>
                      )}

                      {puoNumero && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Numero (1-15)</label>
                          <select
                            value={art.numeroPersonalizzato || ''}
                            onChange={e => aggiornaCampoArticolo(art.idUnivoco, 'numeroPersonalizzato', e.target.value)}
                            className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                          >
                            <option value="">Nessuno</option>
                            {NUMERI_DISPONIBILI.map(n => (
                              <option key={n} value={n}>N° {n}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {puoColore && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center justify-between">
                            <span>Colore</span>
                            {isPortiereRosso && <FontAwesomeIcon icon={faLock} className="text-amber-600 text-[9px]" title="Bloccato per portiere" />}
                          </label>
                          <select
                            value={art.colorePersonalizzato || 'NERA'}
                            disabled={isPortiereRosso}
                            onChange={e => aggiornaCampoArticolo(art.idUnivoco, 'colorePersonalizzato', e.target.value)}
                            className={`w-full h-9 border rounded-xl px-2 text-xs font-black cursor-pointer focus:outline-none ${
                              isPortiereRosso 
                                ? 'bg-amber-50 text-red-700 border-amber-300 font-extrabold' 
                                : 'bg-white text-slate-800 border-slate-200 focus:border-[#002b80]'
                            }`}
                          >
                            {COLORI_DISPONIBILI.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Questo articolo non prevede opzioni di stampa da catalogo.
                    </p>
                  )}

                  {isPortiereRosso && (
                    <p className="text-[10px] text-amber-700 font-bold leading-tight">
                      * Numero portiere: colore impostato automaticamente su ROSSA.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#002b80] hover:bg-[#002060] text-white transition-all shadow-md shadow-blue-950/15 flex items-center gap-2 cursor-pointer"
            >
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
              <span>Salva Modifiche</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}