import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCartShopping, 
  faRightFromBracket, 
  faClipboardList, 
  faTags, 
  faBoxesStacked,
  faBars, 
  faXmark,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export default function Navbar({
  settoreUtente = 'pallanuoto',
  onCambiaSettore,
  mostraSelettoreSettore = true,
  sollecitiPerSettore = { pallanuoto: false, nuoto: false },
  carrelloCount = 0,
  totaleCarrello = 0,
  isUserAdmin = false,
  inizialiUtente = 'CN',
  adminTab = 'ordini',
  onSetAdminTab,
  onApriCarrello,
  onApriProfilo,
  onLogout
}) {
  const [mobileMenuAperto, setMobileMenuAperto] = useState(false);

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex flex-nowrap items-center justify-between gap-2 sm:gap-4">
          
          {/* BRAND LOGO */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <img 
              src="/cnl_shop.png" 
              alt="CNL Shop" 
              className="h-10 sm:h-12 w-10 sm:w-12 object-contain shrink-0 select-none pointer-events-none rounded-2xl shadow-xs"
            />
            <div className="hidden md:flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                  CNL Shop
                </span>
                {isUserAdmin && (
                  <span className="bg-slate-100 text-[#002b80] text-[10px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                    STAFF
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SELETTORE DISCIPLINA */}
          {mostraSelettoreSettore && (
            <div className="flex items-center h-10 sm:h-11 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => onCambiaSettore('pallanuoto')}
                className={`relative h-full px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  settoreUtente === 'pallanuoto'
                    ? 'bg-white text-[#002b80] shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Pallanuoto</span>
                {sollecitiPerSettore.pallanuoto && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-2 ring-white shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onCambiaSettore('nuoto')}
                className={`relative h-full px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  settoreUtente === 'nuoto'
                    ? 'bg-white text-[#002b80] shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Nuoto</span>
                {sollecitiPerSettore.nuoto && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-2 ring-white shrink-0" />
                )}
              </button>
            </div>
          )}

          {/* TAB ADMIN DESKTOP */}
          {isUserAdmin && (
            <div className="hidden lg:flex items-center h-11 p-1 bg-slate-100 rounded-2xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onSetAdminTab('ordini')}
                className={`h-full px-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  adminTab === 'ordini' ? 'bg-white text-[#002b80] font-black shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faClipboardList} className="text-sm" />
                <span>Ordini</span>
              </button>

              <button
                type="button"
                onClick={() => onSetAdminTab('categorie')}
                className={`h-full px-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  adminTab === 'categorie' ? 'bg-white text-[#002b80] font-black shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faTags} className="text-sm" />
                <span>Categorie</span>
              </button>

              <button
                type="button"
                onClick={() => onSetAdminTab('catalogo')}
                className={`h-full px-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  adminTab === 'catalogo' ? 'bg-white text-[#002b80] font-black shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faBoxesStacked} className="text-sm" />
                <span>Catalogo</span>
              </button>
            </div>
          )}

          {/* AZIONI TOP BAR */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* CARRELLO: SEMPRE FUORI ANCHE DA MOBILE */}
            {!isUserAdmin && (
              <button
                type="button"
                onClick={onApriCarrello}
                className="h-10 sm:h-11 px-3 sm:px-3.5 bg-blue-50 hover:bg-blue-100 text-[#002b80] border border-blue-200 rounded-2xl flex items-center gap-2 transition-all cursor-pointer shrink-0"
                title="Carrello"
              >
                <div className="relative flex items-center justify-center">
                  <FontAwesomeIcon icon={faCartShopping} className="text-base" />
                  {carrelloCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[1.15rem] h-[1.15rem] px-1 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-xs">
                      {carrelloCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline font-black text-sm tabular-nums">
                  €{Number(totaleCarrello || 0).toFixed(2)}
                </span>
              </button>
            )}

            {/* AVATAR DESKTOP */}
            <button
              type="button"
              onClick={onApriProfilo}
              className="hidden sm:flex w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl text-sm font-black items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Profilo"
            >
              {inizialiUtente}
            </button>

            {/* LOGOUT DESKTOP */}
            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:flex w-11 h-11 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl items-center justify-center text-base transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Disconnetti"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
            </button>

            {/* HAMBURGER TRIGGER MOBILE */}
            <button
              type="button"
              onClick={() => setMobileMenuAperto(!mobileMenuAperto)}
              className="sm:hidden w-10 h-10 bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl flex items-center justify-center text-base cursor-pointer shrink-0"
              aria-label="Menu"
            >
              <FontAwesomeIcon icon={mobileMenuAperto ? faXmark : faBars} />
            </button>

          </div>

        </div>

        {/* DRAWER MENU MOBILE CON HEADER CARD PROFILO RIVISITATA */}
        {mobileMenuAperto && (
          <div className="sm:hidden py-3.5 border-t border-slate-100 flex flex-col gap-2 animate-in slide-in-from-top-1">
            
            {/* PROFILE HEADER CARD (UX RIVISITATA SENZA TASTO APRI) */}
            <div
              onClick={() => { onApriProfilo(); setMobileMenuAperto(false); }}
              className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 hover:from-blue-50/60 hover:to-blue-100/50 border border-slate-200/90 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#002b80] text-white flex items-center justify-center text-sm font-black shrink-0 shadow-2xs">
                  {inizialiUtente}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Account Connesso
                  </span>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    Il Tuo Profilo
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 pr-1">
                <span className="text-[11px] font-bold text-[#002b80]">Modifica</span>
                <FontAwesomeIcon icon={faChevronRight} className="text-xs text-slate-400" />
              </div>
            </div>

            {/* TAB STAFF MOBILE SE ADMIN */}
            {isUserAdmin && (
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => { onSetAdminTab('ordini'); setMobileMenuAperto(false); }}
                  className={`w-full h-11 px-3.5 rounded-xl text-xs font-black flex items-center gap-3 transition-colors ${
                    adminTab === 'ordini' ? 'bg-blue-50 text-[#002b80]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="text-sm w-4" />
                  <span>Registro Ordini</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onSetAdminTab('categorie'); setMobileMenuAperto(false); }}
                  className={`w-full h-11 px-3.5 rounded-xl text-xs font-black flex items-center gap-3 transition-colors ${
                    adminTab === 'categorie' ? 'bg-blue-50 text-[#002b80]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FontAwesomeIcon icon={faTags} className="text-sm w-4" />
                  <span>Riepilogo Categorie</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onSetAdminTab('catalogo'); setMobileMenuAperto(false); }}
                  className={`w-full h-11 px-3.5 rounded-xl text-xs font-black flex items-center gap-3 transition-colors ${
                    adminTab === 'catalogo' ? 'bg-blue-50 text-[#002b80]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FontAwesomeIcon icon={faBoxesStacked} className="text-sm w-4" />
                  <span>Gestione Catalogo</span>
                </button>
              </div>
            )}

            {/* TASTO LOGOUT */}
            <button
              type="button"
              onClick={() => { setMobileMenuAperto(false); onLogout(); }}
              className="w-full h-11 px-3.5 rounded-xl text-xs font-black flex items-center gap-3 bg-red-50 text-red-600 border border-red-200 mt-1 cursor-pointer"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="text-sm w-4" />
              <span>Disconnetti</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
}