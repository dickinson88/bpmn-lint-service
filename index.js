import express from 'express';
import cors from 'cors';
import { Linter } from 'bpmnlint';
import NodeResolver from 'bpmnlint/lib/resolver/node-resolver.js';
import BpmnModdle from 'bpmn-moddle';

const app = express();
const port = process.env.PORT || 3000;

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

// Map linter categories to specific severity strings
const SEVERITY_MAP = {
    'error': 'error',
    'warn': 'warning',
    'info': 'info'
};

const RULE_SEVERITY_OVERRIDE = {
    'no-bpmndi': 'warning'
};

// --- Routes ---

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/lint-bpmn', async (req, res) => {
    const { bpmnXml } = req.body || {};

    if (!bpmnXml || typeof bpmnXml !== 'string') {
        return res.status(400).json({ error: 'Missing bpmnXml string' });
    }

    try {
        const moddle = new BpmnModdle();
        const linter = new Linter({
            config: {
                extends: 'bpmnlint:recommended'
            },
            resolver: new NodeResolver()
        });

        // 1. Parse XML
        const { rootElement } = await moddle.fromXML(bpmnXml);

        // 2. Lint
        const lintResults = await linter.lint(rootElement);

        // 3. Format results
        const issues = [];

        for (const [ruleName, reports] of Object.entries(lintResults)) {
            for (const report of reports) {
                let severity = RULE_SEVERITY_OVERRIDE[ruleName];
                if (!severity) {
                    severity = SEVERITY_MAP[report.category] || 'warning';
                }

                issues.push({
                    rule: ruleName,
                    id: report.id || 'root',
                    message: report.message,
                    severity
                });
            }
        }

        return res.json({
            status: issues.some(i => i.severity === 'error') ? 'error' : 'ok',
            issues: issues
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