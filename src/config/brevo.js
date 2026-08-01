const Brevo = require('@getbrevo/brevo');
const env = require('./env');

const apiInstance = new Brevo.TransactionalEmailsApi();

if (env.BREVO_API_KEY && env.BREVO_API_KEY !== 'MOCK_BREVO_KEY') {
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, env.BREVO_API_KEY);
}

module.exports = {
  apiInstance,
  Brevo
};
