import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export default function LightboxModal({ src, alt, onClose }) {
  useEffect(() => {
    // Blocca lo scroll del background
    const overflowOriginale = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowOriginale;
    };
  }, []);

  if (!src) return null;

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl max-h-[85vh] bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <img 
          src={src} 
          alt={alt || "Foto ingrandita"} 
          className="max-h-[75vh] w-auto object-contain rounded-2xl"
        />
        {alt && (
          <p className="mt-3 text-sm font-black text-slate-800 text-center truncate max-w-md">
            {alt}
          </p>
        )}
      </div>
    </div>
  );
}