/**
 * Model: Prova Prática
 * Placeholder / Stub for the second conversion model.
 * Business rules will be defined and implemented in a future phase.
 */

export const ProvaPraticaModel = {
  id: 'prova-pratica',
  name: 'Prova Prática',
  description: 'Consolidação de microdados e critérios específicos para avaliação de provas práticas (Em breve).',
  badge: 'Em Breve',
  enabled: false,

  fileRoles: {},

  identifyFileRole() {
    return null;
  },

  process() {
    throw new Error('O modelo Prova Prática ainda não foi implementado. As regras de negócio serão especificadas na próxima fase.');
  }
};
