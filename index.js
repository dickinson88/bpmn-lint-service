import express from 'express';
import cors from 'cors';
import { Linter } from 'bpmnlint';
import NodeResolver from 'bpmnlint/lib/resolver/node-resolver.js';
import BpmnModdle from 'bpmn-moddle';

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '2mb' })); // High limit for large XML files

// --- Auth Middleware ---
app.use((req, res, next) => {
    // Skip auth for health check
    if (req.path === '/health') return next();

    const expectedKey = process.env.ACTION_API_KEY;
    // Skip auth if no key is configured (local dev)
    if (!expectedKey) return next();

    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${expectedKey}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// --- BPMN Linter Setup ---
const moddle = new BpmnModdle();
const linter = new Linter({
    config: {
        extends: 'bpmnlint:recommended' // Loads all recommended rules
    },
    resolver: new NodeResolver()
});

// Map linter categories to specific severity strings
const SEVERITY_MAP = {
    'error': 'error',
    'warn': 'warning',
    'info': 'info'
};

// Optional: Override specific rules if needed (currently minimal)
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
        // 1. Parse XML
        const { rootElement } = await moddle.fromXML(bpmnXml);

        // 2. Lint the root element (Definitions)
        // Passing rootElement ensures global rules (like no-bpmndi) work correctly.
        const lintResults = await linter.lint(rootElement);

        // 3. Format results for GPT
        const issues = [];

        // lintResults structure: { "rule-name": [ { id, message, category, ... } ] }
        for (const [ruleName, reports] of Object.entries(lintResults)) {
            for (const report of reports) {
                // Determine severity: Override > Category > Default
                let severity = RULE_SEVERITY_OVERRIDE[ruleName];
                if (!severity) {
                    severity = SEVERITY_MAP[report.category] || 'warning';
                }

                issues.push({
                    rule: ruleName,
                    id: report.id || 'root', // Some global errors have no element ID
                    message: report.message,
                    severity
                });
            }
        }

        // 4. Send Response
        // 'status' helps GPT quickly understand if action is needed
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