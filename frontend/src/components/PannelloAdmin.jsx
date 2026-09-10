import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faFileExcel, 
  faPenToSquare, 
  faBan, 
  faTrashCan, 
  faPlus, 
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
  faMagnifyingGlassPlus,
  faReceipt,
  faBoxesStacked
} from '@fortawesome/free-solid-svg-icons';

export default function PannelloAdmin({
  adminTab,
  onSetAdminTab,
  statistiche,
  ricerca,
  onSetRicerca,
  filtroStato,
  onSetFiltroStato,
  ordiniRaggruppati,
  ordiniInAttesaCount,
  invioProduzioneInCorso,
  onInviaProduzione,
  onEsportaCsv,
  onAggiornaOrdine,
  onApriModificaOrdine,
  onAnnullaOrdine,
  onCancellaArticolo,
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
  onZoomFoto
}) {
  const [prodottoInModifica, setProdottoInModifica] = useState(null);
  const [utentiEspansi, setUtentiEspansi] = useState(() => new Set());
  const [mostraAnteprimaCatalogo, setMostraAnteprimaCatalogo] = useState(false);

  const toggleEspandiUtente = (email) => {
    setUtentiEspansi(prev => {
      const nuovoSet = new Set(prev);
      if (nuovoSet.has(email)) nuovoSet.delete(email);
      else nuovoSet.add(email);
      return nuovoSet;
    });
  };

  // Toggle alternato Espandi tutti <-> Comprimi tutti
  const tuttiEspansi = ordiniRaggruppati.length > 0 && utentiEspansi.size === ordiniRaggruppati.length;
  const toggleTuttiOrdini = () => {
    if (tuttiEspansi) {
      setUtentiEspansi(new Set());
    } else {
      setUtentiEspansi(new Set(ordiniRaggruppati.map(g => g.email)));
    }
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
      personalizzabile_numero: Boolean(prodottoInModifica.personalizzabile_numero),
      personalizzabile_colore: Boolean(prodottoInModifica.personalizzabile_colore)
    });
    setProdottoInModifica(null);
  };

  const formattaData = (timestamp) => {
    if (!timestamp) return "Data n.d.";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const morosiCount = useMemo(() => {
    return ordiniRaggruppati.filter(g => g.totaleDovuto > 0).length;
  }, [ordiniRaggruppati]);

  const datiCategorie = useMemo(() => {
    const categorieMap = new Map();
    const CATEGORIE_ORDINE = ["Maschile", "Femminile", "U18", "U16", "U14", "U12", "Extra", "Non Specificata"];

    ordiniRaggruppati.forEach(gruppo => {
      gruppo.ordini.forEach(ord => {
        (ord.articoli || []).forEach(art => {
          const cat = art.categoria || "Extra";
          if (!categorieMap.has(cat)) categorieMap.set(cat, new Map());
          const profiliMap = categorieMap.get(cat);
          
          const nomeProfilo = (art.atleta || "Profilo").trim();
          if (!profiliMap.has(nomeProfilo)) {
            profiliMap.set(nomeProfilo, {
              nomeCompleto: nomeProfilo,
              acquirente: gruppo.acquirente,
              email: gruppo.email,
              articoli: []
            });
          }
          profiliMap.get(nomeProfilo).articoli.push({
            ...art,
            idOrdine: ord.id,
            stato: ord.stato_pagamento,
            pagato: ord.pagato
          });
        });
      });
    });

    return CATEGORIE_ORDINE
      .filter(cat => categorieMap.has(cat))
      .map(cat => {
        const profiliList = Array.from(categorieMap.get(cat).values());
        profiliList.sort((a, b) => {
          const partsA = a.nomeCompleto.split(" ");
          const partsB = b.nomeCompleto.split(" ");
          const cognomeA = partsA.length > 1 ? partsA.slice(1).join(" ") : partsA[0];
          const cognomeB = partsB.length > 1 ? partsB.slice(1).join(" ") : partsB[0];
          const comp = cognomeA.localeCompare(cognomeB, 'it');
          if (comp !== 0) return comp;
          return a.nomeCompleto.localeCompare(b.nomeCompleto, 'it');
        });

        return {
          categoria: cat,
          profili: profiliList,
          totaleCapi: profiliList.reduce((acc, p) => acc + p.articoli.length, 0)
        };
      });
  }, [ordiniRaggruppati]);

  const prodottiVisibiliUtente = useMemo(() => {
    return prodotti.filter(p => p.attivo !== false);
  }, [prodotti]);

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* Switch Tab Mobile (quando lo schermo è sotto md) */}
      <div className="md:hidden w-full overflow-x-auto pb-1 -mx-1 px-1">
        <div className="inline-flex min-w-full items-center gap-1 bg-slate-200/70 p-1 rounded-2xl">
          <button 
            onClick={() => onSetAdminTab('ordini')} 
            className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              adminTab === 'ordini' ? 'bg-white text-[#002b80] shadow-xs' : 'text-slate-600'
            }`}
          >
            <FontAwesomeIcon icon={faReceipt} className="mr-1" />
            Ordini
          </button>
          <button 
            onClick={() => onSetAdminTab('categorie')} 
            className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              adminTab === 'categorie' ? 'bg-white text-[#002b80] shadow-xs' : 'text-slate-600'
            }`}
          >
            <FontAwesomeIcon icon={faLayerGroup} className="mr-1" />
            Categorie
          </button>
          <button 
            onClick={() => onSetAdminTab('catalogo')} 
            className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              adminTab === 'catalogo' ? 'bg-white text-[#002b80] shadow-xs' : 'text-slate-600'
            }`}
          >
            <FontAwesomeIcon icon={faBoxesStacked} className="mr-1" />
            Catalogo
          </button>
        </div>
      </div>

      {/* MODAL ANTEPRIMA CATALOGO CON ZOOM ATTIVO */}
      {mostraAnteprimaCatalogo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3.5 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setMostraAnteprimaCatalogo(false)}
        >
          <div 
            className="relative w-full max-w-5xl bg-slate-50 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#002b80] text-white flex items-center justify-center text-sm shadow-xs">
                  <FontAwesomeIcon icon={faStore} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#002b80] block">
                    Anteprima Negozio
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Catalogo visibile al cliente ({prodottiVisibiliUtente.length} capi attivi)
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setMostraAnteprimaCatalogo(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-500 border border-slate-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {prodottiVisibiliUtente.length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 italic">Nessun articolo attualmente visibile nel negozio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {prodottiVisibiliUtente.map(p => (
                    <div key={`preview-${p.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3">
                      {/* Foto cliccabile per Zoom */}
                      <div 
                        onClick={() => p.immagine_url && onZoomFoto && onZoomFoto(p.immagine_url, p.nome)}
                        className={`relative w-full h-44 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center p-2 group ${
                          p.immagine_url ? 'cursor-zoom-in' : ''
                        }`}
                        title={p.immagine_url ? "Clicca per ingrandire la foto" : ""}
                      >
                        {p.immagine_url ? (
                          <>
                            <img src={p.immagine_url} alt={p.nome} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onZoomFoto && onZoomFoto(p.immagine_url, p.nome);
                              }}
                              className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center text-[11px] shadow-sm transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-300 font-bold text-xs">Nessuna Foto</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-black text-slate-900 leading-snug">{p.nome}</h4>
                          <span className="text-sm font-black text-[#002b80] tabular-nums shrink-0">€{Number(p.prezzo || 0).toFixed(2)}</span>
                        </div>
                        {p.taglia_unica && (
                          <span className="text-[9px] font-black uppercase text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                            Taglia Unica
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICA CAPO */}
      {prodottoInModifica && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setProdottoInModifica(null)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block">Modifica Catalogo</span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Configura Capo</h3>
              </div>
              <button 
                onClick={() => setProdottoInModifica(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={salvaModificheArticolo} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Nome Articolo</label>
                <input 
                  type="text" 
                  value={prodottoInModifica.nome} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, nome: e.target.value})} 
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002b80]/20 focus:border-[#002b80]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Prezzo (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={prodottoInModifica.prezzo} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, prezzo: e.target.value})} 
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-black tabular-nums text-[#002b80] focus:outline-none focus:ring-2 focus:ring-[#002b80]/20 focus:border-[#002b80]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">URL Foto</label>
                <input 
                  type="text" 
                  value={prodottoInModifica.immagine_url || ''} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, immagine_url: e.target.value})} 
                  placeholder="https://..."
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Formato Taglia</label>
                <button
                  type="button"
                  onClick={() => setProdottoInModifica({ ...prodottoInModifica, taglia_unica: !prodottoInModifica.taglia_unica })}
                  className={`w-full h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    prodottoInModifica.taglia_unica 
                      ? 'bg-[#002b80] text-white border-[#002b80]' 
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {prodottoInModifica.taglia_unica && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                  <span>{prodottoInModifica.taglia_unica ? "Taglia Unica" : "Taglie Multiple (6A - 5XL)"}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Opzioni di Stampa Abilitate</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'personalizzabile_nome', label: 'Nome' },
                    { key: 'personalizzabile_numero', label: 'Numero' },
                    { key: 'personalizzabile_colore', label: 'Colore' }
                  ].map(({ key, label }) => {
                    const attivo = Boolean(prodottoInModifica[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProdottoInModifica({...prodottoInModifica, [key]: !attivo})}
                        className={`h-8 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          attivo ? 'bg-[#002b80] text-white border-[#002b80]' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {attivo && <FontAwesomeIcon icon={faCheck} className="text-[9px]" />}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProdottoInModifica(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#002b80] hover:bg-[#002060] text-white cursor-pointer"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: REGISTRO ORDINI */}
      {adminTab === 'ordini' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">In Attesa</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{statistiche.inAttesa}</span>
                <span className="text-[11px] font-bold text-slate-400">ord.</span>
              </div>
              <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block truncate">Da confermare</span>
            </div>

            <div className="bg-white border border-blue-200/80 bg-blue-50/20 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block truncate">In Lavorazione</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#002b80] tabular-nums">{statistiche.inLavorazione}</span>
                <span className="text-[11px] font-bold text-blue-900/60">ord.</span>
              </div>
              <span className="text-[10px] text-blue-700 font-semibold mt-0.5 block truncate">In produzione</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-600 block truncate">Pronti Ritiro</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">{statistiche.pronti}</span>
                <span className="text-[11px] font-bold text-slate-400">ord.</span>
              </div>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block truncate">Bordo vasca</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs col-span-1 md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Saldato</span>
                <FontAwesomeIcon icon={faCoins} className="text-emerald-500 text-xs" />
              </div>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-900 tabular-nums tracking-tight">
                  €{statistiche.incassoVerificato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">PayPal</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs col-span-2 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Capi Pagati</span>
                <FontAwesomeIcon icon={faBoxesPacking} className="text-slate-400 text-xs" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-800 tabular-nums">{statistiche.totaleArticoliVenduti}</span>
                <span className="text-[11px] font-bold text-slate-400">pz</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block truncate">
                Fondo: <strong className="text-emerald-700 font-black">€{statistiche.totaleArticoliVenduti.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
              <div className="relative flex-1">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input 
                  type="text" 
                  value={ricerca} 
                  onChange={e => onSetRicerca(e.target.value)} 
                  placeholder="Cerca per profilo, cliente, ID ordine..." 
                  className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80] transition-all"
                />
                {ricerca && (
                  <button
                    type="button"
                    onClick={() => onSetRicerca('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>

              <select 
                value={filtroStato} 
                onChange={e => onSetFiltroStato(e.target.value)}
                className="h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80] cursor-pointer"
              >
                <option value="Tutti">Tutti gli stati</option>
                <option value="In attesa">In attesa</option>
                <option value="In lavorazione">In lavorazione</option>
                <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                <option value="Completato">Completato</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2">
              <button 
                type="button"
                onClick={onInviaProduzione}
                disabled={invioProduzioneInCorso || ordiniInAttesaCount === 0}
                className="h-10 px-3.5 bg-[#002b80] hover:bg-[#002060] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                <span className="truncate">{invioProduzioneInCorso ? "Inoltro..." : `Lavorazione (${ordiniInAttesaCount})`}</span>
              </button>

              <button 
                type="button"
                onClick={onInviaSollecitoMassivo}
                disabled={morosiCount === 0}
                className="h-10 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faBell} />
                <span className="truncate">Sollecita ({morosiCount})</span>
              </button>

              <button 
                onClick={onEsportaCsv} 
                className="h-10 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faFileExcel} />
                <span>Esporta Excel</span>
              </button>
            </div>
          </div>

          {ordiniRaggruppati.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span><strong>{ordiniRaggruppati.length}</strong> {ordiniRaggruppati.length === 1 ? 'cliente' : 'clienti'}</span>
              <button 
                type="button" 
                onClick={toggleTuttiOrdini} 
                className="font-bold text-[#002b80] hover:underline cursor-pointer"
              >
                {tuttiEspansi ? "Comprimi tutti" : "Espandi tutti"}
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {ordiniRaggruppati.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white border border-slate-200/80 rounded-2xl">
                <p className="text-xs text-slate-400 italic font-medium">Nessun ordine corrispondente ai filtri impostati.</p>
              </div>
            ) : (
              ordiniRaggruppati.map((gruppo) => {
                const isEspanso = utentiEspansi.has(gruppo.email);
                const haDebito = gruppo.totaleDovuto > 0;

                return (
                  <div 
                    key={`gruppo-user-${gruppo.email}`} 
                    className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                      isEspanso ? 'border-slate-300 shadow-md ring-1 ring-slate-200' : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div 
                      onClick={() => toggleEspandiUtente(gruppo.email)}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isEspanso ? 'bg-slate-50/80 border-b border-slate-200/70' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                          isEspanso ? 'bg-[#002b80] text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <FontAwesomeIcon icon={isEspanso ? faChevronUp : faChevronDown} />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{gruppo.acquirente}</h3>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                              {gruppo.ordini.length} {gruppo.ordini.length === 1 ? 'ord.' : 'ordini'}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{gruppo.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {haDebito ? (
                          <div className="bg-amber-50 border border-amber-200 px-2.5 sm:px-3 py-1 rounded-xl text-right">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 block leading-none">Da Saldare</span>
                            <span className="text-sm sm:text-base font-black text-amber-900 tabular-nums leading-snug">
                              €{gruppo.totaleDovuto.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-200 px-2 sm:px-2.5 py-1 rounded-xl text-right">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 block leading-none">Stato</span>
                            <span className="text-xs font-black text-emerald-800">Saldato</span>
                          </div>
                        )}

                        <div className="text-right px-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none">Incassato</span>
                          <span className="text-xs sm:text-sm font-black text-slate-800 tabular-nums leading-snug">
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
                            className="h-8 px-2.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-1 transition-colors shadow-2xs shrink-0 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faBell} className="text-[10px]" />
                            <span className="hidden sm:inline">Sollecita</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isEspanso && (
                      <div className="p-3.5 sm:p-5 space-y-3 bg-white animate-in slide-in-from-top-1 duration-150">
                        {gruppo.ordini.map((ord) => (
                          <div key={`admin-ord-${ord.id}`} className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 text-xs space-y-3">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 border-b border-slate-200/70 pb-2.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                                  #{ord.id.slice(-6).toUpperCase()}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                  <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[10px]" />
                                  <span>{formattaData(ord.creato_il)}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                  <input 
                                    type="checkbox" 
                                    checked={Boolean(ord.pagato)} 
                                    onChange={(e) => onAggiornaOrdine(ord.id, { pagato: e.target.checked })}
                                    className="w-4 h-4 accent-[#002b80] rounded cursor-pointer"
                                  />
                                  <span className={`text-[11px] font-extrabold ${ord.pagato ? "text-emerald-700" : "text-amber-700"}`}>
                                    {ord.pagato ? "Saldato" : "Non saldato"}
                                  </span>
                                </label>
                                
                                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums px-1">
                                  €{Number(ord.totale || 0).toFixed(2)}
                                </span>
                                
                                <select 
                                  value={ord.stato_pagamento} 
                                  onChange={(e) => onAggiornaOrdine(ord.id, { stato_pagamento: e.target.value })} 
                                  className={`h-8 border rounded-lg px-2 text-[11px] font-bold focus:outline-none cursor-pointer ${
                                    ord.stato_pagamento === 'In attesa'
                                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                                      : ord.stato_pagamento === 'In lavorazione'
                                      ? 'bg-blue-50 text-[#002b80] border-blue-200'
                                      : ord.stato_pagamento === 'Pronto per il ritiro'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  <option value="In attesa">In attesa</option>
                                  <option value="In lavorazione">In lavorazione</option>
                                  <option value="Pronto per il ritiro">Pronto per il ritiro</option>
                                  <option value="Completato">Completato</option>
                                </select>

                                <div className="flex items-center gap-1.5">
                                  {ord.stato_pagamento === "In attesa" && (
                                    <button
                                      onClick={() => onApriModificaOrdine(ord)}
                                      className="h-8 px-2.5 text-[11px] font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <FontAwesomeIcon icon={faPenToSquare} />
                                      <span className="hidden xs:inline">Modifica</span>
                                    </button>
                                  )}

                                  {!ord.pagato && ord.stato_pagamento === "In attesa" && (
                                    <button
                                      onClick={() => onAnnullaOrdine(ord)}
                                      className="h-8 px-2 text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <FontAwesomeIcon icon={faBan} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-slate-700">
                              {(ord.articoli || []).map((art, idx) => (
                                <div key={`admin-art-${idx}`} className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                                  <div>
                                    <span className="font-semibold">{art.nomeProdotto}</span> ({art.taglia}) • Profilo: <strong className="text-slate-900 font-bold">{art.atleta}</strong>
                                    {(art.nomePersonalizzato || art.numeroPersonalizzato || art.colorePersonalizzato) && (
                                      <span className="text-[10px] sm:text-[11px] text-[#002b80] ml-1.5 font-black block xs:inline">
                                        [{art.colorePersonalizzato || ''} {art.nomePersonalizzato || ''} {art.numeroPersonalizzato ? `N°${art.numeroPersonalizzato}` : ''}]
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between xs:justify-end gap-2.5 self-end xs:self-auto shrink-0">
                                    <span className="font-extrabold text-slate-900 tabular-nums">€{Number(art.prezzo || 0).toFixed(2)}</span>
                                    {!ord.pagato && ord.stato_pagamento === "In attesa" && (
                                      <button
                                        onClick={() => onCancellaArticolo(ord, art.idUnivoco)}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                                        title="Rimuovi capo dall'ordine"
                                      >
                                        <FontAwesomeIcon icon={faTrashCan} className="text-[11px]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
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

      {/* TAB 2: RIEPILOGO PER CATEGORIA (TITOLO PULITO E SENZA SETTORE) */}
      {adminTab === 'categorie' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
              Riepilogo per Categoria
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Capi assegnati a ciascun profilo tesserato ordinati per cognome
            </p>
          </div>

          {datiCategorie.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white border border-slate-200/80 rounded-2xl">
              <p className="text-xs text-slate-400 italic font-medium">Nessun capo registrato al momento.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {datiCategorie.map(({ categoria, profili, totaleCapi }) => (
                <div key={`cat-${categoria}`} className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xs space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-[#002b80] flex items-center justify-center text-xs font-black">
                        <FontAwesomeIcon icon={faLayerGroup} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                          Categoria: {categoria}
                        </h4>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
                          {profili.length} {profili.length === 1 ? 'profilo' : 'profili'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-[#002b80] bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-xl">
                      {totaleCapi} {totaleCapi === 1 ? 'capo' : 'capi'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {profili.map((profilo, pIdx) => (
                      <div 
                        key={`prof-${categoria}-${pIdx}`} 
                        className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 shadow-2xs"
                      >
                        <div className="flex justify-between items-start border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shrink-0">
                              <FontAwesomeIcon icon={faUser} />
                            </div>
                            <div className="truncate">
                              <h5 className="text-xs font-black text-slate-900 leading-none truncate">
                                {profilo.nomeCompleto}
                              </h5>
                              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block truncate">
                                Da: <strong className="text-slate-600">{profilo.acquirente}</strong>
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                            {profilo.articoli.length} pz
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {profilo.articoli.map((art, aIdx) => (
                            <div 
                              key={`art-row-${aIdx}`}
                              className="bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-xl text-[11px] flex justify-between items-center gap-2"
                            >
                              <div className="truncate">
                                <span className="font-bold text-slate-800">{art.nomeProdotto}</span>
                                <span className="text-slate-500 font-medium ml-1">({art.taglia})</span>
                                
                                {(art.nomePersonalizzato || art.numeroPersonalizzato || art.colorePersonalizzato) && (
                                  <div className="text-[10px] text-[#002b80] font-black truncate">
                                    {art.colorePersonalizzato && `${art.colorePersonalizzato} `}
                                    {art.nomePersonalizzato && `"${art.nomePersonalizzato}" `}
                                    {art.numeroPersonalizzato && `N°${art.numeroPersonalizzato}`}
                                  </div>
                                )}
                              </div>

                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                art.pagato ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {art.pagato ? 'Saldato' : 'In attesa'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GESTIONE CATALOGO */}
      {adminTab === 'catalogo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block">Nuovo Articolo</span>
                <h3 className="text-sm font-black text-slate-900">Aggiungi a Catalogo</h3>
              </div>
              <FontAwesomeIcon icon={faPlus} className="text-[#002b80] text-sm" />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Nome Capo</label>
              <input 
                type="text" 
                value={nuovoProd.nome} 
                onChange={e => onSetNuovoProd({...nuovoProd, nome: e.target.value})} 
                placeholder="Es. Cuffia Silicone CNL"
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Prezzo (€)</label>
              <input 
                type="number" 
                step="0.01" 
                value={nuovoProd.prezzo} 
                onChange={e => onSetNuovoProd({...nuovoProd, prezzo: e.target.value})} 
                placeholder="0.00"
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm text-[#002b80] font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Formato Taglia</label>
              <button
                type="button"
                onClick={() => onSetNuovoProd({...nuovoProd, taglia_unica: !nuovoProd.taglia_unica})}
                className={`w-full h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  nuovoProd.taglia_unica 
                    ? 'bg-[#002b80] text-white border-[#002b80]' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {nuovoProd.taglia_unica && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                <span>{nuovoProd.taglia_unica ? "Articolo a Taglia Unica" : "Taglie Multiple (6A - 5XL)"}</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Immagine</label>
              {anteprimaImmagine ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center justify-center">
                  <img src={anteprimaImmagine} alt="Anteprima" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={onRimuoviFile}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 rounded-xl border border-dashed border-slate-300 hover:border-[#002b80] bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-slate-400 hover:text-[#002b80]"
                >
                  <FontAwesomeIcon icon={faCamera} className="text-xl mb-1" />
                  <span className="text-[11px] font-bold text-slate-600">Carica foto</span>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

              {!fileImmagine && (
                <input 
                  type="text"
                  value={nuovoProd.immagine_url}
                  onChange={e => onSetNuovoProd({...nuovoProd, immagine_url: e.target.value})}
                  placeholder="Oppure incolla URL..."
                  className="w-full mt-2 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 focus:outline-none focus:border-[#002b80]"
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Personalizzazioni</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'personalizzabile_nome', label: 'Nome' },
                  { key: 'personalizzabile_numero', label: 'Numero' },
                  { key: 'personalizzabile_colore', label: 'Colore' }
                ].map(({ key, label }) => {
                  const attivo = nuovoProd[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSetNuovoProd({...nuovoProd, [key]: !attivo})}
                      className={`h-8 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        attivo ? 'bg-[#002b80] text-white border-[#002b80]' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {attivo && <FontAwesomeIcon icon={faCheck} className="text-[9px]" />}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={onCreaProdotto} 
              disabled={uploadingImage} 
              className="w-full h-10 bg-[#002b80] hover:bg-[#002060] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              <span>{uploadingImage ? "Caricamento..." : "Pubblica Capo"}</span>
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Catalogo Staff</span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                  {prodotti.length} presenti
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMostraAnteprimaCatalogo(true)}
                className="h-8 px-3 text-xs font-black bg-[#002b80] hover:bg-[#002060] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer w-fit"
              >
                <FontAwesomeIcon icon={faStore} className="text-[11px]" />
                <span>Mostra Catalogo</span>
              </button>
            </div>

            {prodotti.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 italic">Nessun capo inserito finora.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prodotti.map(p => {
                  const opt = [];
                  if (p.personalizzabile_nome) opt.push("Nome");
                  if (p.personalizzabile_numero) opt.push("Numero");
                  if (p.personalizzabile_colore) opt.push("Colore");
                  const visibile = p.attivo !== false;

                  return (
                    <div 
                      key={`cat-prod-${p.id}`} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-3 rounded-xl transition-colors ${
                        visibile ? 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/70' : 'bg-amber-50/40 border-amber-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.immagine_url ? (
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                            <img src={p.immagine_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300 text-[10px] font-bold shrink-0">N/D</div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-xs leading-tight truncate">{p.nome}</h4>
                            {p.taglia_unica && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-50 text-[#002b80] border border-blue-200 rounded">
                                Unica
                              </span>
                            )}
                            {!visibile && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded">
                                Nascosto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[#002b80] font-black text-sm tabular-nums">€{Number(p.prezzo || 0).toFixed(2)}</span>
                            {opt.length > 0 && <span className="text-[10px] text-slate-400 font-medium truncate">• {opt.join(", ")}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setProdottoInModifica(p)}
                          className="h-8 px-2.5 text-[11px] font-bold text-[#002b80] hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                          <span>Modifica</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleVisibilitaProdotto(p.id, !visibile)}
                          className={`h-8 px-2.5 text-[11px] font-bold border rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                            visibile 
                              ? 'text-slate-600 hover:bg-slate-200/60 border-slate-200' 
                              : 'text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 border-amber-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={visibile ? faEyeSlash : faEye} />
                          <span>{visibile ? "Nascondi" : "Mostra"}</span>
                        </button>

                        <button 
                          onClick={() => onEliminaProdotto(p.id)} 
                          className="h-8 px-2 text-slate-400 hover:text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
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

    </div>
  );
}