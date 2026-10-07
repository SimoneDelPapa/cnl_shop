import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTriangleExclamation, 
  faCircleCheck, 
  faCircleInfo, 
  faXmark 
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

export default function CustomModal({ modalConfig, onClose }) {
  if (!modalConfig || !modalConfig.isOpen) return null;

  const {
    tipo = 'warning',
    titolo = '',
    messaggio = '',
    onConferma = null,
    testoConferma = 'Conferma',
    mostraX = true,
    isPaypal = false
  } = modalConfig;

  // Rileva se si tratta di un'azione Paypal
  const isPaypalModal = isPaypal || 
    titolo.toLowerCase().includes('saldo') || 
    titolo.toLowerCase().includes('paypal') || 
    testoConferma.toLowerCase().includes('paypal');

  // Rileva se è un'azione distruttiva (elimina/annulla/cancella)
  const isAzioneDistruttiva = tipo === 'error' || 
    testoConferma.toLowerCase().includes('elimina') || 
    testoConferma.toLowerCase().includes('annulla') ||
    titolo.toLowerCase().includes('elimina') ||
    titolo.toLowerCase().includes('annulla') ||
    titolo.toLowerCase().includes('cancellazione');

  const iconeTipo = {
    warning: faTriangleExclamation,
    success: faCircleCheck,
    info: faCircleInfo,
    error: faTriangleExclamation
  };

  const coloriIcona = {
    warning: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-emerald-600',
    info: 'bg-blue-50 text-[#002b80]',
    error: 'bg-red-50 text-red-600'
  };

  // Stile dinamico per l'unico pulsante full-width
  const getColorePulsante = () => {
    if (isAzioneDistruttiva) {
      return 'bg-red-600 hover:bg-red-700 shadow-red-950/15';
    }
    if (isPaypalModal || tipo === 'info') {
      return 'bg-[#002b80] hover:bg-[#002060] shadow-blue-950/15';
    }
    if (tipo === 'success') {
      return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/15';
    }
    return 'bg-amber-600 hover:bg-amber-700 shadow-amber-950/15';
  };

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* INTESTAZIONE CON X */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
              isPaypalModal 
                ? 'bg-blue-50 text-[#002b80]' 
                : isAzioneDistruttiva 
                ? 'bg-red-50 text-red-600' 
                : (coloriIcona[tipo] || coloriIcona.warning)
            }`}>
              <FontAwesomeIcon icon={isPaypalModal ? faPaypal : (iconeTipo[tipo] || faTriangleExclamation)} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {titolo}
            </h3>
          </div>

          {mostraX && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>

        {/* CORPO DEL MESSAGGIO */}
        <div className="py-4 space-y-3 flex-1 overflow-y-auto text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
          {messaggio}
        </div>

        {/* PULSANTE UNICO FULL-WIDTH (SENZA TASTO ANNULLA SECONDARIO) */}
        <div className="pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onConferma) onConferma();
              onClose();
            }}
            className={`w-full h-12 active:scale-[0.98] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${getColorePulsante()}`}
          >
            {isPaypalModal && <FontAwesomeIcon icon={faPaypal} className="text-base" />}
            <span>{isPaypalModal ? "Paga" : testoConferma}</span>
          </button>
        </div>
      </div>
    </div>
  );
}