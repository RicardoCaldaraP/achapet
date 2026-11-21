/**
 * Envio de e-mails (alertas de novos anúncios) por SMTP, com o Nodemailer.
 *
 * Funciona com qualquer servidor SMTP. O jeito gratuito mais simples é o Gmail
 * com uma "senha de app" (até 500 e-mails por dia). Sem SMTP configurado no .env,
 * o envio é só registrado no log e a aplicação segue funcionando.
 */
import nodemailer from "nodemailer";

export function criarServicoEmail({ config, logger }) {
  const configurado = Boolean(config.SMTP_HOST && config.SMTP_USUARIO && config.SMTP_SENHA);
  let transporte = null;

  return {
    configurado,

    /** Envia um e-mail. Devolve true se foi entregue ao servidor SMTP. */
    async enviar({ para, assunto, texto, html }) {
      if (!configurado) {
        logger?.info({ para, assunto }, "e-mail não enviado: SMTP não configurado");
        return false;
      }
      transporte ??= nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORTA,
        secure: config.SMTP_PORTA === 465,
        auth: { user: config.SMTP_USUARIO, pass: config.SMTP_SENHA },
        // Prazos curtos: a API roda como função serverless e não pode ficar presa no envio.
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      });
      await transporte.sendMail({
        from: config.EMAIL_REMETENTE || `AchaPet <${config.SMTP_USUARIO}>`,
        to: para,
        subject: assunto,
        text: texto,
        html,
      });
      return true;
    },
  };
}
