import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./components/ui/Card"
import { Button } from "./components/ui/Button"

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true) // true = Login, false = Registrazione
  
  // Stati del form
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  
  // Stati di caricamento ed errore
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrore('')
    setLoading(true)

    if (!isLogin && password !== confermaPassword) {
      setErrore("Le password non coincidono")
      setLoading(false)
      return
    }

    try {
      if (!isLogin) {
        // --- LOGICA REGISTRAZIONE ---
        const response = await fetch('https://cnl-shop-backend.onrender.com/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim(),
            password: password
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || "Errore durante la registrazione")
        }

        alert("Registrazione completata! Ora puoi effettuare l'accesso.")
        setIsLogin(true) // Sposta l'utente sulla schermata di login
        setPassword('')
        setConfermaPassword('')

      } else {
        // --- LOGICA LOGIN ---
        const response = await fetch('https://cnl-shop-backend.onrender.com/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password: password
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || "Email o password errati")
        }

        // Salva il token JWT nella memoria del browser
        localStorage.setItem('token', data.access_token)
        
        // Sblocca l'interfaccia di App.jsx passandogli i dati dell'utente
        onLoginSuccess(data.utente) 
      }
    } catch (err) {
      setErrore(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-3xl shadow-2xl p-2">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-black tracking-wide bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            {isLogin ? 'Bentornato' : 'Crea Account'}
          </CardTitle>
          <p className="text-blue-200/70 text-sm mt-2">
            {isLogin ? 'Accedi per gestire i tuoi ordini' : 'Registrati per accedere al catalogo CNL'}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errore && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
                {errore}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="text-xs text-white/70 font-semibold mb-1 block">Nome e Cognome</label>
                <input 
                  type="text" 
                  required 
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Mario Rossi"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="mario@email.com"
              />
            </div>

            <div>
              <label className="text-xs text-white/70 font-semibold mb-1 block">Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs text-white/70 font-semibold mb-1 block">Conferma Password</label>
                <input 
                  type="password" 
                  required 
                  value={confermaPassword}
                  onChange={e => setConfermaPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="••••••••"
                />
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 py-4 font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all"
            >
              {loading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Registrati')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-white/10 pt-4 mt-2">
          <p className="text-sm text-white/60">
            {isLogin ? "Non hai un account? " : "Hai già un account? "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setErrore('')
              }}
              className="text-blue-400 hover:text-blue-300 font-bold ml-1 transition-colors"
            >
              {isLogin ? 'Registrati' : 'Accedi'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}