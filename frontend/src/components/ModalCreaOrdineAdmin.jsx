import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCartPlus, 
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import ProdottoCard from './ProdottoCard';

export default function ModalCreaOrdineAdmin({
  isOpen,
  onClose,
  account, // { id, email, nomeCompleto, profili: [...] }
  prodotti = [],
  settoreUtente = 'pallanuoto',
  onZoomFoto,
  onConfermaOrdine
}) {
  const [pagatoSubito, setPagatoSubito] = useState(false);

  // Passa tutti i profili dell'account direttamente a ProdottoCard
  const listaAtletiAccount = useMemo(() => {
    return (account?.profili || []).map(p => ({
      nome: p.nome || p.nomeCompleto,
      cognome: p.cognome || '',
      categoria: p.categoria || 'Extra'
    }));
  }, [account]);

  const prodottiVisibili = useMemo(() => {
    return prodotti.filter(p => p.attivo !== false);
  }, [prodotti]);

  if (!isOpen || !account) return null;

  return (
    <div 
      className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-[96vw] max-w-6xl h-[94vh] sm:h-[90vh] bg-slate-50 rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER FISSO: ACCOUNT BLOCCATO, PULSANTE SALDATO E CHIUDI */}
        <div className="p-4 sm:p-6 bg-white border-b border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg shadow-2xs shrink-0">
              <FontAwesomeIcon icon={faCartPlus} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-700 block">
                Creazione Ordine Delegata
              </span>
              <h3 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate">
                Account: <span className="text-[#002b80]">{account.nomeCompleto}</span>
                <span className="text-xs font-bold text-slate-400 ml-2 hidden sm:inline">({account.email})</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* PULSANTE STATO SALDATO */}
            <button
              type="button"
              onClick={() => setPagatoSubito(prev => !prev)}
              className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs select-none ${
                pagatoSubito 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title="Clicca per invertire lo stato di pagamento dell'ordine"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${pagatoSubito ? 'bg-emerald-600' : 'bg-amber-500'}`} />
              <span>{pagatoSubito ? "Saldato" : "Non saldato"}</span>
            </button>

            <button 
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
              title="Chiudi finestra"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* CORPO: CATALOGO CON ProdottoCard.jsx */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {prodottiVisibili.length === 0 ? (
            <div className="p-16 text-center bg-white border border-slate-200/90 rounded-3xl shadow-xs">
              <p className="text-sm font-bold text-slate-400">Nessun articolo a catalogo per questo settore.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {prodottiVisibili.map(prod => (
                <ProdottoCard
                  key={prod.id}
                  prodotto={prod}
                  listaAtleti={listaAtletiAccount}
                  settoreUtente={settoreUtente}
                  onZoomFoto={onZoomFoto}
                  isUserAdmin={false}
                  onAggiungi={(itemConfigurato) => {
                    const profiloTrovato = (account?.profili || []).find(
                      p => (p.nomeCompleto || `${p.nome || ''} ${p.cognome || ''}`.trim()) === itemConfigurato.atleta
                    );

                    onConfermaOrdine({
                      utenteId: account.id,
                      emailAcquirente: account.email,
                      nomeAcquirente: account.nomeCompleto,
                      atleta: itemConfigurato.atleta,
                      categoria: profiloTrovato?.categoria || itemConfigurato.categoria || 'Extra',
                      prodotto: prod,
                      taglia: itemConfigurato.taglia,
                      nomePersonalizzato: itemConfigurato.nomePersonalizzato,
                      numeroPersonalizzato: itemConfigurato.numeroPersonalizzato,
                      colorePersonalizzato: itemConfigurato.colorePersonalizzato,
                      pagatoSubito: pagatoSubito
                    });
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}