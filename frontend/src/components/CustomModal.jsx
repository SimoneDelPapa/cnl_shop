import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCircleCheck, 
  faCircleExclamation, 
  faTriangleExclamation, 
  faXmark 
} from '@fortawesome/free-solid-svg-icons';

export default function CustomModal({ modalConfig, onClose }) {
  if (!modalConfig || !modalConfig.isOpen) return null;

  const { tipo = 'info', titolo, messaggio, onConferma, testoConferma = 'Conferma', testoAnnulla = 'Annulla' } = modalConfig;

  // Icone e colori in base al tipo di modale
  const configStile = {
    success: {
      icona: faCircleCheck,
      coloreIcona: 'text-emerald-600',
      sfondoIcona: 'bg-emerald-50 border-emerald-200/60',
      coloreBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    error: {
      icona: faCircleExclamation,
      coloreIcona: 'text-red-600',
      sfondoIcona: 'bg-red-50 border-red-200/60',
      coloreBtn: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icona: faTriangleExclamation,
      coloreIcona: 'text-amber-600',
      sfondoIcona: 'bg-amber-50 border-amber-200/60',
      coloreBtn: 'bg-[#002b80] hover:bg-[#002060] text-white'
    },
    info: {
      icona: faCircleExclamation,
      coloreIcona: 'text-[#002b80]',
      sfondoIcona: 'bg-blue-50 border-blue-200/60',
      coloreBtn: 'bg-[#002b80] hover:bg-[#002060] text-white'
    }
  }[tipo] || {};

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => { if (!onConferma) onClose(); }}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base ${configStile.sfondoIcona} ${configStile.coloreIcona}`}>
              <FontAwesomeIcon icon={configStile.icona} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Notifica CNL Shop</span>
              <h3 className="text-base font-black text-slate-900 leading-tight">{titolo || "Attenzione"}</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="text-xs text-slate-600 leading-relaxed py-1">
          <p>{messaggio}</p>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          {onConferma && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {testoAnnulla}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onConferma) onConferma();
              onClose();
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${configStile.coloreBtn}`}
          >
            {testoConferma}
          </button>
        </div>
      </div>
    </div>
  );
}