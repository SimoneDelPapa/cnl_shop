import { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/Card"
import { Button } from "./components/ui/Button"
import { Badge } from "./components/ui/Badge"

// --- 1. IMPORTA IL NUOVO COMPONENTE AUTH ---
import Auth from './Auth'

// 1. COMPONENTE PER IL SINGOLO PRODOTTO
function ProdottoCard({ prodotto, onAggiungi }) {
  const [atleta, setAtleta] = useState('')
  const [taglia, setTaglia] = useState('M')
  const [nomePers, setNomePers] = useState('')

  const handleAdd = () => {
    if (!atleta.trim()) {
      alert("Attenzione: Inserisci il nome dell'atleta a cui è destinato il capo.")
      return
    }
    
    onAggiungi({
      idUnivoco: crypto.randomUUID(), 
      prodottoId: prodotto.id,
      nomeProdotto: prodotto.nome,
      prezzo: prodotto.prezzo,
      atleta: atleta.trim(),
      taglia: taglia,
      nomePersonalizzato: prodotto.personalizzabile ? nomePers.trim() : null
    })
    
    setNomePers('')
  }

  return (
    <Card className="flex flex-col justify-between overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:bg-white/10 transition-all duration-300">
      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-lg font-bold tracking-wide text-white/90">{prodotto.nome}</CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center pb-2">
        <span className="text-3xl font-black bg-gradient-to-b from-white to-blue-200 bg-clip-text text-transparent mb-4 drop-shadow">
          €{prodotto.prezzo.toFixed(2)}
        </span>
        
        {prodotto.personalizzabile ? (
          <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm px-3 py-1 font-semibold rounded-full mb-4">
            Personalizzabile
          </Badge>
        ) : (
          <div className="h-[34px] mb-4"></div>
        )}

        <div className="w-full space-y-3 text-left">
          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">Nome Atleta (chi lo indossa)</label>
            <input 
              type="text" 
              value={atleta}
              onChange={e => setAtleta(e.target.value)}
              placeholder="Es. Giulia"
              className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">Taglia</label>
            <select 
              value={taglia}
              onChange={e => setTaglia(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-slate-900 appearance-none"
            >
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </select>
          </div>

          {prodotto.personalizzabile && (
            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Testo Personalizzato</label>
              <input 
                type="text" 
                value={nomePers}
                onChange={e => setNomePers(e.target.value.toUpperCase())}
                placeholder="Es. GIULIA 10"
                className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
              />
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-4">
        <Button onClick={handleAdd} className="w-full font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border border-white/10 shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.5)] transition-all rounded-xl py-5">
          Aggiungi al carrello
        </Button>
      </CardFooter>
    </Card>
  )
}

// 2. APPLICAZIONE PRINCIPALE
export default function App() {
  // --- 2. NUOVO STATO PER L'UTENTE LOGGATO ---
  const [utenteLoggato, setUtenteLoggato] = useState(null)

  const [prodotti, setProdotti] = useState([])
  const [carrello, setCarrello] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState(null)
  const [isCheckout, setIsCheckout] = useState(false) 

  useEffect(() => {
    fetch('https://cnl-shop-backend.onrender.com/api/products')
      .then(res => {
        if (!res.ok) throw new Error("Errore server")
        return res.json()
      })
      .then(data => {
        setProdotti(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("ERRORE DI RETE:", err)
        setErrore("Impossibile collegarsi al backend.")
        setLoading(false)
      })
  }, [])

  const aggiungiAlCarrello = (item) => {
    setCarrello([...carrello, item])
  }

  const rimuoviDalCarrello = (idUnivoco) => {
    setCarrello(carrello.filter(item => item.idUnivoco !== idUnivoco))
  }

  const totaleCarrello = carrello.reduce((acc, item) => acc + item.prezzo, 0)

  const gestisciCheckout = async () => {
    setIsCheckout(true)
    try {
      const response = await fetch('https://cnl-shop-backend.onrender.com/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totale: totaleCarrello,
          carrello: carrello
        }),
      });

      if (!response.ok) throw new Error("Errore durante il salvataggio");
      
      const data = await response.json();
      alert(`✅ Ordine #${data.ordine_id} salvato correttamente nel database!\n\nTotale: €${totaleCarrello.toFixed(2)}`);
      
      setCarrello([]); 
    } catch (error) {
      console.error("Errore:", error);
      alert("❌ Errore di connessione. Verifica che il backend sia acceso.");
    } finally {
      setIsCheckout(false)
    }
  }

  // --- 3. SE L'UTENTE NON E' LOGGATO, MOSTRA IL COMPONENTE AUTH ---
  if (!utenteLoggato) {
    return (
      <div className="font-sans text-white antialiased">
        <Auth onLoginSuccess={(datiUtente) => setUtenteLoggato(datiUtente)} />
      </div>
    )
  }

  // --- 4. SE E' LOGGATO, MOSTRA IL NEGOZIO ---
  return (
    <div className="min-h-screen p-6 md:p-12 font-sans text-white antialiased">
      <header className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] mb-10 text-center relative">
        <h1 className="text-4xl md:text-5xl font-black tracking-wider uppercase bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-sm">
          CNL Shop
        </h1>
        <p className="mt-3 text-blue-200/80 text-lg md:text-xl font-medium">
          Circolo Nuoto Lucca - Ordini Abbigliamento Sportivo
        </p>
        
        {/* Pulsante per fare il Logout */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-center items-center gap-4">
          <p className="text-sm text-white/70">
            Accesso effettuato come <strong className="text-white">{utenteLoggato.email || 'Utente'}</strong>
          </p>
          <button 
            onClick={() => setUtenteLoggato(null)}
            className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 px-3 py-1 rounded-full transition-colors"
          >
            Esci
          </button>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white/90 tracking-wide mb-8 border-b border-white/10 pb-4">Catalogo</h2>
        
        {loading ? (
           <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>
        ) : errore ? (
           <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 p-4 rounded-xl text-red-200">{errore}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {prodotti.map(prodotto => (
              <ProdottoCard key={prodotto.id} prodotto={prodotto} onAggiungi={aggiungiAlCarrello} />
            ))}
          </div>
        )}

        {carrello.length > 0 && (
          <div className="mt-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Il tuo ordine</h2>
            
            <div className="space-y-4 mb-8">
              {carrello.map((item) => (
                <div key={item.idUnivoco} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 border border-white/10 rounded-xl p-4">
                  <div>
                    <h4 className="font-bold text-lg text-blue-100">{item.nomeProdotto}</h4>
                    <p className="text-sm text-white/70">
                      Atleta: <span className="font-semibold text-white">{item.atleta}</span> | Taglia: <span className="font-semibold text-white">{item.taglia}</span>
                    </p>
                    {item.nomePersonalizzato && (
                      <p className="text-sm text-cyan-300 mt-1">Stampa: "{item.nomePersonalizzato}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between">
                    <span className="font-black text-xl">€{item.prezzo.toFixed(2)}</span>
                    <button onClick={() => rimuoviDalCarrello(item.idUnivoco)} className="text-red-400 hover:text-red-300 font-bold text-sm bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-md transition-colors">
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center border-t border-white/10 pt-6 gap-6">
              <div className="text-center md:text-left">
                <p className="text-white/70 font-medium">Totale complessivo</p>
                <p className="text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">€{totaleCarrello.toFixed(2)}</p>
              </div>
              <Button 
                onClick={gestisciCheckout} 
                disabled={isCheckout}
                className="w-full md:w-auto px-10 py-6 text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-green-500/20 transition-all border border-green-400/30 disabled:opacity-50"
              >
                {isCheckout ? "Salvataggio..." : "Procedi al Pagamento"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}