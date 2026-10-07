import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCircleCheck, 
  faCircleExclamation, 
  faCircleInfo, 
  faTriangleExclamation, 
  faXmark 
} from '@fortawesome/free-solid-svg-icons';

export default function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const iconePerTipo = {
    success: { icon: faCircleCheck, bg: 'bg-emerald-600', text: 'text-emerald-950', border: 'border-emerald-200' },
    error: { icon: faCircleExclamation, bg: 'bg-red-600', text: 'text-red-950', border: 'border-red-200' },
    warning: { icon: faTriangleExclamation, bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-200' },
    info: { icon: faCircleInfo, bg: 'bg-[#002b80]', text: 'text-slate-900', border: 'border-slate-200' }
  };

  const stile = iconePerTipo[toast.tipo] || iconePerTipo.info;

  return (
    <aside 
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-70 w-[calc(100%-2rem)] max-w-sm px-1 pointer-events-none select-none"
    >
      <div 
        className={`pointer-events-auto bg-white/95 backdrop-blur-md border ${stile.border} shadow-xl rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${stile.bg} text-white flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
            <FontAwesomeIcon icon={stile.icon} />
          </div>

          <div className="min-w-0">
            {toast.titolo && (
              <h4 className={`text-xs sm:text-sm font-black ${stile.text} leading-tight truncate`}>
                {toast.titolo}
              </h4>
            )}
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 leading-snug line-clamp-2 mt-0.5">
              {toast.messaggio}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs transition-colors shrink-0 cursor-pointer"
          title="Chiudi"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </aside>
  );
}