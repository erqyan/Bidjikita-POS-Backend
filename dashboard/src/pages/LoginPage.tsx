import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Coffee, Eye, EyeOff, Lock, User } from 'lucide-react';
import { loginApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setApiError('');
    try {
      const res = await loginApi(data.username, data.password);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Username atau password salah');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-transparent" />
        <div className="relative z-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 mx-auto mb-6 shadow-2xl">
            <Coffee className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Bidjikita</h1>
          <p className="text-amber-400 text-lg font-medium mb-4">Admin Dashboard</p>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            Kelola bisnis kopi Anda dengan mudah. Monitor penjualan, stok bahan, dan performa tim secara real-time.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Menu', emoji: '☕' },
              { label: 'Stok', emoji: '📦' },
              { label: 'Analitik', emoji: '📊' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-2xl mb-1">{item.emoji}</p>
                <p className="text-slate-400 text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500">
                <Coffee className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Bidjikita</p>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Selamat Datang</h2>
            <p className="text-gray-500 text-sm mb-8">Masuk ke akun admin Anda</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('username')}
                    type="text"
                    placeholder="Masukkan username"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              {apiError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            © 2024 Bidjikita POS. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}
