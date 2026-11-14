import "server-only";

/**
 * Envio de e-mails (recuperação de senha). Usa a API do Resend se RESEND_API_KEY existir.
 * Sem a chave, o conteúdo é registrado no console do servidor (apenas para desenvolvimento).
 */
export async function sendEmail(input: { to: string; subject: string; html: string; text?: string }) {
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
      text: input.text,
    }),
  });
  if (!res.ok) {
    // O corpo da resposta diz o motivo (domínio não verificado, chave inválida, destinatário não permitido...).
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend recusou o envio (${res.status}): ${detail}`);
    throw new Error(`Falha ao enviar e-mail (${res.status}).`);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** E-mail de redefinição de senha, com botão e link de reserva (texto puro para clientes sem HTML). */
export function passwordResetEmail(name: string, url: string) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#0b0c0e;font-family:Arial,Helvetica,sans-serif;color:#f4f5f7">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#14161a;border:1px solid #2a2e35;border-radius:16px;padding:32px">
          <tr><td style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c6ff3d">Desafio Fitness</td></tr>
          <tr><td style="padding-top:20px;font-size:20px;font-weight:700">Redefinir sua senha</td></tr>
          <tr><td style="padding-top:12px;font-size:15px;line-height:22px;color:#c9ced6">
            Olá, ${safeName}. Recebemos um pedido para criar uma nova senha na sua conta.
          </td></tr>
          <tr><td style="padding-top:24px">
            <a href="${safeUrl}" style="display:inline-block;background:#c6ff3d;color:#0b0c0e;font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:12px">Criar nova senha</a>
          </td></tr>
          <tr><td style="padding-top:24px;font-size:13px;line-height:20px;color:#8d949f">
            O link expira em 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.
          </td></tr>
          <tr><td style="padding-top:16px;font-size:12px;line-height:18px;color:#8d949f;word-break:break-all">
            Se o botão não funcionar, copie este endereço no navegador:<br><a href="${safeUrl}" style="color:#c6ff3d">${safeUrl}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `Olá, ${name}.\n\nPara criar uma nova senha no Desafio Fitness, abra o link abaixo (expira em 1 hora):\n${url}\n\nSe não foi você, ignore este e-mail.`;
  return { html, text };
}
