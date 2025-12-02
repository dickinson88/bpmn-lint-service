import express from 'express';
import cors from 'cors';

import { Linter } from 'bpmnlint';
import NodeResolver from 'bpmnlint/lib/resolver/node-resolver.js';
import BpmnModdle from 'bpmn-moddle';

const app = express();
const port = process.env.PORT || 3000;

// --- middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- auth middleware (pro GPT Action přes API key) ---
app.use((req, res, next) => {
    const expectedKey = process.env.ACTION_API_KEY;

    // pokud není nastaven, nevyžadujeme auth (např. lokální testování)
    if (!expectedKey) {
        return next();
    }

    const authHeader = req.headers.authorization || '';
    const expectedHeader = `Bearer ${expectedKey}`;

    if (authHeader !== expectedHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
});

// --- bpmnlint setup ---
// moddle pro parsování BPMN 2.0 XML
const moddle = new BpmnModdle();

// vlastní instance linteru s doporučenou konfigurací
// (stejná jako .bpmnlintrc s "extends": "bpmnlint:recommended")
const linter = new Linter({
    config: {
        extends: 'bpmnlint:recommended'
    },
    resolver: new NodeResolver()
});

// healthcheck endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// hlavní endpoint pro lintování
app.post('/lint-bpmn', async (req, res) => {
    const { bpmnXml } = req.body || {};

    if (!bpmnXml || typeof bpmnXml !== 'string') {
        return res.status(400).json({
            error: 'Missing bpmnXml string in JSON body'
        });
    }

    try {
        // parse XML pomocí bpmn-moddle
        const { rootElement } = await moddle.fromXML(bpmnXml);

        // lintnutí definic
        const reports = await linter.lint(rootElement);

        // převod reports objektu na ploché pole issues
        // reports má tvar:
        // {
        //   "end-event-required": [{ id, message }, ...],
        //   "start-event-required": [{ id, message }, ...],
        //   ...
        // }
        const issues = [];

        for (const [ruleName, ruleIssues] of Object.entries(reports)) {
            for (const issue of ruleIssues) {
                issues.push({
                    rule: ruleName,
                    id: issue.id,
                    message: issue.message || ''
                });
            }
        }

        return res.json({
            issues,
            rawReports: reports
        });
    } catch (err) {
        console.error('Lint error:', err);

        return res.status(500).json({
            error: 'Linting failed',
            details: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`BPMN lint service listening on port ${port}`);
});
