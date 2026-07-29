'use client';

import { useState, type FormEvent } from 'react';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, User, Store, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/hooks/useAuth';
import { ApiError } from '@/lib/api';

const features = [
  { text: 'Gestiona pedidos en tiempo real' },
  { text: 'Controla tu inventario y productos' },
  { text: 'Reportes de ventas detallados' },
];

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@tienda.com"
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          />
        </div>
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {loading ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, storeName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1.5">Tu nombre</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input id="reg-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan García"
              className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label htmlFor="reg-store" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de tu tienda</label>
          <div className="relative">
            <Store className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input id="reg-store" type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mi Tienda Online"
              className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent" />
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input id="reg-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@tienda.com"
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {loading ? 'Creando cuenta…' : 'Empieza a vender hoy'}
      </button>
    </form>
  );
}

function LoginPageContent() {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 to-brand-600 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-white" />
          <span className="text-xl font-bold text-white tracking-wide">Go Shopping</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Tu tienda,<br />tu negocio,<br />tu control.
          </h2>
          <p className="text-green-200 text-lg mb-8">Gestiona pedidos, productos y clientes desde un solo lugar.</p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-white/90 text-sm">
                <CheckCircle2 className="h-5 w-5 text-green-300 shrink-0" />
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-green-300 text-xs">© 2026 Go Shopping. Todos los derechos reservados.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <ShoppingBag className="h-6 w-6 text-brand-600" />
            <span className="text-lg font-bold text-brand-600">Go Shopping</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {tab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {tab === 'login' ? 'Ingresa a tu panel de vendedor' : 'Empieza a vender en minutos'}
          </p>

          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-6">
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${tab === t ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {tab === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginPageContent />
    </AuthProvider>
  );
}

