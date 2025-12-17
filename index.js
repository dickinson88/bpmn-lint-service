import express from 'express';
import cors from 'cors';
import multer from 'multer';
import zlib from 'node:zlib';
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

const BLOCKING_CATEGORIES = new Set(['error', 'rule-error']);

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Multer: upload do paměti (buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB, uprav dle potřeby
});

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

app.post('/lint-bpmn', upload.single('file'), async (req, res) => {
    const ct = req.headers['content-type'] || '';
    console.log('content-type:', ct);

    let bpmnXml = null;

    // 1) multipart file
    if (req.file?.buffer) {
        bpmnXml = req.file.buffer.toString('utf8');
    }

    // 2) JSON raw xml
    if (!bpmnXml && typeof req.body?.bpmnXml === 'string') {
        bpmnXml = req.body.bpmnXml;
    }

    // 3) JSON gzip+base64
    if (!bpmnXml && typeof req.body?.bpmnGzipBase64 === 'string') {
        try {
            const gzBuf = Buffer.from(req.body.bpmnGzipBase64, 'base64');
            bpmnXml = zlib.gunzipSync(gzBuf).toString('utf8');
        } catch (e) {
            return res.status(400).json({ status: 'error', error: 'Invalid bpmnGzipBase64', details: String(e?.message ?? e) });
        }
    }

    if (typeof bpmnXml !== 'string' || !bpmnXml.trim()) {
        return res.status(400).json({ status: 'error', error: 'Missing BPMN input (file OR bpmnXml OR bpmnGzipBase64).' });
    }

    let rootElement;
    try {
        const parsed = await moddle.fromXML(bpmnXml);
        rootElement = parsed.rootElement;
    } catch (err) {
        return res.status(400).json({
            status: 'error',
            error: 'Invalid BPMN XML: failed to parse document as <bpmn:Definitions>',
            details: err?.message ?? String(err)
        });
    }

    if (rootElement?.$type !== 'bpmn:Definitions' || !Array.isArray(rootElement.rootElements)) {
        return res.status(400).json({
            status: 'error',
            error: 'Invalid BPMN XML: <bpmn:Definitions> parsed without rootElements',
            rootType: rootElement?.$type
        });
    }

    const lintResults = await linter.lint(rootElement);

    const issues = Object.entries(lintResults).map(([ruleName, reports]) => ({
        rule: ruleName,
        reports: reports.map(r => ({
            id: r.id,
            message: r.message,
            documentationLink: r.meta?.documentation?.url,
            category: r.category
        }))
    }));

    const hasBlocking = issues.some(issue =>
        issue.reports.some(r => BLOCKING_CATEGORIES.has(r.category))
    );

    return res.json({
        status: hasBlocking ? 'error' : 'ok',
        issues
    });
});

app.listen(port, () => {
    console.log(`BPMN lint service listening on port ${port}`);
});