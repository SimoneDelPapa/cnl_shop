import { useState, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCartPlus, 
  faShirt, 
  faLock,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';

const TAGLIE = ["6A", "8A", "10A", "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const NUMERI_CALOTTA = Array.from({ length: 15 }, (_, i) => i + 1);

export default function ProdottoCard({
  prodotto,
  onAggiungi,
  listaAtleti = [],
  settoreUtente = 'pallanuoto',
  onZoomFoto
}) {
  const [taglia, setTaglia] = useState(prodotto.taglia_unica ? "Taglia Unica" : "M");
  const [atletaSceltoManualmente, setAtletaSceltoManualmente] = useState(null);
  const [nomePersonalizzato, setNomePersonalizzato] = useState('');
  const [numeroPersonalizzato, setNumeroPersonalizzato] = useState('');
  const [colorePersonalizzato, setColorePersonalizzato] = useState('BIANCA');

  // Controllo validazione: evidenziazione gialla e animazione shake
  const [evidenziaNomeGiallo, setEvidenziaNomeGiallo] = useState(false);
  const [evidenziaNumeroGiallo, setEvidenziaNumeroGiallo] = useState(false);
  const [confermaSenzaPersonalizzazione, setConfermaSenzaPersonalizzazione] = useState(false);
  
  // Ref per tracciare lo stato del click in modo sincrono e immediato
  const confermaRef = useRef(false);

  const isNuoto = settoreUtente === 'nuoto';

  const opzioniAtleti = useMemo(() => {
    return (listaAtleti || []).map(a => {
      const nomeCompleto = typeof a === 'object' ? `${a.nome || ''} ${a.cognome || ''}`.trim() : String(a).trim();
      const categoria = typeof a === 'object' ? (a.categoria || 'Extra') : 'Extra';
      return { nomeCompleto, categoria };
    });
  }, [listaAtleti]);

  const haProfili = opzioniAtleti.length > 0;

  const atletaSelezionato = useMemo(() => {
    if (!haProfili) return '';
    if (atletaSceltoManualmente && opzioniAtleti.some(a => a.nomeCompleto === atletaSceltoManualmente)) {
      return atletaSceltoManualmente;
    }
    return opzioniAtleti[0].nomeCompleto;
  }, [haProfili, atletaSceltoManualmente, opzioniAtleti]);

  const getCategoriaAtleta = (nome) => {
    const atl = opzioniAtleti.find(a => a.nomeCompleto.toLowerCase() === (nome || '').toLowerCase());
    return atl ? atl.categoria : 'Extra';
  };

  const categoriaAtleta = getCategoriaAtleta(atletaSelezionato);
  const numInt = parseInt(numeroPersonalizzato, 10);
  const haNum = !isNaN(numInt) && numeroPersonalizzato !== '';
  const isU14oU18 = categoriaAtleta === 'U14' || categoriaAtleta === 'U18' || categoriaAtleta === 'Baby' || categoriaAtleta === 'Extra';

  const isPortiereRossoObbligatorio = haNum && (numInt === 1 || (numInt === 13 && !isU14oU18));
  const isRossoConsentito = !haNum || isPortiereRossoObbligatorio || (numInt === 13 && isU14oU18);

  const opzioniColori = useMemo(() => {
    if (isPortiereRossoObbligatorio) return ["ROSSA"];
    if (isRossoConsentito) return ["BIANCA", "NERA", "ROSSA"];
    return ["BIANCA", "NERA"];
  }, [isPortiereRossoObbligatorio, isRossoConsentito]);

  const handleCambioNumero = (n) => {
    setNumeroPersonalizzato(n);
    setEvidenziaNumeroGiallo(false);
    confermaRef.current = false;
    setConfermaSenzaPersonalizzazione(false);

    const num = parseInt(n, 10);
    const valido = !isNaN(num) && n !== '';

    if (valido && (num === 1 || (num === 13 && !isU14oU18))) {
      setColorePersonalizzato('ROSSA');
    } else if (colorePersonalizzato === 'ROSSA' && (!valido || (num !== 13 && isU14oU18) || (num !== 1 && num !== 13))) {
      setColorePersonalizzato('BIANCA');
    }
  };

  const handleCambioNome = (val) => {
    setNomePersonalizzato(val.toUpperCase());
    setEvidenziaNomeGiallo(false);
    confermaRef.current = false;
    setConfermaSenzaPersonalizzazione(false);
  };

  const handleAggiungi = () => {
    if (!haProfili || !atletaSelezionato) return;

    // Se siamo nel nuoto, non ci sono personalizzazioni da validare
    const mancaNome = !isNuoto && Boolean(prodotto.personalizzabile_nome && !nomePersonalizzato.trim());
    const mancaNumero = !isNuoto && Boolean(prodotto.personalizzabile_numero && !numeroPersonalizzato);

    // 1° CLICK: se mancano campi e l'utente NON ha ancora cliccato per confermare
    if ((mancaNome || mancaNumero) && !confermaRef.current) {
      if (mancaNome) setEvidenziaNomeGiallo(true);
      if (mancaNumero) setEvidenziaNumeroGiallo(true);

      confermaRef.current = true;
      setConfermaSenzaPersonalizzazione(true);
      return;
    }

    // 2° CLICK: confermaRef è true, procede all'aggiunta senza bloccare
    let coloreFinale = colorePersonalizzato;
    if (isPortiereRossoObbligatorio) coloreFinale = 'ROSSA';
    else if (!isRossoConsentito && coloreFinale === 'ROSSA') coloreFinale = 'BIANCA';

    onAggiungi({
      idUnivoco: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      prodottoId: prodotto.id,
      nomeProdotto: prodotto.nome,
      prezzo: Number(prodotto.prezzo || 0),
      taglia: prodotto.taglia_unica ? "Taglia Unica" : taglia,
      taglia_unica: Boolean(prodotto.taglia_unica),
      atleta: atletaSelezionato,
      categoria: categoriaAtleta,
      immagine_url: prodotto.immagine_url || null,
      nomePersonalizzato: !isNuoto && prodotto.personalizzabile_nome && nomePersonalizzato.trim() 
        ? nomePersonalizzato.trim().toUpperCase().slice(0, 15) 
        : null,
      numeroPersonalizzato: !isNuoto && prodotto.personalizzabile_numero && numeroPersonalizzato !== '' 
        ? numeroPersonalizzato 
        : null,
      colorePersonalizzato: !isNuoto && prodotto.personalizzabile_colore ? coloreFinale : null
    });

    // Reset immediato
    setNomePersonalizzato('');
    setNumeroPersonalizzato('');
    setColorePersonalizzato('BIANCA');
    setEvidenziaNomeGiallo(false);
    setEvidenziaNumeroGiallo(false);
    confermaRef.current = false;
    setConfermaSenzaPersonalizzazione(false);
  };

  return (
    <div className="h-full bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:border-slate-300">
      
      {/* SEZIONE SUPERIORE: Immagine e Intestazione Prodotto */}
      <div className="space-y-3">
        {/* Box Immagine con badge prezzo */}
        <div className="relative w-full">
          <div 
            onClick={() => prodotto.immagine_url && onZoomFoto && onZoomFoto(prodotto.immagine_url, prodotto.nome)}
            className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-center overflow-hidden cursor-zoom-in group"
            title="Clicca per ingrandire"
          >
            {prodotto.immagine_url ? (
              <img 
                src={prodotto.immagine_url} 
                alt={prodotto.nome} 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="text-slate-300 flex flex-col items-center justify-center gap-1">
                <FontAwesomeIcon icon={faShirt} className="text-3xl" />
                <span className="text-[10px] font-black uppercase text-slate-400">Nessuna Foto</span>
              </div>
            )}
          </div>

          <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-200 text-[#002b80] font-black text-sm px-3 py-1 rounded-xl shadow-2xs tabular-nums">
            €{Number(prodotto.prezzo || 0).toFixed(2)}
          </span>
        </div>

        {/* Titolo e Formato (Altezza fissa min-h per allineamento tra card) */}
        <div className="min-h-[46px]">
          <h3 className="text-base font-black text-slate-900 leading-tight">
            {prodotto.nome}
          </h3>
          <span className="text-xs font-semibold text-slate-400 block mt-0.5">
            {prodotto.taglia_unica ? "Formato Taglia Unica" : "Varie Taglie (6A-5XL)"}
          </span>
        </div>
      </div>

      {/* SEZIONE CENTRALE: Configurazione */}
      <div className="space-y-3 pt-2 border-t border-slate-100 flex-1 flex flex-col justify-start">
        
        {/* ASSEGNA A PROFILO */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
            ASSEGNA A PROFILO:
          </label>
          {haProfili ? (
            <select
              value={atletaSelezionato}
              onChange={e => setAtletaSceltoManualmente(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer"
            >
              {opzioniAtleti.map((atl, i) => (
                <option key={i} value={atl.nomeCompleto}>
                  {atl.nomeCompleto} ({atl.categoria})
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900">
              <span className="text-[11px] font-bold leading-tight">
                Crea prima un profilo nella barra in alto
              </span>
            </div>
          )}
        </div>

        {/* Selezione Taglia */}
        {!prodotto.taglia_unica && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
              TAGLIA:
            </label>
            <select
              disabled={!haProfili}
              value={taglia}
              onChange={e => setTaglia(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-[#002b80] cursor-pointer disabled:opacity-50"
            >
              {TAGLIE.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* PERSONALIZZAZIONI CAPO (Disabilitate interamente nel nuoto) */}
        {!isNuoto && (prodotto.personalizzabile_nome || prodotto.personalizzabile_numero || prodotto.personalizzabile_colore) && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
              PERSONALIZZAZIONI CAPO
            </span>

            {/* Nome Stampato: evidenziazione gialla e shake al 1° tentativo */}
            {prodotto.personalizzabile_nome && (
              <div className="relative">
                <input
                  type="text"
                  disabled={!haProfili}
                  maxLength={15}
                  placeholder="NOME STAMPATO"
                  value={nomePersonalizzato}
                  onChange={e => handleCambioNome(e.target.value)}
                  className={`w-full h-11 border rounded-xl pl-3 pr-12 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-bold focus:outline-none disabled:opacity-50 transition-colors ${
                    evidenziaNomeGiallo
                      ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/50 animate-[shake_0.4s_ease-in-out]'
                      : 'bg-slate-50 border-slate-200 focus:border-[#002b80]'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                  {nomePersonalizzato.length}/15
                </span>
              </div>
            )}

            {/* Numero e Colore Calotta: evidenziazione gialla e shake al 1° tentativo */}
            {(prodotto.personalizzabile_numero || prodotto.personalizzabile_colore) && (
              <div className="grid grid-cols-2 gap-2">
                {prodotto.personalizzabile_numero && (
                  <select
                    disabled={!haProfili}
                    value={numeroPersonalizzato}
                    onChange={e => handleCambioNumero(e.target.value)}
                    className={`w-full h-11 border rounded-xl px-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none disabled:opacity-50 transition-colors cursor-pointer ${
                      evidenziaNumeroGiallo
                        ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/50 animate-[shake_0.4s_ease-in-out]'
                        : 'bg-slate-50 border-slate-200 focus:border-[#002b80]'
                    }`}
                  >
                    <option value="">N° Calotta</option>
                    {NUMERI_CALOTTA.map(n => (
                      <option key={n} value={n}>N° {n}</option>
                    ))}
                  </select>
                )}

                {prodotto.personalizzabile_colore && (
                  <div className="relative">
                    <select
                      disabled={!haProfili || isPortiereRossoObbligatorio}
                      value={isPortiereRossoObbligatorio ? 'ROSSA' : colorePersonalizzato}
                      onChange={e => setColorePersonalizzato(e.target.value)}
                      className={`w-full h-11 border rounded-xl px-2.5 text-xs sm:text-sm font-black cursor-pointer focus:outline-none disabled:opacity-75 ${
                        isPortiereRossoObbligatorio
                          ? 'bg-amber-50 text-red-700 border-amber-300 font-extrabold pr-6'
                          : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-[#002b80]'
                      }`}
                    >
                      {opzioniColori.map(c => (
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
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* SEZIONE INFERIORE: Tasto Aggiungi al Carrello */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!haProfili}
          onClick={handleAggiungi}
          className={`w-full h-12 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 ${
            !haProfili
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              : confermaSenzaPersonalizzazione
              ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white cursor-pointer'
              : 'bg-[#002b80] hover:bg-[#002060] active:scale-[0.98] text-white cursor-pointer'
          }`}
        >
          <FontAwesomeIcon icon={!haProfili ? faLock : confermaSenzaPersonalizzazione ? faTriangleExclamation : faCartPlus} />
          <span>
            {!haProfili 
              ? "Crea Profilo per Ordinare" 
              : confermaSenzaPersonalizzazione 
              ? "Conferma senza personalizzazione" 
              : "Aggiungi al Carrello"}
          </span>
        </button>
      </div>

    </div>
  );
}