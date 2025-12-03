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

// --- auth middleware (for GPT Action) ---
app.use((req, res, next) => {
    const expectedKey = process.env.ACTION_API_KEY;

    // if no key is set, skip auth (local testing)
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
const moddle = new BpmnModdle();

// severity map for classification
const SEVERITY_MAP = {
    // high severity
    'end-event-required': 'error',
    'start-event-required': 'error',
    'no-disconnected': 'error',
    'no-implicit-split': 'error',
    'no-implicit-join': 'error',
    'no-duplicate-sequence-flows': 'error',
    'no-bpmndi': 'warning',
    'label-required': 'warning',
    '__default': 'warning'
};

const linter = new Linter({
    config: {
        extends: 'bpmnlint:recommended'
    },
    resolver: new NodeResolver()
});

// health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// --- main lint endpoint ---
app.post('/lint-bpmn', async (req, res) => {
    const { bpmnXml } = req.body || {};

    if (!bpmnXml || typeof bpmnXml !== 'string') {
        return res.status(400).json({
            error: 'Missing bpmnXml string in JSON body'
        });
    }

    try {
        const { rootElement, rootElements } = await moddle.fromXML(bpmnXml);

        // extract processes, ignore collaborations
        const processes = (rootElements || []).filter(e => e.$type === 'bpmn:Process');
        const targets = processes.length ? processes : [rootElement];

        const reports = {};

        for (const element of targets) {
            const r = await linter.lint(element);

            // Filter out duplicate rule entries — bpmnlint sometimes repeats issues
            for (const [rule, issues] of Object.entries(r)) {
                if (!reports[rule]) reports[rule] = [];

                // Add issues only once per element ID
                for (const issue of issues) {
                    const alreadyExists = reports[rule].some(i => i.id === issue.id && i.message === issue.message);
                    if (!alreadyExists) {
                        reports[rule].push(issue);
                    }
                }
            }
        }

        // Flatten reports to issues[]
        const issues = [];

        for (const [ruleName, ruleIssues] of Object.entries(reports)) {
            for (const issue of ruleIssues) {
                const severity = issue.category || SEVERITY_MAP[ruleName] || SEVERITY_MAP['__default'];
                issues.push({
                    rule: ruleName,
                    id: issue.id,
                    message: issue.message || '',
                    severity
                });
            }
        }

        // Deduplicate globally by (rule, id, message)
        const uniqueIssues = issues.filter(
            (v, i, a) => a.findIndex(t => t.rule === v.rule && t.id === v.id && t.message === v.message) === i
        );

        return res.json({
            issues: uniqueIssues,
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
    console.log(`✅ BPMN lint service listening on port ${port}`);
});
