import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faUserPlus, 
  faChevronDown, 
  faChevronUp, 
  faPenToSquare, 
  faTrashCan, 
  faXmark 
} from '@fortawesome/free-solid-svg-icons';

export default function GestioneAtleti({
  atleti = [],
  categorie = [],
  onAggiungiAtleta,
  onModificaAtleta,
  onRimuoviAtleta
}) {
  const [aperto, setAperto] = useState(false);
  const [modalAtleta, setModalAtleta] = useState(null);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [categoria, setCategoria] = useState(categorie[0] || 'Extra');

  const apriNuovo = () => {
    setNome('');
    setCognome('');
    setCategoria(categorie[0] || 'Extra');
    setModalAtleta({ isNuovo: true });
  };

  const apriModifica = (atl) => {
    if (typeof atl === 'object') {
      setNome(atl.nome || '');
      setCognome(atl.cognome || '');
      setCategoria(atl.categoria || categorie[0] || 'Extra');
    } else {
      const parts = String(atl).split(' ');
      setNome(parts[0] || '');
      setCognome(parts.slice(1).join(' ') || '');
      setCategoria(categorie[0] || 'Extra');
    }
    setModalAtleta({ isNuovo: false, atletaOriginale: atl });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;

    const atletaObj = {
      nome: nome.trim(),
      cognome: cognome.trim(),
      categoria: categoria
    };

    if (modalAtleta?.isNuovo) {
      onAggiungiAtleta(atletaObj);
    } else {
      onModificaAtleta(modalAtleta.atletaOriginale, atletaObj);
    }

    setModalAtleta(null);
  };

  return (
    <div className="w-full">
      {/* RIQUADRO UNICO */}
      <div className={`w-full bg-white border border-slate-200/90 rounded-3xl transition-all overflow-hidden ${
        aperto ? 'shadow-sm ring-1 ring-slate-200/60' : 'shadow-xs'
      }`}>
        
        {/* BARRA SUPERIORE DEL RIQUADRO */}
        <div 
          onClick={() => setAperto(!aperto)}
          className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
            aperto ? 'bg-slate-50/70 border-b border-slate-100' : 'hover:bg-slate-50/40'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
              aperto ? 'bg-[#002b80] text-white shadow-2xs' : 'bg-blue-50 text-[#002b80]'
            }`}>
              <FontAwesomeIcon icon={faUsers} />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-black text-slate-900 leading-tight">Profili Atleti</span>
              <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full shrink-0">
                {atleti.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                apriNuovo();
              }}
              className="w-9 h-9 sm:w-auto sm:px-3.5 bg-[#002b80] hover:bg-[#002060] active:scale-[0.98] text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-colors cursor-pointer shadow-2xs"
              title="Aggiungi profilo"
            >
              <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
              <span className="hidden sm:inline">Nuovo</span>
            </button>

            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
              <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} />
            </div>
          </div>
        </div>

        {/* LISTA INTERNA DEI PROFILI (LINEARE, SENZA SOTTORIQUADRI) */}
        {aperto && (
          <div className="animate-in slide-in-from-top-1 duration-150">
            {atleti.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 italic py-6 text-center">
                Nessun profilo registrato. Clicca su "Nuovo" per inserire il primo atleta.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {atleti.map((atl, idx) => {
                  const nomeVisualizzato = typeof atl === 'object' ? `${atl.nome} ${atl.cognome}`.trim() : atl;
                  const catVisualizzata = typeof atl === 'object' ? atl.categoria : 'Extra';

                  return (
                    <div 
                      key={idx}
                      className="px-4 py-3 sm:px-5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[#002b80] shrink-0"></span>
                        <div className="min-w-0">
                          <strong className="font-black text-slate-900 block truncate text-sm leading-tight">
                            {nomeVisualizzato}
                          </strong>
                          <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                            Categoria: <strong className="text-slate-700">{catVisualizzata}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => apriModifica(atl)}
                          className="w-8 h-8 rounded-xl text-[#002b80] hover:bg-blue-50 flex items-center justify-center text-xs transition-colors cursor-pointer"
                          title="Modifica Profilo"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRimuoviAtleta(atl)}
                          className="w-8 h-8 rounded-xl text-red-600 hover:bg-red-50 flex items-center justify-center text-xs transition-colors cursor-pointer"
                          title="Elimina Profilo"
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
        )}

      </div>

      {/* POPUP MODALE NUOVO / MODIFICA PROFILO */}
      {modalAtleta && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setModalAtleta(null)}
        >
          <div 
            className="relative w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
              <h4 className="text-base font-black text-slate-900 leading-tight">
                {modalAtleta.isNuovo ? "Nuovo Profilo Atleta" : "Modifica Profilo"}
              </h4>
              <button 
                type="button"
                onClick={() => setModalAtleta(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Nome
                </label>
                <input 
                  type="text" 
                  required 
                  value={nome} 
                  onChange={e => setNome(e.target.value)}
                  placeholder="Es. Mario"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Cognome
                </label>
                <input 
                  type="text" 
                  required 
                  value={cognome} 
                  onChange={e => setCognome(e.target.value)}
                  placeholder="Es. Rossi"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Categoria / Squadra
                </label>
                <select 
                  value={categoria} 
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                >
                  {categorie.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3.5 mt-3 border-t border-slate-100 shrink-0">
                <button
                  type="submit"
                  className="w-full h-12 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer text-center"
                >
                  {modalAtleta.isNuovo ? "Aggiungi Profilo" : "Salva Profilo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}