import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMagnifyingGlassPlus, faLock } from '@fortawesome/free-solid-svg-icons';

export default function ProdottoCard({
  prodotto,
  onAggiungi,
  isUserAdmin,
  listaAtleti = [],
  onZoomFoto
}) {
  const TAGLIE = ["Taglia Unica", "6A", "8A", "10A", "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
  const COLORI_DISPONIBILI = ["NERA", "BIANCA", "ROSSA"];
  const NUMERI_DISPONIBILI = Array.from({ length: 15 }, (_, i) => i + 1);

  const [tagliaSelezionata, setTagliaSelezionata] = useState(
    prodotto.taglia_unica ? 'Taglia Unica' : 'M'
  );
  
  const [atletaSelezionato, setAtletaSelezionato] = useState(() => {
    return listaAtleti.length > 0 
      ? (typeof listaAtleti[0] === 'object' ? `${listaAtleti[0].nome} ${listaAtleti[0].cognome}` : listaAtleti[0])
      : '';
  });

  const [nomeStampa, setNomeStampa] = useState('');
  const [numeroStampa, setNumeroStampa] = useState('');
  const [coloreStampa, setColoreStampa] = useState('NERA');

  const categoriaAtleta = (() => {
    if (!atletaSelezionato) return '';
    const trovato = listaAtleti.find(a => {
      const nomeCompleto = typeof a === 'object' ? `${a.nome} ${a.cognome}` : a;
      return nomeCompleto === atletaSelezionato;
    });
    return typeof trovato === 'object' ? (trovato.categoria || '') : '';
  })();

  const isPortiereRosso = (() => {
    const num = parseInt(numeroStampa, 10);
    if (num === 1) return true;
    if (num === 13 && categoriaAtleta !== 'U14' && categoriaAtleta !== 'U18') return true;
    return false;
  })();

  const coloreEffettivo = isPortiereRosso ? 'ROSSA' : coloreStampa;

  const handleAggiungi = (e) => {
    e.preventDefault();
    if (!atletaSelezionato && listaAtleti.length > 0) {
      alert("Seleziona a quale profilo associare il capo.");
      return;
    }

    onAggiungi({
      idUnivoco: `${prodotto.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prodottoId: prodotto.id,
      nomeProdotto: prodotto.nome,
      prezzo: Number(prodotto.prezzo || 0),
      taglia: prodotto.taglia_unica ? 'Taglia Unica' : tagliaSelezionata,
      atleta: atletaSelezionato || "Profilo",
      nomePersonalizzato: nomeStampa.trim().toUpperCase(),
      numeroPersonalizzato: numeroStampa ? String(numeroStampa) : '',
      colorePersonalizzato: prodotto.personalizzabile_colore ? coloreEffettivo : '',
      immagine_url: prodotto.immagine_url || null
    });

    setNomeStampa('');
    setNumeroStampa('');
    setColoreStampa('NERA');
  };

  const apriZoom = () => {
    if (prodotto.immagine_url && onZoomFoto) {
      onZoomFoto(prodotto.immagine_url, prodotto.nome);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
      <div>
        {/* Riquadro Foto: Cliccabile direttamente per lo zoom */}
        <div 
          onClick={apriZoom}
          className={`relative w-full h-48 sm:h-52 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-2 group ${
            prodotto.immagine_url ? 'cursor-zoom-in' : ''
          }`}
          title={prodotto.immagine_url ? "Clicca per ingrandire la foto" : ""}
        >
          {prodotto.immagine_url ? (
            <>
              <img 
                src={prodotto.immagine_url} 
                alt={prodotto.nome}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  apriZoom();
                }}
                className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center text-xs shadow-sm transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                title="Ingrandisci immagine"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              </button>
            </>
          ) : (
            <div className="text-slate-300 font-black text-xs uppercase tracking-wider select-none">
              Nessuna Foto
            </div>
          )}
        </div>

        <div className="mt-3.5 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-snug">{prodotto.nome}</h3>
            {prodotto.taglia_unica && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md mt-1 inline-block">
                Taglia Unica
              </span>
            )}
          </div>
          <span className="text-xl font-black text-[#002b80] tabular-nums shrink-0">
            €{Number(prodotto.prezzo || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {!isUserAdmin && (
        <form onSubmit={handleAggiungi} className="space-y-3 pt-2 border-t border-slate-100">
          {listaAtleti.length > 0 && (
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Profilo
              </label>
              <select
                value={atletaSelezionato}
                onChange={e => setAtletaSelezionato(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80] cursor-pointer"
              >
                {listaAtleti.map((atl, i) => {
                  const nomeCompleto = typeof atl === 'object' ? `${atl.nome} ${atl.cognome}` : atl;
                  const cat = typeof atl === 'object' ? atl.categoria : '';
                  return <option key={i} value={nomeCompleto}>{nomeCompleto} {cat ? `(${cat})` : ''}</option>;
                })}
              </select>
            </div>
          )}

          {!prodotto.taglia_unica ? (
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Taglia
              </label>
              <select
                value={tagliaSelezionata}
                onChange={e => setTagliaSelezionata(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80] cursor-pointer"
              >
                {TAGLIE.filter(t => t !== "Taglia Unica").map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600">
              Formato: <strong>Taglia Unica</strong>
            </div>
          )}

          {(prodotto.personalizzabile_nome || prodotto.personalizzabile_numero || prodotto.personalizzabile_colore) && (
            <div className="space-y-2 pt-1">
              {prodotto.personalizzabile_nome && (
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Nome da Stampare</label>
                  <input
                    type="text"
                    placeholder="Es. ROSSI"
                    value={nomeStampa}
                    onChange={e => setNomeStampa(e.target.value)}
                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-slate-800 uppercase placeholder:normal-case placeholder-slate-400 focus:outline-none focus:border-[#002b80]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {prodotto.personalizzabile_numero && (
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Numero (1-15)</label>
                    <select
                      value={numeroStampa}
                      onChange={e => setNumeroStampa(e.target.value)}
                      className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                    >
                      <option value="">Nessuno</option>
                      {NUMERI_DISPONIBILI.map(n => (
                        <option key={n} value={n}>N° {n}</option>
                      ))}
                    </select>
                  </div>
                )}

                {prodotto.personalizzabile_colore && (
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center justify-between">
                      <span>Colore</span>
                      {isPortiereRosso && <FontAwesomeIcon icon={faLock} className="text-amber-600 text-[9px]" title="Colore bloccato per ruolo portiere" />}
                    </label>
                    <select
                      value={coloreEffettivo}
                      disabled={isPortiereRosso}
                      onChange={e => setColoreStampa(e.target.value)}
                      className={`w-full h-8 border rounded-lg px-2 text-xs font-black cursor-pointer focus:outline-none ${
                        isPortiereRosso 
                          ? 'bg-amber-50 text-red-700 border-amber-300 font-extrabold' 
                          : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-[#002b80]'
                      }`}
                    >
                      {COLORI_DISPONIBILI.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {isPortiereRosso && (
                <p className="text-[10px] text-amber-700 font-bold leading-tight">
                  * Numero assegnato al portiere: colore impostato obbligatoriamente su ROSSA.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-10 mt-1 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <span>Aggiungi al Carrello</span>
          </button>
        </form>
      )}
    </div>
  );
}