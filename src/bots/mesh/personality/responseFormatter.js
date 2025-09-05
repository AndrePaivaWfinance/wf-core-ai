// ===================================================
// src/core/bot/personality/responseFormatter.js
// ===================================================
class MeshResponseFormatter {
  constructor() {}

  formatResponse(response, context = {}) {
    let formattedResponse = response;

    // Remove linguagem excessivamente formal
    formattedResponse = this.adjustFormality(formattedResponse);
    
    // Ajusta baseado no canal
    if (context?.isTeams) {
      formattedResponse = this.formatForTeams(formattedResponse);
    }

    return formattedResponse;
  }

  adjustFormality(response) {
    const replacements = {
      "Prezado(a)": "",
      "Cordialmente": "",
      "Atenciosamente": "",
      "Venho por meio desta": "Informo que"
    };

    let adjusted = response;
    
    Object.entries(replacements).forEach(([formal, simple]) => {
      const regex = new RegExp(formal, 'gi');
      adjusted = adjusted.replace(regex, simple);
    });

    return adjusted.trim();
  }

  formatForTeams(response) {
    let teamsResponse = response;
    
    // Destaca valores monetários e percentuais
    teamsResponse = teamsResponse.replace(/R\$\s?[\d.,]+/g, match => `**${match}**`);
    teamsResponse = teamsResponse.replace(/\d+%/g, match => `**${match}**`);
    
    // Limita tamanho para Teams
    if (teamsResponse.length > 4000) {
      teamsResponse = teamsResponse.substring(0, 3900) + '\n\n[Mensagem truncada]';
    }
    
    return teamsResponse;
  }

  formatForCurrentSystem(response, context = null) {
    const meshContext = {
      isTeams: context?.isTeams || false,
      isWebChat: context?.isWebChat || false
    };
    
    return this.formatResponse(response, meshContext);
  }
}

module.exports = { MeshResponseFormatter };
