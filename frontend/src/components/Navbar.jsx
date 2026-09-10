import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faWater, 
  faPersonSwimming, 
  faBagShopping, 
  faRightFromBracket,
  faUserGear,
  faChevronDown,
  faReceipt,
  faLayerGroup,
  faBoxesStacked
} from '@fortawesome/free-solid-svg-icons';

export default function Navbar({
  settoreUtente,
  carrelloCount,
  totaleCarrello,
  isUserAdmin,
  inizialiUtente,
  utenteLoggato,
  adminTab,
  onSetAdminTab,
  onApriProfilo,
  onLogout
}) {
  const [menuAperto, setMenuAperto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAperto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#002b80] text-white flex items-center justify-center text-sm sm:text-base shadow-sm shrink-0">
            <FontAwesomeIcon icon={settoreUtente === 'pallanuoto' ? faWater : faPersonSwimming} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight leading-none truncate">
              CNL Shop
            </h1>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#002b80] block mt-0.5 truncate">
              {settoreUtente === 'pallanuoto' ? 'Pallanuoto' : 'Nuoto'}
            </span>
          </div>
        </div>

        {/* TAB ADMIN INTEGRATE AL CENTRO DELLA NAVBAR */}
        {isUserAdmin && onSetAdminTab && (
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => onSetAdminTab('ordini')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                adminTab === 'ordini' ? 'bg-white text-[#002b80] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={faReceipt} className="text-[11px]" />
              <span>Registro Ordini</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAdminTab('categorie')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                adminTab === 'categorie' ? 'bg-white text-[#002b80] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="text-[11px]" />
              <span>Riepilogo Categorie</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAdminTab('catalogo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                adminTab === 'catalogo' ? 'bg-white text-[#002b80] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={faBoxesStacked} className="text-[11px]" />
              <span>Catalogo</span>
            </button>
          </div>
        )}

        {/* Azioni Destra */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isUserAdmin && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl">
              <FontAwesomeIcon icon={faBagShopping} className="text-[#002b80] text-xs sm:text-sm" />
              <span className="text-xs font-black text-slate-900 bg-white px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200">
                {carrelloCount}
              </span>
              <span className="text-xs sm:text-sm font-black text-[#002b80] tabular-nums hidden sm:inline">
                €{totaleCarrello.toFixed(2)}
              </span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuAperto(!menuAperto)}
              className="flex items-center gap-1 p-1 bg-slate-100 hover:bg-slate-200/80 rounded-xl sm:rounded-2xl border border-slate-200 transition-all cursor-pointer focus:outline-none"
              aria-label="Menù profilo"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#002b80] text-white font-black text-xs flex items-center justify-center">
                {inizialiUtente}
              </div>
              <FontAwesomeIcon icon={faChevronDown} className="text-[9px] text-slate-400 pr-1 hidden xs:inline" />
            </button>

            {menuAperto && (
              <div className="absolute right-0 mt-2 w-56 max-w-[85vw] bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-100 space-y-1">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {utenteLoggato?.nome ? `${utenteLoggato.nome} ${utenteLoggato.cognome || ''}` : utenteLoggato?.email}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{utenteLoggato?.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => { setMenuAperto(false); onApriProfilo(); }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={faUserGear} className="text-[#002b80]" />
                  <span>Modifica Profilo</span>
                </button>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMenuAperto(false); onLogout(); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    <span>Disconnetti</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}