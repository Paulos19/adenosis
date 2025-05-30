// src/lib/mail.ts
import nodemailer from "nodemailer";

// Configuração do transporter do Nodemailer usando as novas variáveis de ambiente
const smtpConfig = {
  host: process.env.EMAIL_SERVER_HOST, // smtp.gmail.com
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"), // 587
  // A opção 'secure' é true se a conexão for SSL/TLS (normalmente na porta 465).
  // Para a porta 587, 'secure' é false, pois o Nodemailer usará STARTTLS automaticamente.
  // O valor de process.env.EMAIL_SERVER_SECURE (string 'false') será convertido para booleano.
  secure: process.env.EMAIL_SERVER_SECURE === 'true', // false para porta 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER_MAIL,        // paulohenrique.012araujo@gmail.com
    pass: process.env.EMAIL_SERVER_APP_PASSWORD, // hpwb yveu rzce ejvt (App Password)
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string; // Tornar 'from' opcional aqui, pois podemos definir um padrão
}

export const sendMail = async ({ to, subject, html, from }: MailOptions) => {
  // Define um remetente padrão se não for fornecido, usando o email do usuário ou um genérico.
  // Para o Gmail, o remetente (from) geralmente precisa ser o mesmo que o 'user' na autenticação
  // ou um alias configurado na conta do Gmail.
  const mailFrom = from || process.env.EMAIL_FROM || `"Adenosis Livraria" <${process.env.EMAIL_USER_MAIL}>`;

  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to: to,
      subject: subject,
      html: html,
    });
    console.log("Email enviado com sucesso: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    // Lançar o erro para que a chamada da função possa tratá-lo se necessário
    throw new Error(`Não foi possível enviar o email. Erro: ${error instanceof Error ? error.message : String(error)}`);
  }
};