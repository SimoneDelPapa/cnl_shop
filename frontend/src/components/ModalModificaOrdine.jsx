import { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faXmark, 
  faReceipt, 
  faPenToSquare,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const TAGLIE_DEFAULT = ["4XS", "3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
const NUMERI = Array.from({ length: 15 }, (_, i) => String(i + 1));

export default function ModalModificaOrdine({
  ordine,
  listaAtleti = [],
  prodotti = [],
  onClose,
  onSalva
}) {
  const articoloIniziale = useMemo(() => {
    if (ordine.articoli && ordine.articoli.length > 0) {
      return ordine.articoli[0];
    }
    return ordine;
  }, [ordine]);

  const prodottoInfo = useMemo(() => {
    return prodotti.find(p => p.nome === (articoloIniziale.nomeProdotto || ordine.nomeProdotto)) || null;
  }, [prodotti, articoloIniziale, ordine]);

  const isTagliaUnica = Boolean(prodottoInfo?.taglia_unica || articoloIniziale.taglia_unica);

  const TAGLIE_DISPONIBILI = useMemo(() => {
    if (isTagliaUnica) return ["Taglia Unica"];

    const lista = (Array.isArray(prodottoInfo?.taglie_disponibili) && prodottoInfo.taglie_disponibili.length > 0)
      ? [...prodottoInfo.taglie_disponibili]
      : (Array.isArray(articoloIniziale?.taglie_disponibili) && articoloIniziale.taglie_disponibili.length > 0)
        ? [...articoloIniziale.taglie_disponibili]
        : [...TAGLIE_DEFAULT];

    // Salvaguarda la taglia attualmente ordinata nel caso non rientrasse nel nuovo range
    const tagliaCorrente = articoloIniziale.taglia || ordine.taglia;
    if (tagliaCorrente && tagliaCorrente !== "Taglia Unica" && !lista.includes(tagliaCorrente)) {
      lista.unshift(tagliaCorrente);
    }

    return lista;
  }, [prodottoInfo, articoloIniziale, ordine, isTagliaUnica]);

  const [atletiDisponibili, setAtletiDisponibili] = useState(listaAtleti);
  const [atletaSelezionato, setAtletaSelezionato] = useState(
    articoloIniziale.atleta || ordine.atleta || ''
  );
  const [tagliaSelezionata, setTagliaSelezionata] = useState(
    isTagliaUnica ? "Taglia Unica" : (articoloIniziale.taglia || ordine.taglia || TAGLIE_DISPONIBILI[0])
  );
  const [nomePersonalizzato, setNomePersonalizzato] = useState(
    articoloIniziale.nomePersonalizzato || ordine.nomePersonalizzato || ''
  );
  const [numeroPersonalizzato, setNumeroPersonalizzato] = useState(
    articoloIniziale.numeroPersonalizzato !== undefined && articoloIniziale.numeroPersonalizzato !== null
      ? String(articoloIniziale.numeroPersonalizzato)
      : (ordine.numeroPersonalizzato !== undefined && ordine.numeroPersonalizzato !== null ? String(ordine.numeroPersonalizzato) : '')
  );
  const [colorePersonalizzato, setColorePersonalizzato] = useState(
    articoloIniziale.colorePersonalizzato || ordine.colorePersonalizzato || 'BIANCA'
  );

  useEffect(() => {
    async function recuperaProfiliAcquirente() {
      const targetUserId = ordine.utente_id || articoloIniziale.utenteIdPadre;
      if (!targetUserId) return;

      try {
        const snap = await getDoc(doc(db, "utenti", targetUserId));
        if (snap.exists()) {
          const dati = snap.data();
          const settore = (ordine.disciplina || 'pallanuoto').toLowerCase();
          const atletiTrovati = settore === 'nuoto' 
            ? (dati.atleti_nuoto || []) 
            : (dati.atleti_pallanuoto || dati.atleti || []);

          if (atletiTrovati.length > 0) {
            setAtletiDisponibili(atletiTrovati);
          }
        }
      } catch (err) {
        console.error("Errore recupero profili acquirente:", err);
      }
    }
    recuperaProfiliAcquirente();
  }, [ordine, articoloIniziale]);

  const haNome = Boolean(prodottoInfo?.personalizzabile_nome ?? articoloIniziale.nomePersonalizzato);
  const haNumero = Boolean(prodottoInfo?.personalizzabile_numero ?? (articoloIniziale.numeroPersonalizzato !== undefined && articoloIniziale.numeroPersonalizzato !== null));
  const haColore = Boolean(prodottoInfo?.personalizzabile_colore ?? articoloIniziale.colorePersonalizzato);

  const opzioniProfili = useMemo(() => {
    const list = atletiDisponibili.map(a => {
      const nomeCompleto = typeof a === 'object' 
        ? `${a.nome || ''} ${a.cognome || ''}`.trim() 
        : String(a).trim();
      const categoria = typeof a === 'object' ? a.categoria : '';
      return { nomeCompleto, categoria };
    });

    const nomeAttuale = (articoloIniziale.atleta || ordine.atleta || '').trim();
    if (nomeAttuale && !list.some(item => item.nomeCompleto.toLowerCase() === nomeAttuale.toLowerCase())) {
      list.unshift({ nomeCompleto: nomeAttuale, categoria: ordine.categoria || 'Attuale' });
    }
    return list;
  }, [atletiDisponibili, articoloIniziale, ordine]);

  const categoriaCorrente = useMemo(() => {
    const profilo = opzioniProfili.find(p => p.nomeCompleto.toLowerCase() === atletaSelezionato.toLowerCase());
    return profilo?.categoria || ordine.categoria || 'Extra';
  }, [opzioniProfili, atletaSelezionato, ordine]);

  // LOGICA CALOTTA: Verifica Numero e conseguente Colore
  const numInt = parseInt(numeroPersonalizzato, 10);
  const haNumeroValido = !isNaN(numInt) && numeroPersonalizzato !== '';
  const isU14oU18 = categoriaCorrente === 'U14' || categoriaCorrente === 'U18';

  const isPortiereRossoObbligatorio = haNumeroValido && (numInt === 1 || (numInt === 13 && !isU14oU18));
  const isRossoConsentito = !haNumeroValido || isPortiereRossoObbligatorio || (numInt === 13 && isU14oU18);

  const opzioniColoriDisponibili = useMemo(() => {
    if (isPortiereRossoObbligatorio) return ["ROSSA"];
    if (isRossoConsentito) return ["BIANCA", "NERA", "ROSSA"];
    return ["BIANCA", "NERA"];
  }, [isPortiereRossoObbligatorio, isRossoConsentito]);

  const handleCambioNumero = (n) => {
    setNumeroPersonalizzato(n);
    const num = parseInt(n, 10);
    const valido = !isNaN(num) && n !== '';

    if (valido && (num === 1 || (num === 13 && !isU14oU18))) {
      setColorePersonalizzato('ROSSA');
    } else if (colorePersonalizzato === 'ROSSA' && (!valido || (num !== 13 && isU14oU18) || (num !== 1 && num !== 13))) {
      setColorePersonalizzato('BIANCA');
    }
  };

  const handleSalva = () => {
    let coloreEffettivo = colorePersonalizzato;
    if (isPortiereRossoObbligatorio) coloreEffettivo = 'ROSSA';
    else if (!isRossoConsentito && coloreEffettivo === 'ROSSA') coloreEffettivo = 'BIANCA';

    const articoliAggiornati = (ordine.articoli && ordine.articoli.length > 0 ? ordine.articoli : [ordine]).map(art => ({
      ...art,
      atleta: atletaSelezionato,
      categoria: categoriaCorrente,
      taglia: isTagliaUnica ? "Taglia Unica" : tagliaSelezionata,
      nomePersonalizzato: haNome ? nomePersonalizzato.toUpperCase().trim() : null,
      numeroPersonalizzato: haNumero && numeroPersonalizzato !== '' ? numeroPersonalizzato : null,
      colorePersonalizzato: haColore ? coloreEffettivo : null
    }));

    onSalva(ordine.id, articoliAggiornati);
  };

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002b80] flex items-center justify-center text-sm shadow-2xs">
              <FontAwesomeIcon icon={faPenToSquare} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                Modifica Ordine
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                Personalizzazioni e Taglie Capi
              </h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon icon={faReceipt} className="text-[#002b80] text-sm" />
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {articoloIniziale.nomeProdotto || ordine.nomeProdotto}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-black text-[#002b80] tabular-nums">
              €{Number(articoloIniziale.prezzo || ordine.prezzo || ordine.totale || 0).toFixed(2)}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                Profilo Assegnato
              </label>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                Clicca per cambiare
              </span>
            </div>
            <select
              value={atletaSelezionato}
              onChange={e => setAtletaSelezionato(e.target.value)}
              className="w-full h-11 bg-white border-2 border-slate-200 hover:border-[#002b80] focus:border-[#002b80] rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
            >
              {opzioniProfili.map((p, idx) => (
                <option key={`${p.nomeCompleto}-${idx}`} value={p.nomeCompleto}>
                  {p.nomeCompleto} {p.categoria ? `(${p.categoria})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
              Taglia
            </label>
            {isTagliaUnica ? (
              <div className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-3 text-xs font-black text-slate-700 flex items-center">
                Taglia Unica
              </div>
            ) : (
              <select
                value={tagliaSelezionata}
                onChange={e => setTagliaSelezionata(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
              >
                {TAGLIE_DISPONIBILI.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          {(haNome || haNumero || haColore) && (
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                Personalizzazioni Articolo
              </span>

              {haNome && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    Nome Stampa (Max 15 caratteri)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={nomePersonalizzato}
                    onChange={e => setNomePersonalizzato(e.target.value.toUpperCase())}
                    placeholder="ES. ROSSI"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#002b80]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {haNumero && (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Numero Calotta
                    </label>
                    <select
                      value={numeroPersonalizzato}
                      onChange={e => handleCambioNumero(e.target.value)}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
                    >
                      <option value="">Nessun numero</option>
                      {NUMERI.map(n => (
                        <option key={n} value={n}>N° {n}</option>
                      ))}
                    </select>
                  </div>
                )}

                {haColore && (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Colore Calotta
                    </label>
                    <div className="relative">
                      <select
                        value={isPortiereRossoObbligatorio ? 'ROSSA' : colorePersonalizzato}
                        disabled={isPortiereRossoObbligatorio}
                        onChange={e => setColorePersonalizzato(e.target.value)}
                        className={`w-full h-11 border rounded-xl px-2.5 text-xs sm:text-sm font-black cursor-pointer focus:outline-none ${
                          isPortiereRossoObbligatorio
                            ? 'bg-amber-50 text-red-700 border-amber-300 font-extrabold pr-7'
                            : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-[#002b80]'
                        }`}
                      >
                        {opzioniColoriDisponibili.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {isPortiereRossoObbligatorio && (
                        <FontAwesomeIcon 
                          icon={faLock} 
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-600 text-xs pointer-events-none" 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="pt-3.5 mt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleSalva}
            className="w-full h-12 bg-[#002b80] hover:bg-[#002060] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center cursor-pointer text-center"
          >
            Salva Modifiche
          </button>
        </div>

      </div>
    </div>
  );
}