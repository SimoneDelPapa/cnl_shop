import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export default function LightboxModal({ src, alt, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl max-h-[85vh] bg-white rounded-3xl p-3 shadow-2xl ring-1 ring-slate-900/10 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
          title="Chiudi"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <img 
          src={src} 
          alt={alt} 
          className="max-w-full max-h-[75vh] object-contain rounded-2xl"
        />
        {alt && <p className="mt-2 text-xs font-semibold text-slate-600">{alt}</p>}
      </div>
    </div>
  );
}