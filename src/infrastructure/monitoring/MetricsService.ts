
import client from 'prom-client';
import express from 'express';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

export class MetricsService {
    private registry: client.Registry;
    private tokenCounter: client.Counter;
    private requestDuration: client.Histogram;
    private errorCounter: client.Counter;
    private server: any;

    constructor() {
        this.registry = new client.Registry();
        this.registry.setDefaultLabels({ app: 'openclaw-bot' });
        client.collectDefaultMetrics({ register: this.registry });

        this.tokenCounter = new client.Counter({
            name: 'openclaw_tokens_total',
            help: 'Total number of tokens processed',
            labelNames: ['model', 'type'], // type: input, output
            registers: [this.registry]
        });

        this.requestDuration = new client.Histogram({
            name: 'openclaw_request_duration_seconds',
            help: 'Duration of AI requests in seconds',
            labelNames: ['model', 'method'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
            registers: [this.registry]
        });

        this.errorCounter = new client.Counter({
            name: 'openclaw_errors_total',
            help: 'Total number of errors',
            labelNames: ['type'],
            registers: [this.registry]
        });
    }

    public startMetricsServer() {
        if (!config.metricsEnabled) return;

        const app = express();
        
        app.get('/metrics', async (req, res) => {
            try {
                res.set('Content-Type', this.registry.contentType);
                res.end(await this.registry.metrics());
            } catch (ex) {
                res.status(500).end(ex);
            }
        });

        this.server = app.listen(config.metricsPort, () => {
            logger.info(`[Metrics] Servidor de métricas iniciado na porta ${config.metricsPort}`);
        });
    }

    public stopMetricsServer() {
        if (this.server) {
            this.server.close();
        }
    }

    public recordTokens(model: string, inputTokens: number, outputTokens: number) {
        this.tokenCounter.inc({ model, type: 'input' }, inputTokens);
        this.tokenCounter.inc({ model, type: 'output' }, outputTokens);
    }

    public recordDuration(model: string, method: string, durationSeconds: number) {
        this.requestDuration.observe({ model, method }, durationSeconds);
    }

    public recordError(type: string) {
        this.errorCounter.inc({ type });
    }
}

export const metrics = new MetricsService();
