import { createTestAccount } from 'nodemailer';

async function generateTestAccount() {
  try {
    const testAccount = await createTestAccount();
    console.log('\n📧 CREDENCIAIS DE EMAIL PARA TESTE:\n');
    console.log('SMTP Host:', testAccount.smtp.host);
    console.log('SMTP Port:', testAccount.smtp.port);
    console.log('SMTP User:', testAccount.user);
    console.log('SMTP Pass:', testAccount.pass);
    console.log('\n📥 Para ver os emails enviados:');
    console.log(`https://ethereal.email/login`);
    console.log(`Usuário: ${testAccount.user}\n`);
    
    // Gerar .env com as credenciais
    const envContent = `
# Email (Ethereal - Para testes)
SMTP_HOST=${testAccount.smtp.host}
SMTP_PORT=${testAccount.smtp.port}
SMTP_USER=${testAccount.user}
SMTP_PASS=${testAccount.pass}
EMAIL_FROM=noreply@teste.com
`;
    console.log('\n📝 Copie isso para seu .env:\n');
    console.log(envContent);
  } catch (error) {
    console.error('Erro ao gerar credenciais:', error);
  }
}

generateTestAccount();
