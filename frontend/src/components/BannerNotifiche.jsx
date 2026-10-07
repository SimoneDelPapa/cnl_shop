import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

export default function BannerNotifiche({ notifiche = [], onConfermaPagamento }) {
  const [notificaAperta, setNotificaAperta] = useState(null);

  if (!notifiche || notifiche.length === 0) return null;

  const handlePagaClick = () => {
    if (!notificaAperta) return;
    
    // CONTIENE L'IMPORTO DOVUTO E VERIFICA SE MAGGIORE DI ZERO
    const importoDovuto = Number(notificaAperta.totaleDovuto || 0);
    const baseLink = notificaAperta.linkPaypal;

    // CONCATENA DINAMICAMENTE L'IMPORTO SOLO SE > 0, EVITANDO ERRORI SE FOSSE GIÀ PRESENTE NELLA NOTIFICA
    let linkDinamico = baseLink;
    if (importoDovuto > 0 && baseLink && !baseLink.endsWith(importoDovuto.toFixed(2))) {
      linkDinamico = `${baseLink.split('/')[0]}//${baseLink.split('/')[2]}/${baseLink.split('/')[3].split('?')[0]}/${importoDovuto.toFixed(2)}`;
    }

    if (onConfermaPagamento) {
      onConfermaPagamento(notificaAperta);
    }
    setNotificaAperta(null);
    if (linkDinamico) {
      window.open(linkDinamico, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="space-y-3 mb-5 animate-in fade-in duration-150">
        {notifiche.map((n) => {
          const importoDovuto = Number(n.totaleDovuto || 0);

          return (
            <div
              key={n.id}
              className="p-3.5 sm:p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-sm shadow-xs mt-0.5 sm:mt-0">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      {n.titolo || "Avviso Pagamento"}
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 border border-amber-300 px-2 py-0.5 rounded-md">
                      {n.disciplina || 'Forniture'}
                    </span>
                  </div>
                  {/* Testo intero visibile senza troncamento su mobile */}
                  <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug break-words">
                    {n.messaggio}
                  </p>
                </div>
              </div>

              {/* Box Importo & Pulsante Saldo visibili sempre in modo prominente su mobile */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-500/20 shrink-0">
                <div className="bg-white/90 border border-amber-300 px-3 py-1 rounded-xl shadow-2xs text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Totale</span>
                  <span className="text-sm sm:text-base font-black text-amber-950 tabular-nums leading-none">
                    €{importoDovuto.toFixed(2)}
                  </span>
                </div>

                {n.linkPaypal && (
                  <button
                    type="button"
                    onClick={() => setNotificaAperta(n)}
                    className="h-10 px-3.5 rounded-xl bg-[#002b80] hover:bg-[#002060] active:scale-[0.98] text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <FontAwesomeIcon icon={faPaypal} className="text-sm" />
                    <span>Paga Ora</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* POPUP MODALE SALDO PAYPAL */}
      {notificaAperta && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setNotificaAperta(null)}
        >
          <div 
            className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#002b80] flex items-center justify-center text-base shrink-0">
                  <FontAwesomeIcon icon={faPaypal} />
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Saldo Ordini
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotificaAperta(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="py-5 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                Stai accedendo al canale PayPal ufficiale per <strong className="text-slate-900 uppercase font-black">{notificaAperta.disciplina || 'PALLANUOTO'}</strong>.
              </p>

              <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Da saldare:</span>
                <span className="text-2xl font-black text-amber-950 tabular-nums">
                  €{Number(notificaAperta.totaleDovuto || 0).toFixed(2)}
                </span>
              </div>

              <p className="text-[11px] font-semibold text-slate-400 text-center italic">
                Specifica il nominativo dell'atleta nella causale del versamento.
              </p>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={handlePagaClick}
                className="w-full h-12 bg-[#002b80] hover:bg-[#002060] active:scale-[0.98] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <FontAwesomeIcon icon={faPaypal} className="text-base" />
                <span>Procedi al Pagamento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}