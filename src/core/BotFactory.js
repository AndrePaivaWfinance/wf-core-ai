// Bot Factory - Para criar diferentes bots
const { createMeshBot } = require("../bots/mesh");
class BotFactory {
  static createBot(type, config) {
    if (type === "mesh") return createMeshBot(config);
    throw new Error(`Bot type ${type} not supported`);
  }
}
module.exports = { BotFactory };
