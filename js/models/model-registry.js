/**
 * Model Registry
 * Central registry of available conversion models in Consolidador de Macrodados.
 */

import { ProvaObjetivaModel } from './prova-objetiva.js';
import { ProvaPraticaModel } from './prova-pratica.js';

export class ModelRegistry {
  static models = [
    ProvaObjetivaModel,
    ProvaPraticaModel
  ];

  /**
   * Returns all registered models
   */
  static getAllModels() {
    return this.models;
  }

  /**
   * Gets a model by ID
   * @param {string} id 
   */
  static getModelById(id) {
    return this.models.find((m) => m.id === id) || null;
  }

  /**
   * Gets default active model
   */
  static getDefaultModel() {
    return ProvaObjetivaModel;
  }
}
