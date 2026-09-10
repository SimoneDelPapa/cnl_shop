import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark, faReceipt } from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

export default function BannerNotifiche({ notifiche, onEliminaNotifica }) {
  if (!notifiche || notifiche.length === 0) return null;

  const handlePagaERimuovi = (notificaId, linkPaypal) => {
    // 1. Apri la pagina di pagamento PayPal
    window.open(linkPaypal, '_blank', 'noopener,noreferrer');
    // 2. Fai sparire contestualmente la notifica
    if (onEliminaNotifica) {
      onEliminaNotifica(notificaId);
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {notifiche.map((notif) => (
        <div 
          key={notif.id}
          className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg shrink-0 mt-0.5">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                  Sollecito Saldo Ordini
                </span>
                <span className="text-slate-400 font-medium text-[11px]">
                  {notif.data_invio || "Recentemente"}
                </span>
              </div>
              <h4 className="font-black text-slate-900 text-sm">
                Hai ordini in attesa di pagamento per un totale di €{Number(notif.totaleDovuto || 0).toFixed(2)}
              </h4>
              <p className="text-slate-600 leading-relaxed">
                {notif.messaggio || "Ti ricordiamo di completare il pagamento degli articoli sportivi prenotati."}
              </p>

              {/* Elenco Capi da Saldare */}
              {notif.dettagliOrdini && notif.dettagliOrdini.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200/70 space-y-1 text-slate-700">
                  <span className="font-bold flex items-center gap-1.5 text-amber-950">
                    <FontAwesomeIcon icon={faReceipt} className="text-[10px]" />
                    Riepilogo capi:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1 text-slate-600">
                    {notif.dettagliOrdini.map((d, idx) => (
                      <li key={idx}>
                        <strong>#{d.idOrdine.slice(-6).toUpperCase()}</strong> ({d.stato || 'In attesa'}): {d.capi} — <span className="font-bold text-slate-900">€{Number(d.totale).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-200/60">
            {notif.linkPaypal && (
              <button
                type="button"
                onClick={() => handlePagaERimuovi(notif.id, notif.linkPaypal)}
                className="w-full md:w-auto px-4 py-2 bg-[#003087] hover:bg-[#002060] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faPaypal} />
                <span>Salda Ora (€{Number(notif.totaleDovuto || 0).toFixed(2)})</span>
              </button>
            )}
            <button
              onClick={() => onEliminaNotifica(notif.id)}
              className="w-8 h-8 rounded-xl bg-amber-100 hover:bg-amber-200/80 text-amber-900 flex items-center justify-center text-xs transition-colors"
              title="Nascondi notifica"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}