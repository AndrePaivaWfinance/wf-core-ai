// Base Skill Framework - Para todas as skills
class BaseSkill {
  constructor(name, description, config = {}) {
    this.name = name;
    this.description = description;
    this.config = config;
  }

  async canHandle(intent, context) {
    throw new Error('canHandle must be implemented');
  }

  async execute(parameters, context) {
    throw new Error('execute must be implemented');
  }

  async validate(parameters) {
    return { valid: true, errors: [] };
  }
}

module.exports = { BaseSkill };
