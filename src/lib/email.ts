import "server-only";

/**
 * Envio de e-mails (recuperação de senha). Usa a API do Resend se RESEND_API_KEY existir.
 * Sem a chave, o conteúdo é registrado no console do servidor (apenas para desenvolvimento).
 */
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY não configurada. E-mail para ${input.to}: ${input.subject}\n${input.html}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Desafio Fitness <onboarding@resend.dev>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao enviar e-mail (${res.status}).`);
}
