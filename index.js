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
const BLOCKING_CATEGORIES = new Set(['error', 'rule-error']);

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

        console.log('rootElement.$type:', rootElement?.$type);
        console.log('has rootElements:', Array.isArray(rootElement?.rootElements), 'len:', rootElement?.rootElements?.length);

        const issues = Object.entries(lintResults).map(([ruleName, reports]) => ({
            rule: ruleName,
            reports: reports.map(report => ({
                id: report.id,
                message: report.message,
                documentationLink: report.meta?.documentation?.url,
                category: report.category
            }))
        }));

        const hasBlocking = issues.some(issue =>
            issue.reports.some(r => BLOCKING_CATEGORIES.has(r.category))
        );

        return res.json({
            status: hasBlocking ? 'error' : 'ok',
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
//
// const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
// <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_0xe5rw4" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="18.0.0">
//   <bpmn:collaboration id="Collaboration_1h8iu76">
//     <bpmn:participant id="Participant_1ovdint" name="Prodejce" processRef="Process_03adxxq" />
//     <bpmn:participant id="Participant_0bc8uky" name="Autorizovaný servis" processRef="Process_186uf7q" />
//     <bpmn:participant id="Participant_0aks3s1" name="Dodavatel náhradních dílů" processRef="Process_16zur8s" />
//     <bpmn:participant id="Participant_0jboz4t" name="Zákazník" processRef="Process_03donly" />
//     <bpmn:messageFlow id="Flow_1doeaw1" sourceRef="Activity_0qq2uqv" targetRef="Activity_14sh0pw" />
//     <bpmn:messageFlow id="Flow_1pwp3y8" sourceRef="Activity_1vjkfq7" targetRef="Activity_1urffu5" />
//     <bpmn:messageFlow id="Flow_19j4hrn" sourceRef="Activity_1mzn9x1" targetRef="Event_0cloqpb" />
//     <bpmn:messageFlow id="Flow_0shppp2" sourceRef="Event_0o9v50u" targetRef="Event_0v2i00h" />
//     <bpmn:messageFlow id="Flow_1s5vhw2" sourceRef="Event_0hmjmdg" targetRef="Event_1txo0dx" />
//     <bpmn:messageFlow id="Flow_0mwd3kz" sourceRef="Activity_1ovu73q" targetRef="Activity_1ouoi7e" />
//     <bpmn:messageFlow id="Flow_14tk2hc" sourceRef="Activity_0kfvxgl" targetRef="Activity_0ll4tyz" />
//     <bpmn:messageFlow id="Flow_09krnvs" sourceRef="Activity_07pmh9v" targetRef="Activity_0tredfj" />
//     <bpmn:messageFlow id="Flow_12fmk3y" sourceRef="Activity_18hpfq8" targetRef="Activity_1ouoi7e" />
//     <bpmn:messageFlow id="Flow_0btf24o" sourceRef="Activity_0p1rvwq" targetRef="Activity_0nbq3cs" />
//     <bpmn:messageFlow id="Flow_1ticzk5" sourceRef="Activity_1cqpnmk" targetRef="Activity_1sloz46" />
//     <bpmn:textAnnotation id="TextAnnotation_0u8tu6q">
//       <bpmn:text>Navštíví prodejnu</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_0l8ggz1">
//       <bpmn:text>30 dní</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_170o50j">
//       <bpmn:text>příjem oznámení</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_1f0plti">
//       <bpmn:text>stav reklamace</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_0gj5dvw">
//       <bpmn:text>30 dní</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_0wbv5vg">
//       <bpmn:text>7 dní</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_14km9qn">
//       <bpmn:text>peníze byly přijaty zpět</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_1p6ukqm">
//       <bpmn:text>Reklamace dokončena</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:textAnnotation id="TextAnnotation_068c40i">
//       <bpmn:text>reklamace není oprávněná</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:association id="Association_0v6btzu" associationDirection="None" sourceRef="Flow_010kfl3" targetRef="TextAnnotation_068c40i" />
//     <bpmn:textAnnotation id="TextAnnotation_13qsgt8">
//       <bpmn:text>reklamace je oprávněná</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:association id="Association_0t20s4n" associationDirection="None" sourceRef="Flow_04wgv41" targetRef="TextAnnotation_13qsgt8" />
//     <bpmn:textAnnotation id="TextAnnotation_1bu2yv1">
//       <bpmn:text>nebylo žádné oznámení</bpmn:text>
//     </bpmn:textAnnotation>
//     <bpmn:association id="Association_19mhw22" associationDirection="None" sourceRef="Flow_09hetrv" targetRef="TextAnnotation_1bu2yv1" />
//     <bpmn:association id="Association_18odubc" associationDirection="None" sourceRef="StartEvent_1pke4r7" targetRef="TextAnnotation_0u8tu6q" />
//     <bpmn:association id="Association_1c4w3q8" associationDirection="None" sourceRef="Event_0v2i00h" targetRef="TextAnnotation_1f0plti" />
//     <bpmn:association id="Association_05lrmmv" associationDirection="None" sourceRef="Event_0rbyqk5" targetRef="TextAnnotation_0l8ggz1" />
//     <bpmn:association id="Association_0tfcsdu" associationDirection="None" sourceRef="Event_1a2u7bw" targetRef="TextAnnotation_0gj5dvw" />
//     <bpmn:association id="Association_1rocczy" associationDirection="None" sourceRef="Event_0oxfskc" targetRef="TextAnnotation_0wbv5vg" />
//     <bpmn:association id="Association_1p696h9" associationDirection="None" sourceRef="Event_1fm4c8l" targetRef="TextAnnotation_14km9qn" />
//     <bpmn:association id="Association_1a7ak0p" associationDirection="None" sourceRef="Event_1txo0dx" targetRef="TextAnnotation_170o50j" />
//     <bpmn:association id="Association_0gkhh65" associationDirection="None" sourceRef="Event_0zjgwdp" targetRef="TextAnnotation_1p6ukqm" />
//   </bpmn:collaboration>
//   <bpmn:process id="Process_03adxxq" isExecutable="false">
//     <bpmn:task id="Activity_14sh0pw" name="Přijetí reklamace">
//       <bpmn:outgoing>Flow_1r96mof</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_1vjkfq7" name="Odeslání do autorizovaného servisu">
//       <bpmn:incoming>Flow_1r96mof</bpmn:incoming>
//       <bpmn:outgoing>Flow_08cbwfd</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:intermediateCatchEvent id="Event_0cloqpb">
//       <bpmn:incoming>Flow_1htm3qt</bpmn:incoming>
//       <bpmn:outgoing>Flow_1yhn3sp</bpmn:outgoing>
//       <bpmn:messageEventDefinition id="MessageEventDefinition_0i41u1s" />
//     </bpmn:intermediateCatchEvent>
//     <bpmn:intermediateThrowEvent id="Event_0o9v50u">
//       <bpmn:incoming>Flow_1yhn3sp</bpmn:incoming>
//       <bpmn:messageEventDefinition id="MessageEventDefinition_086gz6b" />
//     </bpmn:intermediateThrowEvent>
//     <bpmn:task id="Activity_0wiu7ss" name="Čekání na vyřízení reklamace servisem">
//       <bpmn:incoming>Flow_08cbwfd</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:exclusiveGateway id="Gateway_1hdmw56">
//       <bpmn:incoming>Flow_0pa2hb0</bpmn:incoming>
//       <bpmn:outgoing>Flow_1htm3qt</bpmn:outgoing>
//       <bpmn:outgoing>Flow_1empv3s</bpmn:outgoing>
//     </bpmn:exclusiveGateway>
//     <bpmn:task id="Activity_0nbq3cs" name="obdržení žádosti o vrácení peněz">
//       <bpmn:outgoing>Flow_1iphob8</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_1cqpnmk" name="vrácení peněz">
//       <bpmn:incoming>Flow_1iphob8</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:task id="Activity_1ouoi7e" name="příjem telefonu">
//       <bpmn:incoming>Flow_1empv3s</bpmn:incoming>
//       <bpmn:outgoing>Flow_14rbuvq</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:intermediateThrowEvent id="Event_0hmjmdg">
//       <bpmn:incoming>Flow_14rbuvq</bpmn:incoming>
//       <bpmn:messageEventDefinition id="MessageEventDefinition_12ypxz2" />
//     </bpmn:intermediateThrowEvent>
//     <bpmn:boundaryEvent id="Event_1a2u7bw" attachedToRef="Activity_0wiu7ss">
//       <bpmn:outgoing>Flow_0pa2hb0</bpmn:outgoing>
//       <bpmn:timerEventDefinition id="TimerEventDefinition_08huwbp" />
//     </bpmn:boundaryEvent>
//     <bpmn:sequenceFlow id="Flow_1r96mof" sourceRef="Activity_14sh0pw" targetRef="Activity_1vjkfq7" />
//     <bpmn:sequenceFlow id="Flow_08cbwfd" sourceRef="Activity_1vjkfq7" targetRef="Activity_0wiu7ss" />
//     <bpmn:sequenceFlow id="Flow_1htm3qt" sourceRef="Gateway_1hdmw56" targetRef="Event_0cloqpb" />
//     <bpmn:sequenceFlow id="Flow_1yhn3sp" sourceRef="Event_0cloqpb" targetRef="Event_0o9v50u" />
//     <bpmn:sequenceFlow id="Flow_0pa2hb0" sourceRef="Event_1a2u7bw" targetRef="Gateway_1hdmw56" />
//     <bpmn:sequenceFlow id="Flow_1empv3s" sourceRef="Gateway_1hdmw56" targetRef="Activity_1ouoi7e" />
//     <bpmn:sequenceFlow id="Flow_1iphob8" sourceRef="Activity_0nbq3cs" targetRef="Activity_1cqpnmk" />
//     <bpmn:sequenceFlow id="Flow_14rbuvq" sourceRef="Activity_1ouoi7e" targetRef="Event_0hmjmdg" />
//   </bpmn:process>
//   <bpmn:process id="Process_186uf7q">
//     <bpmn:task id="Activity_1urffu5" name="Převzetí reklamace">
//       <bpmn:outgoing>Flow_033sffn</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_062obw2" name="Vyhodnocení reklamace">
//       <bpmn:incoming>Flow_033sffn</bpmn:incoming>
//       <bpmn:outgoing>Flow_1rufhcr</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:exclusiveGateway id="Gateway_0rujsqv">
//       <bpmn:incoming>Flow_1rufhcr</bpmn:incoming>
//       <bpmn:outgoing>Flow_010kfl3</bpmn:outgoing>
//       <bpmn:outgoing>Flow_04wgv41</bpmn:outgoing>
//     </bpmn:exclusiveGateway>
//     <bpmn:task id="Activity_1ovu73q" name="odeslání zpět">
//       <bpmn:incoming>Flow_010kfl3</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:task id="Activity_0fpnz28" name="Přiřazení mechanikovi">
//       <bpmn:incoming>Flow_04wgv41</bpmn:incoming>
//       <bpmn:incoming>Flow_15w9lj1</bpmn:incoming>
//       <bpmn:outgoing>Flow_1kz5qsp</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_1woq494" name="kontrola náhradních dílů">
//       <bpmn:incoming>Flow_1kz5qsp</bpmn:incoming>
//       <bpmn:outgoing>Flow_1y941iw</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:exclusiveGateway id="Gateway_0vvltzk">
//       <bpmn:incoming>Flow_1y941iw</bpmn:incoming>
//       <bpmn:outgoing>Flow_00n8yzw</bpmn:outgoing>
//       <bpmn:outgoing>Flow_0n2u4yi</bpmn:outgoing>
//     </bpmn:exclusiveGateway>
//     <bpmn:task id="Activity_0kfvxgl" name="Objednání náhradních dílů">
//       <bpmn:incoming>Flow_0n2u4yi</bpmn:incoming>
//       <bpmn:outgoing>Flow_0qmeh6y</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_0tredfj" name="Příjem náhradních dílů">
//       <bpmn:incoming>Flow_0qmeh6y</bpmn:incoming>
//       <bpmn:outgoing>Flow_0q1yepz</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_15zzk35" name="Oprava telefonu">
//       <bpmn:incoming>Flow_00n8yzw</bpmn:incoming>
//       <bpmn:incoming>Flow_0q1yepz</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:exclusiveGateway id="Gateway_1x0z850">
//       <bpmn:incoming>Flow_1cytmeq</bpmn:incoming>
//       <bpmn:outgoing>Flow_0fqg4z0</bpmn:outgoing>
//       <bpmn:outgoing>Flow_0qvkxhe</bpmn:outgoing>
//     </bpmn:exclusiveGateway>
//     <bpmn:task id="Activity_18hpfq8" name="Odeslání telefonu">
//       <bpmn:incoming>Flow_0qvkxhe</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:task id="Activity_1s0huh0" name="Upozornění manažera">
//       <bpmn:incoming>Flow_0fqg4z0</bpmn:incoming>
//       <bpmn:outgoing>Flow_15w9lj1</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:boundaryEvent id="Event_0oxfskc" attachedToRef="Activity_15zzk35">
//       <bpmn:outgoing>Flow_1cytmeq</bpmn:outgoing>
//       <bpmn:timerEventDefinition id="TimerEventDefinition_0hbkfjm" />
//     </bpmn:boundaryEvent>
//     <bpmn:sequenceFlow id="Flow_033sffn" sourceRef="Activity_1urffu5" targetRef="Activity_062obw2" />
//     <bpmn:sequenceFlow id="Flow_1rufhcr" sourceRef="Activity_062obw2" targetRef="Gateway_0rujsqv" />
//     <bpmn:sequenceFlow id="Flow_010kfl3" sourceRef="Gateway_0rujsqv" targetRef="Activity_1ovu73q" />
//     <bpmn:sequenceFlow id="Flow_04wgv41" sourceRef="Gateway_0rujsqv" targetRef="Activity_0fpnz28" />
//     <bpmn:sequenceFlow id="Flow_15w9lj1" sourceRef="Activity_1s0huh0" targetRef="Activity_0fpnz28" />
//     <bpmn:sequenceFlow id="Flow_1kz5qsp" sourceRef="Activity_0fpnz28" targetRef="Activity_1woq494" />
//     <bpmn:sequenceFlow id="Flow_1y941iw" sourceRef="Activity_1woq494" targetRef="Gateway_0vvltzk" />
//     <bpmn:sequenceFlow id="Flow_00n8yzw" sourceRef="Gateway_0vvltzk" targetRef="Activity_15zzk35" />
//     <bpmn:sequenceFlow id="Flow_0n2u4yi" sourceRef="Gateway_0vvltzk" targetRef="Activity_0kfvxgl" />
//     <bpmn:sequenceFlow id="Flow_0qmeh6y" sourceRef="Activity_0kfvxgl" targetRef="Activity_0tredfj" />
//     <bpmn:sequenceFlow id="Flow_0q1yepz" sourceRef="Activity_0tredfj" targetRef="Activity_15zzk35" />
//     <bpmn:sequenceFlow id="Flow_1cytmeq" sourceRef="Event_0oxfskc" targetRef="Gateway_1x0z850" />
//     <bpmn:sequenceFlow id="Flow_0fqg4z0" sourceRef="Gateway_1x0z850" targetRef="Activity_1s0huh0" />
//     <bpmn:sequenceFlow id="Flow_0qvkxhe" sourceRef="Gateway_1x0z850" targetRef="Activity_18hpfq8" />
//   </bpmn:process>
//   <bpmn:process id="Process_16zur8s">
//     <bpmn:task id="Activity_0ll4tyz" name="Přijetí objednávky">
//       <bpmn:outgoing>Flow_1mz0kqs</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_07pmh9v" name="Odeslaní náhradních dílů">
//       <bpmn:incoming>Flow_1mz0kqs</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:sequenceFlow id="Flow_1mz0kqs" sourceRef="Activity_0ll4tyz" targetRef="Activity_07pmh9v" />
//   </bpmn:process>
//   <bpmn:process id="Process_03donly">
//     <bpmn:startEvent id="StartEvent_1pke4r7">
//       <bpmn:outgoing>Flow_0re04gc</bpmn:outgoing>
//     </bpmn:startEvent>
//     <bpmn:task id="Activity_0qq2uqv" name="Vyplnění reklamačního protokolu">
//       <bpmn:incoming>Flow_0re04gc</bpmn:incoming>
//       <bpmn:outgoing>Flow_1roox67</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:task id="Activity_0to5vcb" name="Čekání na vyřízení reklamace">
//       <bpmn:incoming>Flow_1roox67</bpmn:incoming>
//       <bpmn:incoming>Flow_1d7cjll</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:intermediateCatchEvent id="Event_0rbyqk5">
//       <bpmn:outgoing>Flow_1rgvw3f</bpmn:outgoing>
//       <bpmn:timerEventDefinition id="TimerEventDefinition_0djq7oj" />
//     </bpmn:intermediateCatchEvent>
//     <bpmn:task id="Activity_1mzn9x1" name="Dotaz na stav reklamace">
//       <bpmn:incoming>Flow_09hetrv</bpmn:incoming>
//       <bpmn:outgoing>Flow_1djcws3</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:intermediateCatchEvent id="Event_0v2i00h">
//       <bpmn:incoming>Flow_1djcws3</bpmn:incoming>
//       <bpmn:outgoing>Flow_169xfz8</bpmn:outgoing>
//       <bpmn:messageEventDefinition id="MessageEventDefinition_0b9ynm8" />
//     </bpmn:intermediateCatchEvent>
//     <bpmn:exclusiveGateway id="Gateway_0dw9lp6">
//       <bpmn:incoming>Flow_169xfz8</bpmn:incoming>
//       <bpmn:outgoing>Flow_1c4528u</bpmn:outgoing>
//       <bpmn:outgoing>Flow_1d7cjll</bpmn:outgoing>
//     </bpmn:exclusiveGateway>
//     <bpmn:task id="Activity_0p1rvwq" name="Požadavek na vrácení peněz">
//       <bpmn:incoming>Flow_1c4528u</bpmn:incoming>
//     </bpmn:task>
//     <bpmn:task id="Activity_1sloz46" name="přijímání peněz">
//       <bpmn:outgoing>Flow_0bhzu57</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:endEvent id="Event_1fm4c8l">
//       <bpmn:incoming>Flow_0bhzu57</bpmn:incoming>
//     </bpmn:endEvent>
//     <bpmn:intermediateCatchEvent id="Event_1txo0dx">
//       <bpmn:incoming>Flow_1yunwxy</bpmn:incoming>
//       <bpmn:outgoing>Flow_1w3g425</bpmn:outgoing>
//       <bpmn:messageEventDefinition id="MessageEventDefinition_14u9ufi" />
//     </bpmn:intermediateCatchEvent>
//     <bpmn:endEvent id="Event_0zjgwdp">
//       <bpmn:incoming>Flow_1hd8n5j</bpmn:incoming>
//     </bpmn:endEvent>
//     <bpmn:task id="Activity_1dlha1y" name="Vyzvednutí telefonu">
//       <bpmn:incoming>Flow_1w3g425</bpmn:incoming>
//       <bpmn:outgoing>Flow_1hd8n5j</bpmn:outgoing>
//     </bpmn:task>
//     <bpmn:exclusiveGateway id="Gateway_03t8ywt">
//       <bpmn:incoming>Flow_1rgvw3f</bpmn:incoming>
//       <bpmn:outgoing>Flow_1yunwxy</bpmn:outgoing>
//       <bpmn:outgoing>Flow_09hetrv</bpmn:outgoing>
//     </bpmn:exclusiveGateway>
//     <bpmn:sequenceFlow id="Flow_0re04gc" sourceRef="StartEvent_1pke4r7" targetRef="Activity_0qq2uqv" />
//     <bpmn:sequenceFlow id="Flow_1roox67" sourceRef="Activity_0qq2uqv" targetRef="Activity_0to5vcb" />
//     <bpmn:sequenceFlow id="Flow_1d7cjll" sourceRef="Gateway_0dw9lp6" targetRef="Activity_0to5vcb" />
//     <bpmn:sequenceFlow id="Flow_1rgvw3f" sourceRef="Event_0rbyqk5" targetRef="Gateway_03t8ywt" />
//     <bpmn:sequenceFlow id="Flow_09hetrv" sourceRef="Gateway_03t8ywt" targetRef="Activity_1mzn9x1" />
//     <bpmn:sequenceFlow id="Flow_1djcws3" sourceRef="Activity_1mzn9x1" targetRef="Event_0v2i00h" />
//     <bpmn:sequenceFlow id="Flow_169xfz8" sourceRef="Event_0v2i00h" targetRef="Gateway_0dw9lp6" />
//     <bpmn:sequenceFlow id="Flow_1c4528u" sourceRef="Gateway_0dw9lp6" targetRef="Activity_0p1rvwq" />
//     <bpmn:sequenceFlow id="Flow_0bhzu57" sourceRef="Activity_1sloz46" targetRef="Event_1fm4c8l" />
//     <bpmn:sequenceFlow id="Flow_1yunwxy" sourceRef="Gateway_03t8ywt" targetRef="Event_1txo0dx" />
//     <bpmn:sequenceFlow id="Flow_1w3g425" sourceRef="Event_1txo0dx" targetRef="Activity_1dlha1y" />
//     <bpmn:sequenceFlow id="Flow_1hd8n5j" sourceRef="Activity_1dlha1y" targetRef="Event_0zjgwdp" />
//   </bpmn:process>
//   <bpmndi:BPMNDiagram id="BPMNDiagram_1">
//     <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1h8iu76">
//       <bpmndi:BPMNShape id="Participant_1ovdint_di" bpmnElement="Participant_1ovdint" isHorizontal="true">
//         <dc:Bounds x="156" y="410" width="2202" height="262" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_14sh0pw_di" bpmnElement="Activity_14sh0pw">
//         <dc:Bounds x="280" y="480" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1vjkfq7_di" bpmnElement="Activity_1vjkfq7">
//         <dc:Bounds x="470" y="480" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_0cloqpb_di" bpmnElement="Event_0cloqpb">
//         <dc:Bounds x="822" y="442" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_0o9v50u_di" bpmnElement="Event_0o9v50u">
//         <dc:Bounds x="902" y="442" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0wiu7ss_di" bpmnElement="Activity_0wiu7ss">
//         <dc:Bounds x="610" y="480" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Gateway_1hdmw56_di" bpmnElement="Gateway_1hdmw56" isMarkerVisible="true">
//         <dc:Bounds x="775" y="495" width="50" height="50" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0nbq3cs_di" bpmnElement="Activity_0nbq3cs">
//         <dc:Bounds x="1140" y="430" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1cqpnmk_di" bpmnElement="Activity_1cqpnmk">
//         <dc:Bounds x="1290" y="430" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1ouoi7e_di" bpmnElement="Activity_1ouoi7e">
//         <dc:Bounds x="1680" y="540" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_0hmjmdg_di" bpmnElement="Event_0hmjmdg">
//         <dc:Bounds x="1862" y="572" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Association_0tfcsdu_di" bpmnElement="Association_0tfcsdu">
//         <di:waypoint x="717" y="504" />
//         <di:waypoint x="733" y="470" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="Event_1a2u7bw_di" bpmnElement="Event_1a2u7bw">
//         <dc:Bounds x="692" y="502" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_1r96mof_di" bpmnElement="Flow_1r96mof">
//         <di:waypoint x="380" y="520" />
//         <di:waypoint x="470" y="520" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1yhn3sp_di" bpmnElement="Flow_1yhn3sp">
//         <di:waypoint x="858" y="460" />
//         <di:waypoint x="902" y="460" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1htm3qt_di" bpmnElement="Flow_1htm3qt">
//         <di:waypoint x="800" y="495" />
//         <di:waypoint x="800" y="460" />
//         <di:waypoint x="822" y="460" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0pa2hb0_di" bpmnElement="Flow_0pa2hb0">
//         <di:waypoint x="728" y="520" />
//         <di:waypoint x="775" y="520" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1empv3s_di" bpmnElement="Flow_1empv3s">
//         <di:waypoint x="800" y="545" />
//         <di:waypoint x="800" y="600" />
//         <di:waypoint x="1680" y="600" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_14rbuvq_di" bpmnElement="Flow_14rbuvq">
//         <di:waypoint x="1780" y="590" />
//         <di:waypoint x="1862" y="590" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_08cbwfd_di" bpmnElement="Flow_08cbwfd">
//         <di:waypoint x="570" y="520" />
//         <di:waypoint x="610" y="520" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1iphob8_di" bpmnElement="Flow_1iphob8">
//         <di:waypoint x="1240" y="470" />
//         <di:waypoint x="1290" y="470" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="Participant_0bc8uky_di" bpmnElement="Participant_0bc8uky" isHorizontal="true">
//         <dc:Bounds x="156" y="670" width="2202" height="310" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1urffu5_di" bpmnElement="Activity_1urffu5">
//         <dc:Bounds x="470" y="750" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_062obw2_di" bpmnElement="Activity_062obw2">
//         <dc:Bounds x="600" y="750" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Gateway_0rujsqv_di" bpmnElement="Gateway_0rujsqv" isMarkerVisible="true">
//         <dc:Bounds x="735" y="765" width="50" height="50" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1ovu73q_di" bpmnElement="Activity_1ovu73q">
//         <dc:Bounds x="840" y="680" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0fpnz28_di" bpmnElement="Activity_0fpnz28">
//         <dc:Bounds x="830" y="820" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1woq494_di" bpmnElement="Activity_1woq494">
//         <dc:Bounds x="960" y="820" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Gateway_0vvltzk_di" bpmnElement="Gateway_0vvltzk" isMarkerVisible="true">
//         <dc:Bounds x="1085" y="835" width="50" height="50" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0kfvxgl_di" bpmnElement="Activity_0kfvxgl">
//         <dc:Bounds x="1160" y="870" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0tredfj_di" bpmnElement="Activity_0tredfj">
//         <dc:Bounds x="1310" y="870" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_15zzk35_di" bpmnElement="Activity_15zzk35">
//         <dc:Bounds x="1440" y="750" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Gateway_1x0z850_di" bpmnElement="Gateway_1x0z850" isMarkerVisible="true">
//         <dc:Bounds x="1585" y="765" width="50" height="50" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_18hpfq8_di" bpmnElement="Activity_18hpfq8">
//         <dc:Bounds x="1680" y="690" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1s0huh0_di" bpmnElement="Activity_1s0huh0">
//         <dc:Bounds x="1700" y="840" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Association_1rocczy_di" bpmnElement="Association_1rocczy">
//         <di:waypoint x="1552" y="777" />
//         <di:waypoint x="1586" y="740" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="Event_08hqyao_di" bpmnElement="Event_0oxfskc">
//         <dc:Bounds x="1522" y="772" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_010kfl3_di" bpmnElement="Flow_010kfl3">
//         <di:waypoint x="760" y="765" />
//         <di:waypoint x="760" y="720" />
//         <di:waypoint x="840" y="720" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_033sffn_di" bpmnElement="Flow_033sffn">
//         <di:waypoint x="570" y="790" />
//         <di:waypoint x="600" y="790" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1rufhcr_di" bpmnElement="Flow_1rufhcr">
//         <di:waypoint x="700" y="790" />
//         <di:waypoint x="735" y="790" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_04wgv41_di" bpmnElement="Flow_04wgv41">
//         <di:waypoint x="760" y="815" />
//         <di:waypoint x="760" y="860" />
//         <di:waypoint x="830" y="860" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1kz5qsp_di" bpmnElement="Flow_1kz5qsp">
//         <di:waypoint x="930" y="860" />
//         <di:waypoint x="960" y="860" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1y941iw_di" bpmnElement="Flow_1y941iw">
//         <di:waypoint x="1060" y="860" />
//         <di:waypoint x="1085" y="860" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_00n8yzw_di" bpmnElement="Flow_00n8yzw">
//         <di:waypoint x="1110" y="835" />
//         <di:waypoint x="1110" y="790" />
//         <di:waypoint x="1440" y="790" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0n2u4yi_di" bpmnElement="Flow_0n2u4yi">
//         <di:waypoint x="1110" y="885" />
//         <di:waypoint x="1110" y="910" />
//         <di:waypoint x="1160" y="910" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0qmeh6y_di" bpmnElement="Flow_0qmeh6y">
//         <di:waypoint x="1260" y="910" />
//         <di:waypoint x="1310" y="910" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0q1yepz_di" bpmnElement="Flow_0q1yepz">
//         <di:waypoint x="1410" y="910" />
//         <di:waypoint x="1490" y="910" />
//         <di:waypoint x="1490" y="830" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1cytmeq_di" bpmnElement="Flow_1cytmeq">
//         <di:waypoint x="1558" y="790" />
//         <di:waypoint x="1585" y="790" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0fqg4z0_di" bpmnElement="Flow_0fqg4z0">
//         <di:waypoint x="1610" y="815" />
//         <di:waypoint x="1610" y="880" />
//         <di:waypoint x="1700" y="880" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0qvkxhe_di" bpmnElement="Flow_0qvkxhe">
//         <di:waypoint x="1610" y="765" />
//         <di:waypoint x="1610" y="730" />
//         <di:waypoint x="1680" y="730" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_15w9lj1_di" bpmnElement="Flow_15w9lj1">
//         <di:waypoint x="1750" y="920" />
//         <di:waypoint x="1750" y="970" />
//         <di:waypoint x="880" y="970" />
//         <di:waypoint x="880" y="900" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="Participant_0aks3s1_di" bpmnElement="Participant_0aks3s1" isHorizontal="true">
//         <dc:Bounds x="156" y="980" width="2202" height="260" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0ll4tyz_di" bpmnElement="Activity_0ll4tyz">
//         <dc:Bounds x="1160" y="1060" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_07pmh9v_di" bpmnElement="Activity_07pmh9v">
//         <dc:Bounds x="1320" y="1060" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_1mz0kqs_di" bpmnElement="Flow_1mz0kqs">
//         <di:waypoint x="1260" y="1100" />
//         <di:waypoint x="1320" y="1100" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="Participant_0jboz4t_di" bpmnElement="Participant_0jboz4t" isHorizontal="true">
//         <dc:Bounds x="156" y="80" width="2202" height="340" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1pke4r7">
//         <dc:Bounds x="212" y="282" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0qq2uqv_di" bpmnElement="Activity_0qq2uqv">
//         <dc:Bounds x="290" y="260" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0to5vcb_di" bpmnElement="Activity_0to5vcb">
//         <dc:Bounds x="450" y="260" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_1vm0x21_di" bpmnElement="Event_0rbyqk5">
//         <dc:Bounds x="532" y="282" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1mzn9x1_di" bpmnElement="Activity_1mzn9x1">
//         <dc:Bounds x="730" y="190" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_0v2i00h_di" bpmnElement="Event_0v2i00h">
//         <dc:Bounds x="902" y="212" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Gateway_0dw9lp6_di" bpmnElement="Gateway_0dw9lp6" isMarkerVisible="true">
//         <dc:Bounds x="1015" y="205" width="50" height="50" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_0p1rvwq_di" bpmnElement="Activity_0p1rvwq">
//         <dc:Bounds x="1140" y="190" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1sloz46_di" bpmnElement="Activity_1sloz46">
//         <dc:Bounds x="1280" y="190" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_1fm4c8l_di" bpmnElement="Event_1fm4c8l">
//         <dc:Bounds x="1442" y="212" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_1txo0dx_di" bpmnElement="Event_1txo0dx">
//         <dc:Bounds x="1862" y="322" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Event_0zjgwdp_di" bpmnElement="Event_0zjgwdp">
//         <dc:Bounds x="2172" y="322" width="36" height="36" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Activity_1dlha1y_di" bpmnElement="Activity_1dlha1y">
//         <dc:Bounds x="1980" y="300" width="100" height="80" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="Gateway_1v03y2y_di" bpmnElement="Gateway_03t8ywt" isMarkerVisible="true">
//         <dc:Bounds x="615" y="275" width="50" height="50" />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_0re04gc_di" bpmnElement="Flow_0re04gc">
//         <di:waypoint x="248" y="300" />
//         <di:waypoint x="290" y="300" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1roox67_di" bpmnElement="Flow_1roox67">
//         <di:waypoint x="390" y="300" />
//         <di:waypoint x="450" y="300" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1rgvw3f_di" bpmnElement="Flow_1rgvw3f">
//         <di:waypoint x="568" y="300" />
//         <di:waypoint x="615" y="300" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1yunwxy_di" bpmnElement="Flow_1yunwxy">
//         <di:waypoint x="640" y="325" />
//         <di:waypoint x="640" y="340" />
//         <di:waypoint x="1862" y="340" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1djcws3_di" bpmnElement="Flow_1djcws3">
//         <di:waypoint x="830" y="230" />
//         <di:waypoint x="902" y="230" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_169xfz8_di" bpmnElement="Flow_169xfz8">
//         <di:waypoint x="938" y="230" />
//         <di:waypoint x="1015" y="230" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1c4528u_di" bpmnElement="Flow_1c4528u">
//         <di:waypoint x="1065" y="230" />
//         <di:waypoint x="1140" y="230" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1d7cjll_di" bpmnElement="Flow_1d7cjll">
//         <di:waypoint x="1040" y="205" />
//         <di:waypoint x="1040" y="180" />
//         <di:waypoint x="500" y="180" />
//         <di:waypoint x="500" y="260" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1w3g425_di" bpmnElement="Flow_1w3g425">
//         <di:waypoint x="1898" y="340" />
//         <di:waypoint x="1980" y="340" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0bhzu57_di" bpmnElement="Flow_0bhzu57">
//         <di:waypoint x="1380" y="230" />
//         <di:waypoint x="1442" y="230" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1hd8n5j_di" bpmnElement="Flow_1hd8n5j">
//         <di:waypoint x="2030" y="300" />
//         <di:waypoint x="2030" y="280" />
//         <di:waypoint x="2190" y="280" />
//         <di:waypoint x="2190" y="322" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_09hetrv_di" bpmnElement="Flow_09hetrv">
//         <di:waypoint x="640" y="275" />
//         <di:waypoint x="640" y="230" />
//         <di:waypoint x="730" y="230" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_18odubc_di" bpmnElement="Association_18odubc">
//         <di:waypoint x="235" y="283" />
//         <di:waypoint x="243" y="251" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_1c4w3q8_di" bpmnElement="Association_1c4w3q8">
//         <di:waypoint x="928" y="214" />
//         <di:waypoint x="955" y="156" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_05lrmmv_di" bpmnElement="Association_05lrmmv">
//         <di:waypoint x="557" y="284" />
//         <di:waypoint x="573" y="246" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_1p696h9_di" bpmnElement="Association_1p696h9">
//         <di:waypoint x="1460" y="212" />
//         <di:waypoint x="1460" y="191" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_1a7ak0p_di" bpmnElement="Association_1a7ak0p">
//         <di:waypoint x="1873" y="324" />
//         <di:waypoint x="1862" y="301" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_0gkhh65_di" bpmnElement="Association_0gkhh65">
//         <di:waypoint x="2194" y="357" />
//         <di:waypoint x="2197" y="370" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_0v6btzu_di" bpmnElement="Association_0v6btzu">
//         <di:waypoint x="777.5" y="720" />
//         <di:waypoint x="740" y="709" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_0t20s4n_di" bpmnElement="Association_0t20s4n">
//         <di:waypoint x="772.5" y="860" />
//         <di:waypoint x="751" y="890" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Association_19mhw22_di" bpmnElement="Association_19mhw22">
//         <di:waypoint x="662.5" y="230" />
//         <di:waypoint x="650" y="205" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="TextAnnotation_0u8tu6q_di" bpmnElement="TextAnnotation_0u8tu6q">
//         <dc:Bounds x="200" y="210" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_1doeaw1_di" bpmnElement="Flow_1doeaw1">
//         <di:waypoint x="340" y="340" />
//         <di:waypoint x="340" y="480" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="TextAnnotation_1f0plti_di" bpmnElement="TextAnnotation_1f0plti">
//         <dc:Bounds x="910" y="130" width="100" height="26" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_1pwp3y8_di" bpmnElement="Flow_1pwp3y8">
//         <di:waypoint x="520" y="560" />
//         <di:waypoint x="520" y="750" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="TextAnnotation_0l8ggz1_di" bpmnElement="TextAnnotation_0l8ggz1">
//         <dc:Bounds x="530" y="216" width="100" height="30" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_19j4hrn_di" bpmnElement="Flow_19j4hrn">
//         <di:waypoint x="780" y="270" />
//         <di:waypoint x="780" y="310" />
//         <di:waypoint x="840" y="310" />
//         <di:waypoint x="840" y="442" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="TextAnnotation_0gj5dvw_di" bpmnElement="TextAnnotation_0gj5dvw">
//         <dc:Bounds x="690" y="440" width="100" height="30" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_0shppp2_di" bpmnElement="Flow_0shppp2">
//         <di:waypoint x="920" y="442" />
//         <di:waypoint x="920" y="248" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1s5vhw2_di" bpmnElement="Flow_1s5vhw2">
//         <di:waypoint x="1880" y="570" />
//         <di:waypoint x="1880" y="358" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0mwd3kz_di" bpmnElement="Flow_0mwd3kz">
//         <di:waypoint x="890" y="680" />
//         <di:waypoint x="890" y="650" />
//         <di:waypoint x="1700" y="650" />
//         <di:waypoint x="1700" y="620" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_14tk2hc_di" bpmnElement="Flow_14tk2hc">
//         <di:waypoint x="1210" y="950" />
//         <di:waypoint x="1210" y="1060" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_09krnvs_di" bpmnElement="Flow_09krnvs">
//         <di:waypoint x="1370" y="1060" />
//         <di:waypoint x="1370" y="950" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="TextAnnotation_0wbv5vg_di" bpmnElement="TextAnnotation_0wbv5vg">
//         <dc:Bounds x="1550" y="710" width="100" height="30" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNEdge id="Flow_12fmk3y_di" bpmnElement="Flow_12fmk3y">
//         <di:waypoint x="1730" y="690" />
//         <di:waypoint x="1730" y="620" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_0btf24o_di" bpmnElement="Flow_0btf24o">
//         <di:waypoint x="1190" y="270" />
//         <di:waypoint x="1190" y="430" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNEdge id="Flow_1ticzk5_di" bpmnElement="Flow_1ticzk5">
//         <di:waypoint x="1340" y="430" />
//         <di:waypoint x="1340" y="270" />
//       </bpmndi:BPMNEdge>
//       <bpmndi:BPMNShape id="TextAnnotation_14km9qn_di" bpmnElement="TextAnnotation_14km9qn">
//         <dc:Bounds x="1410" y="150" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="TextAnnotation_170o50j_di" bpmnElement="TextAnnotation_170o50j">
//         <dc:Bounds x="1800" y="260" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="TextAnnotation_1p6ukqm_di" bpmnElement="TextAnnotation_1p6ukqm">
//         <dc:Bounds x="2150" y="370" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="TextAnnotation_068c40i_di" bpmnElement="TextAnnotation_068c40i">
//         <dc:Bounds x="640" y="680" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="TextAnnotation_13qsgt8_di" bpmnElement="TextAnnotation_13qsgt8">
//         <dc:Bounds x="690" y="890" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//       <bpmndi:BPMNShape id="TextAnnotation_1bu2yv1_di" bpmnElement="TextAnnotation_1bu2yv1">
//         <dc:Bounds x="600" y="190" width="100" height="41" />
//         <bpmndi:BPMNLabel />
//       </bpmndi:BPMNShape>
//     </bpmndi:BPMNPlane>
//   </bpmndi:BPMNDiagram>
// </bpmn:definitions>
// `
//
// async function check(xml) {
//     try {
//         const { rootElement } = await moddle.fromXML(xml);
//         const lintResults = await linter.lint(rootElement);
//
//         console.log('rootElement.$type:', rootElement?.$type);
//         console.log('has rootElements:', Array.isArray(rootElement?.rootElements), 'len:', rootElement?.rootElements?.length);
//
//         const issues = Object.entries(lintResults).map(([ruleName, reports]) => ({
//             rule: ruleName,
//             reports: reports.map(report => ({
//                 id: report.id,
//                 message: report.message,
//                 documentationLink: report.meta?.documentation?.url,
//                 category: report.category
//             }))
//         }));
//
//         const hasError = issues.some(issue =>
//             issue.reports.some(r => r.category === 'error')
//         );
//
//         return {
//             status: hasError ? 'error' : 'ok',
//             issues
//         };
//
//     } catch (err) {
//         console.error('Lint processing error:', err);
//     }
// }
//
// const result = await check(bpmn);
// console.log(result);