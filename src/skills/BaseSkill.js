// ===================================================
// src/skills/BaseSkill.js - Framework para Skills Modulares
// ===================================================

const logger = require('../core/utils/logger');

class BaseSkill {
  constructor(name, description, config = {}) {
    this.name = name;
    this.description = description;
    this.config = config;
    this.enabled = config.enabled !== false;
    this.priority = config.priority || 1;
    this.executionCount = 0;
    this.lastExecuted = null;
    this.successRate = 0;
    this.errors = [];
  }

  /**
   * Determina se esta skill pode processar a mensagem/intent
   * @param {string} intent - Mensagem ou intent do usuário
   * @param {object} context - Contexto da conversa
   * @returns {Promise<boolean>}
   */
  async canHandle(intent, context) {
    throw new Error(`canHandle method must be implemented in ${this.name} skill`);
  }

  /**
   * Executa a skill com os parâmetros fornecidos
   * @param {object} parameters - Parâmetros extraídos da mensagem
   * @param {object} context - Contexto da conversa
   * @returns {Promise<object>} - Resultado da execução
   */
  async execute(parameters, context) {
    throw new Error(`execute method must be implemented in ${this.name} skill`);
  }

  /**
   * Valida os parâmetros antes da execução
   * @param {object} parameters - Parâmetros a serem validados
   * @returns {Promise<object>} - { valid: boolean, errors: string[] }
   */
  async validate(parameters) {
    return { valid: true, errors: [] };
  }

  /**
   * Executa a skill com wrapper de erro e logging
   * @param {object} parameters - Parâmetros
   * @param {object} context - Contexto
   * @returns {Promise<object>}
   */
  async safeExecute(parameters, context) {
    const startTime = Date.now();
    const requestId = context?.activity?.id || `skill-${Date.now()}`;

    try {
      logger.debug(`Executing skill: ${this.name}`, {
        requestId,
        parameters: Object.keys(parameters),
        skillPriority: this.priority
      });

      // Validar parâmetros
      const validation = await this.validate(parameters);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Executar skill
      const result = await this.execute(parameters, context);
      
      // Atualizar estatísticas
      const executionTime = Date.now() - startTime;
      this.updateStats(true, executionTime);

      logger.info(`Skill executed successfully: ${this.name}`, {
        requestId,
        executionTime,
        resultType: typeof result.data
      });

      return {
        success: true,
        data: result.data || result,
        metadata: {
          skill: this.name,
          executionTime,
          timestamp: new Date().toISOString(),
          ...result.metadata
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateStats(false, executionTime, error);

      logger.error(`Skill execution failed: ${this.name}`, {
        requestId,
        error: error.message,
        executionTime
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          skill: this.name,
          executionTime,
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name
        }
      };
    }
  }

  /**
   * Atualiza estatísticas de execução da skill
   * @param {boolean} success - Se a execução foi bem-sucedida
   * @param {number} executionTime - Tempo de execução em ms
   * @param {Error} error - Erro, se houver
   */
  updateStats(success, executionTime, error = null) {
    this.executionCount++;
    this.lastExecuted = new Date().toISOString();

    if (success) {
      this.successRate = (this.successRate * (this.executionCount - 1) + 1) / this.executionCount;
    } else {
      this.successRate = (this.successRate * (this.executionCount - 1)) / this.executionCount;
      
      if (error) {
        this.errors.push({
          timestamp: new Date().toISOString(),
          message: error.message,
          executionTime
        });

        // Manter apenas os últimos 10 erros
        if (this.errors.length > 10) {
          this.errors.shift();
        }
      }
    }
  }

  /**
   * Retorna estatísticas da skill
   * @returns {object}
   */
  getStats() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      priority: this.priority,
      executionCount: this.executionCount,
      successRate: Math.round(this.successRate * 100) / 100,
      lastExecuted: this.lastExecuted,
      recentErrors: this.errors.slice(-3)
    };
  }

  /**
   * Habilita ou desabilita a skill
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    const previousState = this.enabled;
    this.enabled = enabled;
    
    logger.info(`Skill ${this.name} ${enabled ? 'enabled' : 'disabled'}`, {
      previousState,
      newState: enabled
    });
  }

  /**
   * Define a prioridade da skill (menor número = maior prioridade)
   * @param {number} priority
   */
  setPriority(priority) {
    const previousPriority = this.priority;
    this.priority = priority;
    
    logger.info(`Skill ${this.name} priority changed`, {
      previousPriority,
      newPriority: priority
    });
  }

  /**
   * Extrai parâmetros da mensagem do usuário
   * @param {string} userMessage - Mensagem do usuário
   * @param {object} context - Contexto da conversa
   * @returns {object} - Parâmetros extraídos
   */
  extractParameters(userMessage, context) {
    // Implementação básica - pode ser sobrescrita pelas skills filhas
    return {
      message: userMessage,
      channel: context?.activity?.channelId || 'unknown',
      userId: context?.activity?.from?.id || 'unknown'
    };
  }

  /**
   * Formata a resposta para o usuário
   * @param {any} data - Dados da resposta
   * @param {object} context - Contexto da conversa
   * @returns {string} - Resposta formatada
   */
  formatResponse(data, context) {
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    
    return String(data);
  }

  /**
   * Realiza cleanup de recursos se necessário
   */
  async cleanup() {
    logger.debug(`Cleaning up skill: ${this.name}`);
    // Implementação específica por skill se necessário
  }

  /**
   * Retorna informações de help sobre a skill
   * @returns {object}
   */
  getHelp() {
    return {
      name: this.name,
      description: this.description,
      usage: `Skill não documentada ainda`,
      examples: [],
      parameters: []
    };
  }

  /**
   * Método para debug - retorna estado interno da skill
   * @returns {object}
   */
  debug() {
    return {
      name: this.name,
      description: this.description,
      config: this.config,
      stats: this.getStats(),
      lastErrors: this.errors.slice(-5)
    };
  }
}

module.exports = { BaseSkill };