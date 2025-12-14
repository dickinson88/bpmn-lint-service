import express from 'express';
import cors from 'cors';
import { Linter } from 'bpmnlint';
import NodeResolver from 'bpmnlint/lib/resolver/node-resolver.js';
import BpmnModdle from 'bpmn-moddle';

const app = express();
const port = process.env.PORT || 3000;
const moddle = new BpmnModdle();
const linter = new Linter({
    config: {
        extends: 'bpmnlint:recommended'
    },
    rules: {
        "label-required": "off"
    },
    resolver: new NodeResolver()
});

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --- Auth Middleware ---
app.use((req, res, next) => {
    if (req.path === '/health') return next();

    const expectedKey = process.env.ACTION_API_KEY;
    if (!expectedKey) return next();

    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${expectedKey}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// --- Routes ---

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/lint-bpmn', async (req, res) => {
    const { bpmnXml } = req.body || {};

    if (!bpmnXml || typeof bpmnXml !== 'string') {
        return res.status(400).json({ error: 'Missing bpmnXml string' });
    }

    try {
        const { rootElement } = await moddle.fromXML(bpmnXml);
        const lintResults = await linter.lint(rootElement);

        const issues = Object.entries(lintResults).map(([ruleName, reports]) => ({
            rule: ruleName,
            reports: reports.map(report => ({
                id: report.id,
                message: report.message,
                documentationLink: report.meta?.documentation?.url,
                category: report.category
            }))
        }));

        const hasError = issues.some(issue =>
            issue.reports.some(r => r.category === 'error')
        );

        return res.json({
            status: hasError ? 'error' : 'ok',
            issues
        });

    } catch (err) {
        console.error('Lint processing error:', err);
        return res.status(400).json({
            error: 'Failed to process BPMN',
            details: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`BPMN lint service listening on port ${port}`);
});