// app/[locale]/(admin)/admin/settings/page.tsx
// ============================================================================
// Página de Configurações (Server Component) — Nível PhD
// ----------------------------------------------------------------------------
// Responsabilidades:
// - Atua como o ponto de entrada do lado do servidor para a rota de configurações.
// - Utiliza a função `getSiteSettings` para buscar os dados de configuração
//   iniciais (do cache ou do DB), garantindo um carregamento rápido.
// - Passa esses dados iniciais como uma prop para o `SettingsManagerClient`,
//   que cuidará de toda a interatividade e gerenciamento de estado.
// - Está localizado dentro do grupo de rotas `(admin)`, garantindo que só
//   seja acessível por usuários autenticados via `ProtectedAdminLayout`.
// ============================================================================

import { getSiteSettings } from '@/lib/settings';
import SettingsManagerClient from '@/components/admin/settings/SettingsManagerClient';

export default async function AdminSettingsPage() {
  // Busca os dados iniciais no servidor. Isso é rápido graças ao nosso cache Redis.
  const initialSettings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Configurações do Site</h1>
        <p className="text-sm text-gray-500">
          Gerencie a identidade global e as configurações de SEO do seu site.
        </p>
      </div>
      
      {/* 
        Renderiza o componente de cliente, passando os dados iniciais.
        Toda a lógica de formulário, estado e chamadas de API (PATCH)
        será encapsulada no componente cliente.
      */}
      <SettingsManagerClient initial={initialSettings} />
    </div>
  );
}