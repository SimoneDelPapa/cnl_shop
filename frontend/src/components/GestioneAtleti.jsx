import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faTrashCan, faUsers, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

export default function GestioneAtleti({
  atleti = [],
  categorie = [],
  onAggiungiAtleta,
  onRimuoviAtleta
}) {
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [categoria, setCategoria] = useState(categorie[0] || 'U14');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;

    onAggiungiAtleta({
      nome: nome.trim(),
      cognome: cognome.trim(),
      categoria
    });

    setNome('');
    setCognome('');
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden transition-all">
      {/* Header fisso cliccabile per aprire/chiudere */}
      <div 
        onClick={() => setAperto(!aperto)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-sm shadow-2xs">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
              Profili Nucleo Familiare
            </h3>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
              {atleti.length === 0 ? "Nessun profilo registrato" : `${atleti.length} ${atleti.length === 1 ? 'profilo configurato' : 'profili configurati'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-extrabold text-[#002b80] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl">
            {aperto ? "Chiudi" : "Gestisci"}
          </span>
          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-xs">
            <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} />
          </div>
        </div>
      </div>

      {/* Contenuto collassabile */}
      {aperto && (
        <div className="p-4 sm:p-6 border-t border-slate-100 space-y-4 bg-slate-50/40 animate-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80]"
            />
            <input
              type="text"
              placeholder="Cognome"
              value={cognome}
              onChange={e => setCognome(e.target.value)}
              required
              className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80]"
            />
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80] cursor-pointer"
            >
              {categorie.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button
              type="submit"
              className="h-10 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
              <span>Aggiungi Profilo</span>
            </button>
          </form>

          {atleti.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {atleti.map((atl, idx) => {
                const nomeCompleto = typeof atl === 'object' ? `${atl.nome} ${atl.cognome}` : atl;
                const cat = typeof atl === 'object' ? atl.categoria : null;
                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 bg-white border border-slate-200 pl-3 pr-2 py-1 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <span className="truncate max-w-[160px] sm:max-w-none">{nomeCompleto}</span>
                    {cat && (
                      <span className="text-[10px] font-black uppercase text-[#002b80] bg-blue-50 px-1.5 py-0.5 rounded-md">
                        {cat}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRimuoviAtleta(atl)}
                      className="w-5 h-5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                      title="Rimuovi profilo"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Nessun profilo registrato. Inserisci i dati sopra per associare comodamente i capi da ordinare.
            </p>
          )}
        </div>
      )}
    </div>
  );
}