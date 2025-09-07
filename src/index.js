#!/usr/bin/env node

/**
 * 🚀 MESH Platform - Entry Point Principal
 * 
 * Framework modular para múltiplos bots IA
 * Começando com MESH - Analista BPO Financeiro
 */

import { config } from './config/env.js';
import { createServer } from './server/restify.js';
import { createBotAdapter } from './server/adapter.js';
import { setupRoutes } from './routes/index.js';
import { BotFactory } from './core/BotFactory.js';
import { logger } from './utils/logger.js';
import { setupMonitoring } from './monitoring/insights.js';

class MeshPlatform {
    constructor() {
        this.server = null;
        this.adapter = null;
        this.bot = null;
        this.isShuttingDown = false;
    }

    async initialize() {
        try {
            logger.info('🚀 Inicializando MESH Platform...');

            // 1. Setup monitoring
            if (config.appInsights.instrumentationKey) {
                setupMonitoring();
                logger.info('📊 Application Insights configurado');
            }

            // 2. Criar servidor Restify
            this.server = createServer();
            logger.info('🌐 Servidor Restify criado');

            // 3. Criar Bot Framework adapter
            this.adapter = createBotAdapter();
            logger.info('🔌 Bot Framework adapter criado');

            // 4. Criar bot MESH usando factory
            this.bot = await BotFactory.createBot('mesh', {
                appId: config.bot.appId,
                appPassword: config.bot.appPassword,
                llmConfig: config.llm
            });
            logger.info('🤖 MESH Bot inicializado');

            // 5. Setup routes
            setupRoutes(this.server, this.adapter, this.bot);
            logger.info('📡 Rotas configuradas');

            // 6. Setup graceful shutdown
            this.setupGracefulShutdown();

            return this;
        } catch (error) {
            logger.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }

    async start() {
        try {
            const port = config.server.port;
            
            await new Promise((resolve, reject) => {
                this.server.listen(port, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            logger.info(`✅ MESH Platform rodando na porta ${port}`);
            logger.info(`🌐 Health check: http://localhost:${port}/healthz`);
            logger.info(`🤖 Bot endpoint: http://localhost:${port}/api/messages`);
            
            // Log configuração atual
            this.logConfiguration();

        } catch (error) {
            logger.error('❌ Erro ao iniciar servidor:', error);
            throw error;
        }
    }

    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            logger.info(`🔄 Recebido ${signal}, iniciando shutdown graceful...`);

            try {
                // Parar de aceitar novas conexões
                this.server.close();

                // Aguardar requests em andamento (timeout 10s)
                await new Promise((resolve) => {
                    setTimeout(resolve, 10000);
                });

                logger.info('✅ Shutdown graceful concluído');
                process.exit(0);
            } catch (error) {
                logger.error('❌ Erro durante shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon
    }

    logConfiguration() {
        logger.info('📋 Configuração atual:');
        logger.info(`  • Ambiente: ${config.env}`);
        logger.info(`  • Bot ID: ${config.bot.appId ? '✅ Configurado' : '❌ Não configurado'}`);
        logger.info(`  • LLM Provider: ${config.llm.provider}`);
        logger.info(`  • Application Insights: ${config.appInsights.instrumentationKey ? '✅ Ativo' : '❌ Inativo'}`);
        logger.info(`  • Log Level: ${config.logging.level}`);
    }
}

// Verificar configuração crítica
function validateConfig() {
    const errors = [];

    if (!config.server.port) {
        errors.push('PORT não configurado');
    }

    if (config.llm.provider === 'azure' && !config.llm.azure.endpoint) {
        errors.push('Azure OpenAI endpoint não configurado');
    }

    if (config.llm.provider === 'openai' && !config.llm.openai.apiKey) {
        errors.push('OpenAI API key não configurada');
    }

    if (errors.length > 0) {
        logger.error('❌ Configuração inválida:');
        errors.forEach(error => logger.error(`  • ${error}`));
        process.exit(1);
    }
}

// Error handling global
process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
});

// 🚀 INICIALIZAÇÃO
async function main() {
    try {
        // Validar configuração
        validateConfig();

        // Criar e inicializar platform
        const platform = new MeshPlatform();
        await platform.initialize();
        await platform.start();

    } catch (error) {
        logger.error('💥 Falha crítica na inicialização:', error);
        process.exit(1);
    }
}

// Executar apenas se for o arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { MeshPlatform };