import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faUser, faTrashCan, faCheck } from '@fortawesome/free-solid-svg-icons';

export default function ModalProfilo({
  utente,
  onClose,
  onAggiornaProfilo,
  onCancellaAccount
}) {
  const [nome, setNome] = useState(utente.nome || '');
  const [cognome, setCognome] = useState(utente.cognome || '');
  const [loading, setLoading] = useState(false);

  const handleSalva = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;
    setLoading(true);
    await onAggiornaProfilo({ nome: nome.trim(), cognome: cognome.trim() });
    setLoading(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-base shadow-2xs">
              <FontAwesomeIcon icon={faUser} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#002b80] block">
                Area Personale
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Profilo Account
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

        <form onSubmit={handleSalva} className="space-y-4">
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Email (Non modificabile)
            </label>
            <input 
              type="text" 
              value={utente.email} 
              disabled 
              className="w-full h-10 bg-slate-100 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Nome
              </label>
              <input 
                type="text" 
                value={nome} 
                onChange={e => setNome(e.target.value)}
                required
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80]"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Cognome
              </label>
              <input 
                type="text" 
                value={cognome} 
                onChange={e => setCognome(e.target.value)}
                required
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002b80]/15 focus:border-[#002b80]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#002b80] hover:bg-[#002060] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-950/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
              <span>{loading ? "Salvataggio..." : "Salva Modifiche"}</span>
            </button>
          </div>
        </form>

        {/* Sezione di pericolo: Cancellazione definitiva account */}
        <div className="mt-6 pt-4 border-t border-red-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block mb-1">
            Zona Pericolo
          </span>
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-red-900">Cancella Account</h4>
              <p className="text-[11px] text-red-700 leading-tight mt-0.5">
                Elimina definitivamente il tuo profilo e i tuoi dati di accesso.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancellaAccount}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span>Elimina</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}