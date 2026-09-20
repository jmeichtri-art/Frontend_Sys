'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Forklift, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      router.push('/sales');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[hsl(var(--sidebar))] p-12 relative overflow-hidden">
        {/* Background decorative element */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border-[40px] border-white" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full border-[30px] border-white" />
        </div>
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Forklift size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-extrabold text-xl tracking-[0.1em]">FORKBUILDER</div>
            <div className="text-white/40 text-xs tracking-[0.12em]">Powered by Hecato Origins</div>
          </div>
        </div>

        {/* Main heading */}
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Configurá tu<br />
            <span className="text-primary">autoelevador</span><br />
            ideal.
          </h1>
          <p className="text-white/50 text-lg leading-relaxed max-w-sm">
            Plataforma profesional para la configuración y cotización de maquinaria de elevación taylor-made.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-8">
            {['Configurador Inteligente', 'Cotizaciones Instantáneas', 'Gestión de Ventas'].map((f) => (
              <span key={f} className="bg-white/8 text-white/70 text-xs px-4 py-1.5 rounded-full border border-white/10">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-white/25 text-xs relative z-10">
          © 2025 ForkBuilder · Powered by Hecato Origins. Sistema interno.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Forklift size={18} className="text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-xl tracking-widest">FORKBUILDER</span>
              <span className="text-muted-foreground text-[0.6rem] tracking-[0.1em]">Powered by Hecato Origins</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Bienvenido</h2>
          <p className="text-muted-foreground text-sm mb-8">Ingresá tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-1" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
