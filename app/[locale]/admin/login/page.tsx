// app/[locale]/admin/login/page.tsx
// ---------------------------------------------------------------------------
// Página de Login da área administrativa (Credentials - NextAuth).
// - Client Component para chamar signIn('credentials').
// - Exibe erros amigáveis enviados pelo NextAuth (?error=...).
// - Pós-login: redireciona para callbackUrl (se houver) ou para "/{locale}".
// - Caminho exato: app/[locale]/admin/login/page.tsx
// ---------------------------------------------------------------------------

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

type Params = { locale: string };
type Credentials = { email: string; password: string };

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams() as unknown as Params;
  const search = useSearchParams();

  const locale = params?.locale || 'fi';

  const [form, setForm] = useState<Credentials>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const err = search.get('error');
    if (err) setMessage(mapError(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mapError(code: string): string {
    switch (code) {
      case 'CredentialsSignin':
        return 'E-mail ou senha inválidos.';
      case 'OAuthAccountNotLinked':
        return 'Conta já existe com outro método de login.';
      default:
        return 'Não foi possível iniciar sessão. Tente novamente.';
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false
      });

      if (res?.error) {
        setMessage(mapError(res.error));
      } else {
        const cb = search.get('callbackUrl');
        router.push(cb || `/${locale}/admin`);
      }
    } catch {
      setMessage('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Área administrativa</h1>
        <p className="text-sm text-gray-600">
          Faça login com suas credenciais para acessar o painel.
        </p>
      </div>

      {/* Erro (se existir) */}
      {message && (
        <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none"
            placeholder="admin@local"
            aria-label="Digite seu e-mail"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none"
            placeholder="••••••••"
            aria-label="Digite sua senha"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Atalho para Home */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <Link href={`/${locale}`} className="text-blue-600 hover:underline">
          Voltar para a página inicial
        </Link>
      </div>

      {/* Notas técnicas */}
      <div className="mt-8 rounded border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
        <p className="mb-1 font-semibold">Notas técnicas</p>
        <ul className="list-disc pl-5">
          <li>Este arquivo deve ficar em: app/[locale]/admin/login/page.tsx</li>
          <li>NextAuth está com pages.signIn = "/fi/admin/login".</li>
          <li>Após login, usamos callbackUrl (se houver) ou "/{locale}".</li>
        </ul>
      </div>
    </div>
  );
}