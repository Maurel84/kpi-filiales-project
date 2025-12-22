import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Loader2, ShieldCheck, Building2 } from 'lucide-react';
import logoUrl from '../../assets/tractafric-logo.svg';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou mot de passe incorrect');
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] bottom-[-8rem] h-[32rem] w-[32rem] rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-amber-950/70 text-white p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-lg">
                <img src={logoUrl} alt="Tractafric Equipment" className="h-7 w-auto" />
              </div>
              <div>
                <p className="pill bg-white/10 text-amber-100 border border-white/10">Nouveau Design</p>
                <h1 className="text-3xl font-bold mt-2 leading-tight">Application Multi-Filiales</h1>
              </div>
            </div>
            <p className="text-slate-100/90 leading-relaxed">
              Pilotage unifié des filiales, KPIs, stocks et ventes dans une expérience premium.
              Authentifiez-vous pour retrouver vos tableaux de bord en temps réel.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-3 backdrop-blur">
                <ShieldCheck className="h-5 w-5 text-amber-300 mt-1" />
                <div>
                  <p className="font-semibold text-white">Sécurisé</p>
                  <p className="text-sm text-slate-100/80">Connexion chiffrée et profils valides.</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-3 backdrop-blur">
                <Building2 className="h-5 w-5 text-yellow-300 mt-1" />
                <div>
                  <p className="font-semibold text-white">Filiales en direct</p>
                  <p className="text-sm text-slate-100/80">Vue croisée siège et filiales.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-amber-50 to-transparent pointer-events-none" />
            <div className="relative space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Accès sécurisé</p>
                  <h2 className="text-2xl font-bold text-slate-900">Connexion</h2>
                  <p className="text-sm text-slate-500 mt-1">Reprenez vos opérations en quelques secondes.</p>
                </div>
                <div className="pill bg-amber-50 text-amber-700 border border-amber-100">
                  <LogIn className="w-4 h-4" />
                  SSO ready
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email professionnel
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-100 transition">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="votre.email@entreprise.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Mot de passe
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-100 transition">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="********"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-amber-600 hover:to-yellow-700 transition shadow-lg shadow-amber-900/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Se connecter
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-sm text-slate-500">
                <p>Support 24/7 et monitoring des rôles siège et filiales.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
