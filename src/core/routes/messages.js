let requestCounter = 0;
let errorCounter = 0;
let successCounter = 0;
const startupTime = Date.now();

function registerMessagesRoute(server, adapter, meshBot) {
  console.log('[MESH Routes] Registering endpoints...');

  // MAIN MESH ENDPOINT
  server.post('/api/messages', async (req, res) => {
    const startTime = Date.now();
    const requestId = `mesh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    requestCounter++;

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        errorCounter++;
        res.json(408, { 
          error: 'Request timeout',
          requestId
        });
      }
    }, 25000);

    const clearTimeoutAndFinish = () => {
      clearTimeout(timeoutId);
    };
    
    res.on('finish', clearTimeoutAndFinish);
    res.on('close', clearTimeoutAndFinish);

    // Basic validation
    if (!req.body || !req.body.type) {
      errorCounter++;
      clearTimeout(timeoutId);
      res.json(400, { 
        error: 'Invalid request format',
        requestId
      });
      return;
    }

    try {
      let processed = false;
      
      await Promise.race([
        adapter.process(req, res, async (context) => {
          processed = true;
          try {
            await meshBot.run(context);
            const duration = Date.now() - startTime;
            successCounter++;
            console.log(`[MESH Success] ${requestId} - ${duration}ms`);
          } catch (botError) {
            errorCounter++;
            console.error(`[MESH Bot Error] ${requestId}:`, botError.message);
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ADAPTER_TIMEOUT')), 20000)
        )
      ]);

      if (!processed) {
        successCounter++;
      }

      clearTimeout(timeoutId);

    } catch (adapterError) {
      errorCounter++;
      console.error(`[MESH Adapter Error] ${requestId}:`, adapterError.message);
      clearTimeout(timeoutId);

      if (!res.headersSent) {
        const isTimeout = adapterError.message === 'ADAPTER_TIMEOUT';
        
        res.json(isTimeout ? 504 : 500, {
          error: isTimeout 
            ? 'Processing timeout - please try again'
            : 'Service temporarily unavailable',
          requestId
        });
      }
    }
  });

  // Head endpoint for Bot Framework
  server.head('/api/messages', (req, res, next) => {
    res.send(200);
    return next();
  });

  // Status endpoint
  server.get('/api/messages', (req, res, next) => {
    res.json(200, {
      service: 'MESH - BPO Financial Analyst',
      company: 'Wfinance',
      version: '2.1.0',
      status: 'active',
      capabilities: [
        'Financial Analysis',
        'BPO Process Optimization', 
        'Cash Flow Insights',
        'Compliance Support'
      ],
      stats: {
        conversations: requestCounter,
        successRate: requestCounter > 0 
          ? `${((successCounter / requestCounter) * 100).toFixed(1)}%`
          : '0%',
        uptime: `${Math.floor((Date.now() - startupTime) / 1000)}s`
      },
      timestamp: new Date().toISOString()
    });
    return next();
  });

  console.log('[MESH Routes] ✅ Endpoints registered:');
  console.log('[MESH Routes]   - POST /api/messages (Bot conversation)');
  console.log('[MESH Routes]   - GET /healthz (Health check)');
  console.log('[MESH Routes]   - GET /api/messages (Status)');
}

module.exports = { registerMessagesRoute };