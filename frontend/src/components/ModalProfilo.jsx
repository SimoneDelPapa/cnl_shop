import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faFloppyDisk, faTrashCan, faUser } from '@fortawesome/free-solid-svg-icons';

function FormDatiProfilo({ utente, onClose, onAggiornaProfilo }) {
  const [nome, setNome] = useState(utente?.nome || '');
  const [cognome, setCognome] = useState(utente?.cognome || '');
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;

    setSalvataggioInCorso(true);
    await onAggiornaProfilo({
      nome: nome.trim(),
      cognome: cognome.trim()
    });
    setSalvataggioInCorso(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
          Email
        </label>
        <input 
          type="text" 
          disabled 
          value={utente?.email || ''} 
          className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-500 cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
            Nome
          </label>
          <input 
            type="text" 
            required 
            value={nome} 
            onChange={e => setNome(e.target.value)}
            placeholder="Nome"
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
            placeholder="Cognome"
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={salvataggioInCorso}
        className="w-full h-11 bg-[#002b80] hover:bg-[#002060] disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
      >
        <FontAwesomeIcon icon={faFloppyDisk} />
        <span>{salvataggioInCorso ? "Salvataggio..." : "Salva Modifiche"}</span>
      </button>
    </form>
  );
}

export default function ModalProfilo({
  utente,
  onClose,
  onAggiornaProfilo,
  onCancellaAccount
}) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* TESTATA FISSA */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#002b80] flex items-center justify-center text-sm shadow-2xs">
              <FontAwesomeIcon icon={faUser} />
            </div>
            <h3 className="text-base font-black text-slate-900 leading-tight">
              Il Tuo Profilo
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* FORM ISOLATO CON RESET AUTOMATICO DELLO STATO */}
        <FormDatiProfilo 
          key={utente?.id || utente?.email || 'form-profilo'}
          utente={utente}
          onClose={onClose}
          onAggiornaProfilo={onAggiornaProfilo}
        />

        {/* PIEDINO FISSO */}
        <div className="pt-4 mt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onCancellaAccount}
            className="w-full h-10 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FontAwesomeIcon icon={faTrashCan} />
            <span>Elimina Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}