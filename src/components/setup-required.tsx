import { Card, Notice } from "@/components/ui";

/** Exibido quando as variáveis de ambiente obrigatórias não estão configuradas. */
export function SetupRequired() {
  return (
    <Card className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Configuração incompleta</h1>
      <p className="mt-2 text-sm text-muted">
        Este aplicativo não usa dados de exemplo. Ele precisa da conexão com o banco e do segredo de autenticação.
        Veja a seção &ldquo;Variáveis de ambiente&rdquo; do README.
      </p>
      <div className="mt-4">
        <Notice kind="info">
          Variáveis necessárias: <code>DATABASE_URL</code> e <code>BETTER_AUTH_SECRET</code>.
        </Notice>
      </div>
    </Card>
  );
}
