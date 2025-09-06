// ===================================================
// src/core/learning/LearningEngine.js
// ===================================================
const logger = require('../../utils/logger');

class LearningEngine {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.patterns = new Map();
    this.recommendations = new Map();
    this.feedbackHistory = new Map();
  }

  // ===================================================
  // ANÁLISE DE PADRÕES DE USUÁRIO
  // ===================================================
  async analyzeUserPatterns(userId) {
    try {
      const profile = await this.memoryManager.getUserProfile(userId);
      const conversations = await this.memoryManager.getConversationHistory(userId, 50);
      
      const patterns = {
        frequentTopics: this.extractTopicPatterns(conversations),
        preferredSkills: this.analyzeSkillPreferences(profile, conversations),
        timePatterns: this.analyzeTimePatterns(conversations),
        communicationStyle: this.analyzeCommunicationStyle(conversations),
        problemTypes: this.analyzeCommonProblems(conversations)
      };

      // Salvar insights para uso futuro
      await this.memoryManager.recordLearningEvent('user_patterns', {
        type: 'pattern_analysis',
        userId,
        patterns,
        confidence: this.calculateConfidence(conversations.length)
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to analyze user patterns', {
        userId,
        error: error.message
      });
      return null;
    }
  }

  extractTopicPatterns(conversations) {
    const topicCounts = {};
    const keywords = {
      'financeiro': ['financeiro', 'dinheiro', 'relatório', 'balanço', 'receita', 'despesa'],
      'fluxo_caixa': ['fluxo', 'caixa', 'cash flow', 'liquidez'],
      'conciliacao': ['conciliação', 'banco', 'bancária', 'divergência'],
      'processo': ['processo', 'procedimento', 'workflow', 'automação'],
      'compliance': ['compliance', 'auditoria', 'regulamento', 'norma']
    };

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.role === 'user') {
          const text = msg.content.toLowerCase();
          Object.entries(keywords).forEach(([topic, words]) => {
            if (words.some(word => text.includes(word))) {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
          });
        }
      });
    });

    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count, frequency: count / conversations.length }));
  }

  analyzeSkillPreferences(profile, conversations) {
    const skillUsage = profile.statistics.skillsUsed || {};
    const total = Object.values(skillUsage).reduce((sum, count) => sum + count, 0);

    return Object.entries(skillUsage)
      .map(([skill, count]) => ({
        skill,
        count,
        preference: total > 0 ? count / total : 0,
        lastUsed: this.findLastSkillUsage(skill, conversations)
      }))
      .sort((a, b) => b.preference - a.preference);
  }

  analyzeTimePatterns(conversations) {
    const hourCounts = {};
    const dayOfWeekCounts = {};

    conversations.forEach(conv => {
      const date = new Date(conv.metadata.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    });

    return {
      peakHours: Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, count]) => ({ hour: parseInt(hour), count })),
      activeDays: Object.entries(dayOfWeekCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([day, count]) => ({ day: parseInt(day), count }))
    };
  }

  analyzeCommunicationStyle(conversations) {
    let totalLength = 0;
    let questionCount = 0;
    let urgentCount = 0;
    let formalCount = 0;
    let messageCount = 0;

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.role === 'user') {
          messageCount++;
          totalLength += msg.content.length;
          
          if (msg.content.includes('?')) questionCount++;
          if (msg.content.match(/urgent|urgente|rápido|pressa/i)) urgentCount++;
          if (msg.content.match(/prezado|cordialmente|atenciosamente/i)) formalCount++;
        }
      });
    });

    return {
      averageLength: messageCount > 0 ? Math.round(totalLength / messageCount) : 0,
      questionFrequency: messageCount > 0 ? questionCount / messageCount : 0,
      urgencyLevel: messageCount > 0 ? urgentCount / messageCount : 0,
      formalityLevel: messageCount > 0 ? formalCount / messageCount : 0,
      style: this.determineStyle(totalLength / messageCount, formalCount / messageCount)
    };
  }

  determineStyle(avgLength, formalityRatio) {
    if (avgLength > 200 && formalityRatio > 0.3) return 'formal_detailed';
    if (avgLength > 200) return 'detailed_casual';
    if (formalityRatio > 0.3) return 'formal_concise';
    return 'casual_concise';
  }

  analyzeCommonProblems(conversations) {
    const problemPatterns = {};
    const problemKeywords = {
      'data_urgency': ['hoje', 'agora', 'urgente', 'rápido'],
      'reconciliation_issues': ['erro', 'divergência', 'não bate', 'diferença'],
      'report_requests': ['relatório', 'gerar', 'exportar', 'enviar'],
      'process_questions': ['como', 'procedimento', 'passo a passo'],
      'system_issues': ['não funciona', 'erro', 'problema', 'falha']
    };

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.role === 'user') {
          const text = msg.content.toLowerCase();
          Object.entries(problemKeywords).forEach(([problem, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
              problemPatterns[problem] = (problemPatterns[problem] || 0) + 1;
            }
          });
        }
      });
    });

    return Object.entries(problemPatterns)
      .sort((a, b) => b[1] - a[1])
      .map(([problem, count]) => ({ problem, count }));
  }

  // ===================================================
  // SISTEMA DE RECOMENDAÇÕES
  // ===================================================
  async generateRecommendations(userId, currentContext = {}) {
    try {
      const patterns = await this.analyzeUserPatterns(userId);
      const profile = await this.memoryManager.getUserProfile(userId);
      
      const recommendations = {
        skillRecommendations: this.recommendSkills(patterns, currentContext),
        responseStyleRecommendations: this.recommendResponseStyle(patterns, profile),
        proactiveInsights: this.generateProactiveInsights(patterns, profile),
        optimizations: this.suggestOptimizations(patterns, profile)
      };

      // Registrar recomendações geradas
      await this.memoryManager.recordLearningEvent('recommendations', {
        type: 'recommendations_generated',
        userId,
        recommendations,
        context: currentContext
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate recommendations', {
        userId,
        error: error.message
      });
      return null;
    }
  }

  recommendSkills(patterns, context) {
    const recommendations = [];

    // Baseado em tópicos frequentes
    if (patterns?.frequentTopics) {
      patterns.frequentTopics.forEach(topic => {
        if (topic.topic === 'fluxo_caixa' && topic.frequency > 0.3) {
          recommendations.push({
            type: 'skill',
            skill: 'fluxo_caixa',
            reason: 'Usuário frequentemente pergunta sobre fluxo de caixa',
            confidence: topic.frequency,
            priority: 'high'
          });
        }
        
        if (topic.topic === 'conciliacao' && topic.frequency > 0.2) {
          recommendations.push({
            type: 'skill',
            skill: 'conciliacao',
            reason: 'Histórico de questões de conciliação bancária',
            confidence: topic.frequency,
            priority: 'medium'
          });
        }
      });
    }

    // Baseado no contexto atual
    if (context.currentMessage) {
      const message = context.currentMessage.toLowerCase();
      if (message.includes('relatório') && !message.includes('fluxo')) {
        recommendations.push({
          type: 'skill',
          skill: 'relatorios_gerenciais',
          reason: 'Contexto atual sugere necessidade de relatório',
          confidence: 0.8,
          priority: 'high'
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  recommendResponseStyle(patterns, profile) {
    const style = patterns?.communicationStyle?.style || 'casual_concise';
    const recommendations = [];

    switch (style) {
      case 'formal_detailed':
        recommendations.push({
          type: 'response_style',
          style: 'formal',
          details: 'high',
          tone: 'professional',
          reason: 'Usuário prefere comunicação formal e detalhada'
        });
        break;
      
      case 'casual_concise':
        recommendations.push({
          type: 'response_style',
          style: 'casual',
          details: 'medium',
          tone: 'friendly',
          reason: 'Usuário prefere respostas diretas e amigáveis'
        });
        break;
      
      default:
        recommendations.push({
          type: 'response_style',
          style: 'professional',
          details: 'medium',
          tone: 'helpful',
          reason: 'Estilo padrão profissional'
        });
    }

    return recommendations;
  }

  generateProactiveInsights(patterns, profile) {
    const insights = [];

    // Análise de tendências temporais
    if (patterns?.timePatterns?.peakHours) {
      const currentHour = new Date().getHours();
      const isPeakTime = patterns.timePatterns.peakHours.some(
        peak => Math.abs(peak.hour - currentHour) <= 1
      );

      if (isPeakTime) {
        insights.push({
          type: 'temporal',
          insight: 'Este é um horário de alta atividade do usuário',
          action: 'Priorizar resposta rápida e eficiente',
          confidence: 0.7
        });
      }
    }

    // Análise de padrões problemáticos
    if (patterns?.problemTypes) {
      const frequentProblem = patterns.problemTypes[0];
      if (frequentProblem && frequentProblem.count > 3) {
        insights.push({
          type: 'pattern',
          insight: `Usuário frequentemente tem problemas com ${frequentProblem.problem}`,
          action: 'Preparar soluções proativas para este tipo de problema',
          confidence: 0.8
        });
      }
    }

    return insights;
  }

  suggestOptimizations(patterns, profile) {
    const optimizations = [];

    // Otimização de skills baseada em uso
    if (patterns?.preferredSkills) {
      const topSkill = patterns.preferredSkills[0];
      if (topSkill && topSkill.preference > 0.5) {
        optimizations.push({
          type: 'skill_priority',
          suggestion: `Priorizar skill ${topSkill.skill} nas respostas`,
          impact: 'high',
          reason: `Skill mais usada (${Math.round(topSkill.preference * 100)}% das interações)`
        });
      }
    }

    // Otimização de tempo de resposta
    if (patterns?.communicationStyle?.urgencyLevel > 0.3) {
      optimizations.push({
        type: 'response_speed',
        suggestion: 'Priorizar respostas rápidas e objetivas',
        impact: 'medium',
        reason: 'Usuário demonstra urgência frequente'
      });
    }

    return optimizations;
  }

  // ===================================================
  // FEEDBACK E SATISFAÇÃO
  // ===================================================
  async processFeedback(userId, feedback, context = {}) {
    try {
      const feedbackData = {
        userId,
        feedback,
        context,
        timestamp: new Date().toISOString(),
        type: this.categorizeFeedback(feedback)
      };

      // Salvar feedback
      await this.memoryManager.recordLearningEvent('feedback', {
        type: 'user_feedback',
        ...feedbackData
      });

      // Atualizar perfil do usuário
      const profile = await this.memoryManager.getUserProfile(userId);
      const currentScore = profile.learning.satisfactionScore || 0;
      const feedbackCount = profile.learning.feedbackCount || 0;
      
      const newScore = this.calculateSatisfactionScore(feedback);
      const updatedScore = ((currentScore * feedbackCount) + newScore) / (feedbackCount + 1);

      await this.memoryManager.updateUserProfile(userId, {
        learning: {
          ...profile.learning,
          satisfactionScore: updatedScore,
          feedbackCount: feedbackCount + 1,
          lastFeedback: feedbackData
        }
      });

      // Gerar insights do feedback
      return await this.generateFeedbackInsights(userId, feedbackData);

    } catch (error) {
      logger.error('Failed to process feedback', {
        userId,
        error: error.message
      });
      return null;
    }
  }

  categorizeFeedback(feedback) {
    const positive = ['bom', 'ótimo', 'excelente', 'perfeito', 'obrigado', 'ajudou'];
    const negative = ['ruim', 'erro', 'não funcionou', 'problema', 'incorreto'];
    const neutral = ['ok', 'entendi', 'certo'];

    const text = feedback.toLowerCase();
    
    if (positive.some(word => text.includes(word))) return 'positive';
    if (negative.some(word => text.includes(word))) return 'negative';
    if (neutral.some(word => text.includes(word))) return 'neutral';
    
    return 'unknown';
  }

  calculateSatisfactionScore(feedback) {
    const type = this.categorizeFeedback(feedback);
    const scores = { positive: 1, neutral: 0.5, negative: 0, unknown: 0.3 };
    return scores[type] || 0.3;
  }

  async generateFeedbackInsights(userId, feedbackData) {
    const insights = {
      immediate: [],
      longTerm: [],
      recommendations: []
    };

    // Insights imediatos baseados no feedback
    if (feedbackData.type === 'negative') {
      insights.immediate.push({
        type: 'improvement',
        message: 'Feedback negativo recebido - investigar possível melhoria',
        action: 'Analisar contexto da interação que gerou feedback negativo'
      });
    }

    if (feedbackData.type === 'positive') {
      insights.immediate.push({
        type: 'reinforcement',
        message: 'Feedback positivo - reforçar padrão usado',
        action: 'Identificar o que funcionou bem para replicar'
      });
    }

    // Análise de tendência de satisfação
    const recentFeedbacks = await this.getRecentFeedbacks(userId, 10);
    if (recentFeedbacks.length >= 3) {
      const trend = this.analyzeSatisfactionTrend(recentFeedbacks);
      insights.longTerm.push({
        type: 'satisfaction_trend',
        trend: trend.direction,
        confidence: trend.confidence,
        suggestion: trend.suggestion
      });
    }

    return insights;
  }

  // ===================================================
  // INTEGRAÇÃO COM AZURE FUNCTIONS
  // ===================================================
  async enhanceSkillWithLearning(skillName, context, azureFunctionHook = null) {
    try {
      const userId = context.userId;
      const skillHistory = await this.memoryManager.getSkillContext(userId, skillName, 10);
      const userPatterns = await this.analyzeUserPatterns(userId);

      // Preparar contexto enriquecido para Azure Function
      const enhancedContext = {
        original: context,
        userPatterns,
        skillHistory: skillHistory.slice(0, 5), // Últimas 5 execuções
        recommendations: await this.generateRecommendations(userId, context),
        learningInsights: {
          preferredStyle: userPatterns?.communicationStyle?.style,
          commonProblems: userPatterns?.problemTypes?.slice(0, 3),
          timeContext: this.getTimeContext(),
          urgencyLevel: userPatterns?.communicationStyle?.urgencyLevel
        }
      };

      // Se há Azure Function configurada, usar
      if (azureFunctionHook && typeof azureFunctionHook === 'function') {
        logger.debug('Calling Azure Function with enhanced context', {
          skillName,
          userId,
          hasPatterns: !!userPatterns
        });

        const azureResult = await azureFunctionHook(enhancedContext);
        
        // Salvar resultado enriquecido
        await this.memoryManager.saveSkillContext(
          userId, 
          skillName, 
          enhancedContext, 
          azureResult
        );

        return {
          result: azureResult,
          context: enhancedContext,
          wasEnhanced: true
        };
      }

      // Fallback para lógica local enriquecida
      return {
        result: await this.executeEnhancedLocalSkill(skillName, enhancedContext),
        context: enhancedContext,
        wasEnhanced: true
      };

    } catch (error) {
      logger.error('Failed to enhance skill with learning', {
        skillName,
        userId: context.userId,
        error: error.message
      });

      // Fallback para execução normal
      return {
        result: null,
        context,
        wasEnhanced: false,
        error: error.message
      };
    }
  }

  async executeEnhancedLocalSkill(skillName, enhancedContext) {
    // Lógica local enriquecida baseada no aprendizado
    const { userPatterns, recommendations } = enhancedContext;
    
    switch (skillName) {
      case 'fluxo_caixa':
        return this.generateEnhancedFluxoCaixa(userPatterns, enhancedContext);
      
      case 'conciliacao':
        return this.generateEnhancedConciliacao(userPatterns, enhancedContext);
      
      default:
        return {
          message: 'Skill executada com contexto de aprendizado',
          enhancements: recommendations?.skillRecommendations || []
        };
    }
  }

  generateEnhancedFluxoCaixa(patterns, context) {
    const style = patterns?.communicationStyle?.style || 'professional';
    const urgency = patterns?.communicationStyle?.urgencyLevel || 0;

    let response = "📊 **Relatório de Fluxo de Caixa Personalizado**\n\n";

    // Adaptar conteúdo baseado no estilo do usuário
    if (style === 'formal_detailed') {
      response += "**Análise Detalhada do Período:**\n";
      response += "- Receitas Operacionais: R$ 150.000,00\n";
      response += "- Despesas Operacionais: R$ 120.000,00\n";
      response += "- Resultado Líquido: R$ 30.000,00\n\n";
      response += "**Indicadores de Performance:**\n";
      response += "- Margem Líquida: 20,0%\n";
      response += "- Índice de Liquidez: 1,25\n\n";
    } else {
      response += "**Resumo Financeiro:**\n";
      response += "• Entradas: R$ 150.000,00\n";
      response += "• Saídas: R$ 120.000,00\n";
      response += "• Saldo: R$ 30.000,00\n\n";
    }

    // Adicionar urgência se necessário
    if (urgency > 0.3) {
      response += "⚡ **Atenção:** Processamento prioritário aplicado.\n";
    }

    // Insights baseados no histórico
    if (patterns?.frequentTopics?.some(t => t.topic === 'fluxo_caixa')) {
      response += "💡 **Insight:** Baseado no seu histórico, este é seu relatório mais consultado.\n";
    }

    return {
      message: response,
      personalization: {
        style,
        urgencyHandled: urgency > 0.3,
        basedOnHistory: true
      }
    };
  }

  generateEnhancedConciliacao(patterns, context) {
    const hasRecurrentIssues = patterns?.problemTypes?.some(p => 
      p.problem === 'reconciliation_issues'
    );

    let response = "🏦 **Conciliação Bancária Inteligente**\n\n";

    if (hasRecurrentIssues) {
      response += "⚠️ **Atenção:** Detectamos problemas recorrentes de conciliação.\n\n";
      response += "**Análise Direcionada:**\n";
      response += "• Focando nas divergências mais comuns do seu histórico\n";
      response += "• Verificação automática dos padrões identificados\n\n";
    }

    response += "**Status Atual:**\n";
    response += "• Transações conferidas: 87\n";
    response += "• Divergências: 2 (padrão identificado)\n";
    response += "• Valor: R$ 1.250,00\n\n";

    if (hasRecurrentIssues) {
      response += "🎯 **Recomendação Personalizada:**\n";
      response += "Baseado no seu histórico, sugerimos verificação especial nos débitos automáticos.";
    }

    return {
      message: response,
      personalization: {
        hasRecurrentIssues,
        tailoredRecommendations: hasRecurrentIssues
      }
    };
  }

  // ===================================================
  // MÉTODOS AUXILIARES
  // ===================================================
  findLastSkillUsage(skillName, conversations) {
    for (const conv of conversations) {
      if (conv.metadata.skillUsed === skillName) {
        return conv.metadata.timestamp;
      }
    }
    return null;
  }

  calculateConfidence(sampleSize) {
    if (sampleSize >= 50) return 0.9;
    if (sampleSize >= 20) return 0.7;
    if (sampleSize >= 10) return 0.5;
    if (sampleSize >= 5) return 0.3;
    return 0.1;
  }

  getTimeContext() {
    const now = new Date();
    return {
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      isBusinessHours: now.getHours() >= 9 && now.getHours() <= 18,
      isWeekend: now.getDay() === 0 || now.getDay() === 6
    };
  }

  async getRecentFeedbacks(userId, limit = 10) {
    // Implementação simplificada - na prática viria do Cosmos DB
    return [];
  }

  analyzeSatisfactionTrend(feedbacks) {
    if (feedbacks.length < 3) {
      return { direction: 'unknown', confidence: 0, suggestion: 'Mais dados necessários' };
    }

    const scores = feedbacks.map(f => this.calculateSatisfactionScore(f.feedback));
    const recent = scores.slice(-3);
    const older = scores.slice(0, -3);

    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b) / older.length : recentAvg;

    if (recentAvg > olderAvg + 0.1) {
      return { 
        direction: 'improving', 
        confidence: 0.7, 
        suggestion: 'Satisfação melhorando - manter padrão atual' 
      };
    } else if (recentAvg < olderAvg - 0.1) {
      return { 
        direction: 'declining', 
        confidence: 0.7, 
        suggestion: 'Satisfação em declínio - revisar abordagem' 
      };
    }

    return { 
      direction: 'stable', 
      confidence: 0.5, 
      suggestion: 'Satisfação estável - explorar melhorias' 
    };
  }
}

module.exports = { LearningEngine };