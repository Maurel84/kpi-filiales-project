import React from 'react'

export const LoginForm: React.FC<{ onLogin: (email:string,password:string)=>Promise<void> }> = ({ onLogin }) => {
  const [email,setEmail] = React.useState('')
  const [password,setPassword] = React.useState('')
  const [loading,setLoading] = React.useState(false)
  const [error,setError] = React.useState<string|null>(null)

  const submit = async (e:React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      await onLogin(email,password)
    } catch (err:any) { setError(err.message || 'Erreur') } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs">Email</label>
        <input className="w-full rounded p-2 bg-slate-800" value={email} onChange={e=>setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="text-xs">Mot de passe</label>
        <input type="password" className="w-full rounded p-2 bg-slate-800" value={password} onChange={e=>setPassword(e.target.value)} required />
      </div>
      {error && <div className="text-rose-400">{error}</div>}
      <button className="bg-indigo-600 px-4 py-2 rounded" type="submit" disabled={loading}>
        {loading? 'Connexion...':'Se connecter'}
      </button>
    </form>
  )
}
