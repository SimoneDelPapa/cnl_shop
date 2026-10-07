import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faXmark, faArrowRight } from '@fortawesome/free-solid-svg-icons';

export default function ModalGuidaPrimoAccesso({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-lg shadow-2xs shrink-0">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#002b80] block">
                Benvenuto su CNL Shop
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Registra il tuo primo profilo
              </h3>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed mb-4">
          Per ordinare gli articoli, aggiungi prima i profili per cui vuoi acquistare i capi.
        </p>

        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#002b80] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
            <span>Clicca sull'icona in alto per aggiungere uno o più profili.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#002b80] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
            <span>Inserisci Nome, Cognome e Categoria.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#002b80] text-white text-[10px] font-black flex items-center justify-center shrink-0">3</span>
            <span>Assegna ogni capo al profilo corrispondente.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 bg-[#002b80] hover:bg-[#002060] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          <span>Inizia subito</span>
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </button>
      </div>
    </div>
  );
}