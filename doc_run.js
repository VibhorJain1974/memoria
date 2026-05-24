const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
    ShadingType, PageNumber, PageBreak, LevelFormat, TableOfContents
} = require('docx');
const fs = require('fs');

// Color palette
const DARK_BG = "0D0D0D";
const ACCENT_BLUE = "1A73E8";
const ACCENT_GREEN = "34A853";
const ACCENT_ORANGE = "FA7B17";
const ACCENT_RED = "EA4335";
const ACCENT_PURPLE = "9C27B0";
const ACCENT_TEAL = "009688";
const LIGHT_GRAY = "F5F5F5";
const MID_GRAY = "E0E0E0";
const DARK_GRAY = "333333";
const TEXT_SECONDARY = "666666";
const WHITE = "FFFFFF";

function spacer(before = 80, after = 80) {
    return { spacing: { before, after } };
}

function headingStyle(text, level, color = DARK_GRAY) {
    const sizes = { 1: 44, 2: 32, 3: 26, 4: 22 };
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: sizes[level] || 24, color, font: "Arial" })],
        spacing: { before: level === 1 ? 400 : 280, after: level === 1 ? 200 : 140 },
    });
}

function body(text, opts = {}) {
    return new Paragraph({
        children: [new TextRun({ text, size: 22, font: "Arial", color: opts.color || DARK_GRAY, bold: opts.bold, italics: opts.italic })],
        spacing: { before: 60, after: 100 },
    });
}

function killLine(text) {
    return new Paragraph({
        children: [
            new TextRun({ text: "KILL LINE: ", size: 22, bold: true, font: "Arial", color: WHITE }),
            new TextRun({ text, size: 22, font: "Arial", italics: true, color: WHITE }),
        ],
        spacing: { before: 120, after: 120 },
        shading: { fill: ACCENT_RED, type: ShadingType.CLEAR },
        indent: { left: 200, right: 200 },
    });
}

function labeledPara(label, text, labelColor = ACCENT_BLUE) {
    return new Paragraph({
        children: [
            new TextRun({ text: `${label}  `, size: 22, bold: true, font: "Arial", color: labelColor }),
            new TextRun({ text, size: 22, font: "Arial", color: DARK_GRAY }),
        ],
        spacing: { before: 80, after: 80 },
    });
}

function bullet(text) {
    return new Paragraph({
        children: [new TextRun({ text, size: 21, font: "Arial", color: DARK_GRAY })],
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 40, after: 40 },
    });
}

function scoreTable(scores, colW = 9360) {
    const cellW = Math.floor(colW / scores.length);
    const colorMap = { 10: ACCENT_GREEN, 9: ACCENT_GREEN, 8: ACCENT_BLUE, 7: ACCENT_BLUE, 6: ACCENT_ORANGE, 5: ACCENT_ORANGE };
    const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };

    const headerCells = scores.map(s => new TableCell({
        borders, width: { size: cellW, type: WidthType.DXA },
        shading: { fill: "2C3E50", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.label, size: 18, bold: true, font: "Arial", color: WHITE })] })]
    }));

    const valueCells = scores.map(s => {
        const fill = colorMap[s.value] || "888888";
        return new TableCell({
            borders, width: { size: cellW, type: WidthType.DXA },
            shading: { fill, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${s.value}/10`, size: 22, bold: true, font: "Arial", color: WHITE })] })]
        });
    });

    return new Table({
        width: { size: colW, type: WidthType.DXA },
        columnWidths: scores.map(() => cellW),
        rows: [new TableRow({ children: headerCells }), new TableRow({ children: valueCells })]
    });
}

function divider(color = MID_GRAY) {
    return new Paragraph({
        children: [new TextRun({ text: "", size: 4 })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color } },
        spacing: { before: 200, after: 200 },
    });
}

function pageBreak() {
    return new Paragraph({ children: [new PageBreak()] });
}

function sectionHeader(num, name, subtitle, color = ACCENT_BLUE) {
    return [
        pageBreak(),
        new Paragraph({
            children: [
                new TextRun({ text: `${num < 10 ? "0" + num : num}  `, size: 52, bold: true, font: "Arial", color: color }),
                new TextRun({ text: name, size: 52, bold: true, font: "Arial", color: DARK_GRAY }),
            ],
            spacing: { before: 300, after: 100 },
        }),
        new Paragraph({
            children: [new TextRun({ text: subtitle, size: 24, font: "Arial", color: TEXT_SECONDARY, italics: true })],
            spacing: { before: 0, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color } },
        }),
    ];
}

function techPillRow(techs) {
    const text = techs.join("   •   ");
    return new Paragraph({
        children: [new TextRun({ text: "TECH STACK: ", size: 19, bold: true, font: "Arial", color: TEXT_SECONDARY }),
        new TextRun({ text, size: 19, font: "Arial", color: ACCENT_BLUE })],
        spacing: { before: 80, after: 80 },
    });
}

// ============================================================
// PROJECT DATA
// ============================================================

const projects = [

    // ── CATEGORY 1: HUMANITARIAN COMMUNICATION ──────────────────
    {
        num: 1, name: "VANTA", color: ACCENT_PURPLE,
        category: "Communication · Covert / Censorship-Resilient",
        killLine: "It sounds like silence. It carries everything.",
        wound: "In Myanmar since 2021, 2,000+ journalists and civil society members have been arrested — not by breaking encryption, but by detecting that an encrypted communication occurred. Deep Packet Inspection identifies encrypted tunnels, VPN signatures, and Tor traffic fingerprints. Signal, Tor, VPNs all require a packet to flow. That packet is a death sentence in four countries today.",
        demo: "Two phones on a table. Airplane mode confirmed on both. An external microphone between them feeds the room speakers. Message typed on Phone A. Four seconds of room noise — air conditioning, fan hum. Nothing else. Message appears on Phone B. Decrypted. Complete. The judge asks: where did it go? Answer: through the air, above human hearing. No network packet. No radio band. No evidence a communication occurred.",
        what: "VANTA is a browser-based ultrasonic acoustic FSK modem. Text is Reed-Solomon error-corrected, encrypted via X25519 + XSalsa20-Poly1305 (TweetNaCl), and modulated into 18–22kHz audio — inaudible to humans but detectable by phone mics. A WASM-compiled FFT pipeline demodulates the signal on the receiver. 100–200 bps at 2–4m range. No network interface used. The medium is air.",
        techStack: ["Web Audio API FSK modem (18–22kHz)", "WASM FFT demodulation", "TweetNaCl X25519 encryption", "libfec Reed-Solomon FEC", "DCT steganographic fallback"],
        scores: [{ label: "Wow Factor", value: 10 }, { label: "Buildability", value: 9 }, { label: "Global Impact", value: 10 }, { label: "Originality", value: 10 }],
        buildability: "9/10 — Hardest: ultrasonic frequency response varies by device above 16kHz. Demo fix: pre-test two verified devices, tune FSK to their flat region.",
        fundedBy: "Open Technology Fund, Mozilla Foundation, Freedom of the Press Foundation, Access Now, EFF",
        impact: "10/10",
    },

    {
        num: 2, name: "SIGNAL / ECHO", color: ACCENT_TEAL,
        category: "Communication · Acoustic Mesh",
        killLine: "Send a message through a country that has turned off the internet.",
        wound: "196 documented internet shutdowns across 39 countries in 2023 alone affected 4.2 billion person-days of communication. During Iran's 2022 shutdowns, a 16-year-old girl died waiting for an ambulance her family could not call. Every circumvention tool requires packets to flow.",
        demo: "Judge unplugs demo laptop ethernet. Airplane mode on both phones. Presenter types a message. Inaudible chirp from speakers. Across the room, a second offline phone receives it. The chirp is broadcast through room speakers — every audience phone with the URL open receives it simultaneously.",
        what: "A web page using laptop speakers and microphone as an ultrasonic FSK modem (22–24kHz). Two phones in the same location exchange Reed-Solomon error-corrected encrypted messages over sound. Mesh extends via WebRTC over local Wi-Fi when one node has any internet. CRDTs ensure eventual delivery through any peer.",
        techStack: ["Web Audio API ultrasonic FSK modem", "Reed-Solomon FEC (WASM)", "libp2p gossipsub", "Automerge v2 CRDT", "TweetNaCl AES-256"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 6 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 10 }],
        buildability: "6/10 — Hardest: multipath interference from room echoes. Demo fix: drop to 10bps, use strong RS parity, pre-calculate message for reliability.",
        fundedBy: "Open Technology Fund, Signal Foundation, Internews",
        impact: "9/10",
    },

    {
        num: 3, name: "NULL", color: "555555",
        category: "Communication · Timing Protocol",
        killLine: "When the internet dies, your timing becomes the message.",
        wound: "Access Now documented 182 deliberate internet shutdowns in 2023. Iran 2019: 1,500 protesters killed with minimal international awareness — no information could escape. Every circumvention tool fights on the censor's terrain. Timing cannot be blocked without blocking all connectivity.",
        demo: "Timeline on screen. Day 1 at 09:03: green dot, 28 seconds. SAFE. Day 2: green. Day 3: expected window passes — nothing. UNKNOWN. Day 4: dot appears at 09:11, not 09:03. COMPROMISED. Day 5: the window time arrives. Silence. A blank line. Presenter: 'Her last message was Tuesday. She was in Belarus. She was a journalist.'",
        what: "A pre-shared AES-256 key generates a 30-day timing calendar via HKDF. Each 5-minute window maps to a specific meaning (SAFE / COMPROMISED / EMERGENCY). The sender only needs to exist online — browse any URL — during the correct window. No message content transmitted. No encryption to detect. No VPN to block.",
        techStack: ["WebCrypto API (HKDF + AES-256)", "IndexedDB encrypted storage", "Tor-over-WebRTC relay (optional)"],
        scores: [{ label: "Wow Factor", value: 8 }, { label: "Buildability", value: 9 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 10 }],
        buildability: "5/10 — Easiest technical build on the list. WebCrypto is native. HKDF is 15 lines. Check-in can be as simple as liking a shared post.",
        fundedBy: "Access Now, Open Technology Fund, Reporters Without Borders",
        impact: "8/10",
    },

    // ── CATEGORY 2: MEDICAL DIAGNOSTICS ──────────────────────────
    {
        num: 4, name: "ECHO / THORN", color: ACCENT_GREEN,
        category: "Medical Diagnostics · Respiratory",
        killLine: "800,000 children die from pneumonia yearly. The diagnosis needs a stethoscope. You already have one.",
        wound: "Pneumonia kills 2,200 children every single day. 99% of deaths occur in low-income countries. Community health workers see 80–120 patients daily with zero diagnostic tools. 1.4 billion people live more than two hours from a qualified physician. No one has ever shipped acoustic auscultation as a working browser app — despite three peer-reviewed papers proving the approach valid.",
        demo: "No slides. Presenter opens a URL on a judge's phone cold. Presses it to the judge's chest. Waveform moves on projection. Eight seconds. NORMAL — 94% confidence. Then a speaker plays a pre-recorded pneumonia audio sample. Phone held to speaker. BACTERIAL PNEUMONIA — 87% confidence. Screen turns amber. A judge in the front row is looking at their own phone.",
        what: "URL opens in any mobile browser. Press phone mic against chest through thin clothing. ECHO captures 30s via Web Audio API at 44.1kHz. A WASM-compiled ResNet-18 (ONNX Runtime Web, 12MB) performs real-time mel-spectrogram analysis: Normal / Viral LRTI / Bacterial Pneumonia / Bronchiolitis / Wheezing. Result in 8 seconds. Zero data leaves device. Works offline on 2019 Android.",
        techStack: ["ONNX Runtime Web (ResNet-18 on ICBHI 2017 dataset)", "Web Audio API 44.1kHz PCM", "Meyda.js spectral subtraction", "Transformers.js", "Service Worker PWA"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 8 }, { label: "Global Impact", value: 10 }, { label: "Originality", value: 8 }],
        buildability: "7/10 — ICBHI dataset is public. ONNX Runtime Web is well-documented. Acoustic demo can use prerecorded clinical samples.",
        fundedBy: "Bill & Melinda Gates Foundation, WHO Global Health Innovation Fund, Khosla Ventures",
        impact: "10/10",
    },

    {
        num: 5, name: "LUMIS", color: ACCENT_ORANGE,
        category: "Medical Diagnostics · Neonatal",
        killLine: "She has 8 hours before the brain damage is permanent.",
        wound: "120,000 neonates die or suffer permanent brain damage from untreated jaundice every year. A bilirubinometer costs $1,500–$4,000. There are 12 functional bilirubinometers in Tanzania. There are 1.2 million births per year in Tanzania. The b*-bilirubin correlation in CIELab color space is published in clinical literature — nobody in computer vision has read it.",
        demo: "Phone camera. MediaPipe Face Mesh locks — 468 landmarks. Scleral region isolates in blue box. Bilirubin index: 8.2 mg/dL. Green. Presenter switches to clinical photo of jaundiced neonate. Mesh locks. Number climbs: 23.4 mg/dL. RED: 'CRITICAL — phototherapy within 2 hours.' Phone offline the entire time. A judge holds a $4,000 bilirubinometer.",
        what: "MediaPipe Face Mesh WASM at 30fps isolates scleral landmark clusters. WebGL CIELab fragment shader extracts b* channel with ambient light normalization. Fitzpatrick scale invariance correction model (ONNX) removes melanin bias — fixing the documented clinical failure on dark-skinned neonates. Nonlinear regression to bilirubin risk tier. All in IndexedDB for longitudinal tracking with zero connectivity.",
        techStack: ["MediaPipe Face Mesh (WASM)", "WebGL CIELab b* fragment shader", "ONNX Fitzpatrick invariance model", "Service Worker offline-first", "Canvas 2D ambient calibration"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 7 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 9 }],
        buildability: "7/10 — Use published Wickremasinghe 2011 regression coefficients, label as screening tool, validate on clinical photos with known bilirubin values.",
        fundedBy: "UNICEF Health Technology Access, Grand Challenges Canada, Saving Lives at Birth (USAID/Gates)",
        impact: "9/10",
    },

    {
        num: 6, name: "VERA", color: ACCENT_BLUE,
        category: "Medical Diagnostics · General",
        killLine: "A medical diagnostic tool that works on an $80 phone without internet.",
        wound: "2 million people die annually from misdiagnosed, treatable infectious diseases in areas without medical infrastructure. A clinical stethoscope costs $30–500. The trained ear to interpret it costs five years of medical school.",
        demo: "Judge points camera at a skin lesion. App immediately displays diagnosis (Cutaneous Leishmaniasis) and treatment protocol with 98% accuracy — offline, in a basement, with zero network signal.",
        what: "Runs a custom-quantized Vision Transformer (ViT) entirely in the browser using TensorFlow.js and WASM acceleration. Medical data remains 100% private — never leaves device.",
        techStack: ["TensorFlow.js WASM", "Custom-quantized ViT", "Service Worker PWA", "IndexedDB"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 8 }, { label: "Global Impact", value: 10 }, { label: "Originality", value: 9 }],
        buildability: "8/10 — Vision transformer quantization is the key challenge. WASM inference pipeline is well-documented.",
        fundedBy: "MSF Innovation Arm, Wellcome Trust, Bill & Melinda Gates Foundation",
        impact: "10/10",
    },

    {
        num: 7, name: "VERUM", color: "8B4513",
        category: "Medical · Pharmaceutical Verification",
        killLine: "The pill that killed your child looked exactly like this one.",
        wound: "WHO estimates 169,000 children die every year from falsified pneumonia medicines alone. Counterfeiters replicate blister packs with perfect visual fidelity but substitute incorrect API concentrations. A pharmacist in Lagos or Dhaka has no tool at the point of dispensing. A lab authentication test costs $200 and takes two weeks.",
        demo: "Two identical blister packs of amoxicillin — same name, same lot number, same pharmacy. First pack: three spectral analysis bars fill in real time. GREEN: AUTHENTIC. Second pack: one bar goes red. WebGL overlay zooms into pill surface: 'COLOR DEVIATION: 4.2 ΔE outside authentic variance. EDGE GEOMETRY: −0.3mm. HIGH COUNTERFEIT PROBABILITY.' Phone in airplane mode the entire time.",
        what: "Camera captures blister pack against a printed calibration card. WASM MobileNetV3 pipeline extracts three fingerprint vectors: (1) CIELab color distribution normalized via WebGL; (2) geometric measurements from shadow differential across two frames; (3) DCT frequency analysis of print surface where counterfeit lossy-reprint artifacts appear in 8–24 cycles/mm band. Compared against cached WHO Essential Medicines fingerprint database (~40MB). Verdict in under 4 seconds.",
        techStack: ["ONNX Runtime Web + WASM SIMD (MobileNetV3)", "WebGL CIELab ΔE76 fragment shader", "MediaDevices multi-frame stereo capture", "Service Worker fingerprint DB cache"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 6 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 10 }],
        buildability: "6/10 — Hardest: building authentic fingerprint database for 10+ WHO essential medicines requires physically photographing verified samples across lighting conditions.",
        fundedBy: "USAID Global Health Supply Chain Program, Wellcome Trust AMR Fund, MSF Innovation",
        impact: "8/10",
    },

    // ── CATEGORY 3: DISASTER RESPONSE ────────────────────────────
    {
        num: 8, name: "CAIRN / PULSE / CHORUS", color: ACCENT_RED,
        category: "Disaster Response · P2P Rescue Coordination",
        killLine: "In the rubble, 12 rescue teams were searching for the same body.",
        wound: "Turkey-Syria 2023: 59,000 dead. Turkish DEMA documented a specific failure — in the 72-hour golden survival window, cellular failed within 3 hours. Rescue teams from different organizations unknowingly searched the same buildings while other sectors had zero coverage. INSARAG estimated 30–40% of recoverable survivors were not reached due to coordination failure, not inaccessibility.",
        demo: "Three phones in airplane mode. Same URL. Sync counter: '3 nodes. 0 entries.' Entries typed across all three simultaneously — different sectors, victims. All screens update in real time without a server: '3 nodes. 23 entries. 0 conflicts.' One phone disconnected. More entries added. Reconnected. Three-second pause. '3 nodes. 47 entries. 0 conflicts. All states merged.' MapLibre shows 47 GPS pins — red, yellow, green by triage status. A gap in the northeast quadrant: no pins. No team searched there.",
        what: "Any rescuer opens URL. Service Worker caches app on first load. WebRTC Data Channels form P2P mesh via mDNS. All state — triage cards, GPS sectors, survivor status — stored in Yjs CRDT and propagated via gossipsub pubsub. Offline: IndexedDB. Reconnect: Automerge v2 merges all divergent states deterministically. UI: MapLibre satellite overlay with status-colored GPS pins and sector coverage heatmap.",
        techStack: ["Yjs CRDT over WebRTC Data Channels", "Automerge v2 state reconciliation", "Web Bluetooth BLE relay", "MapLibre GL offline tile cache", "mDNS peer discovery", "libp2p gossipsub"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 7 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 9 }],
        buildability: "6/10 — Hardest: WebRTC peer discovery without signaling server. Demo fix: lightweight Node.js signaling server on a laptop as local hub — architecturally honest, physically unplugable.",
        fundedBy: "OCHA, USAID DART, Japan JICA, FEMA Next Generation Incident Command System",
        impact: "9/10",
    },

    {
        num: 9, name: "AURA", color: "FF6600",
        category: "Disaster Response · Structural Collapse Detection",
        killLine: "Your phone detects the specific acoustic signature of an impending building collapse.",
        wound: "80% of earthquake deaths occur because people remain inside failing structures after the main shock. Zero citizens have real-time structural health monitoring. Current SHM requires $50,000 piezoelectric sensor arrays bolted into concrete.",
        demo: "A phone rests on a table displaying a flat line. A judge taps the table — the visualization spikes into a violent vivid red, triggering an immediate 'EVACUATE' alert before any damage is visible.",
        what: "Uses the phone's high-frequency accelerometer as a seismometer, performing real-time FFT analysis in the browser to match vibrations against structural failure signatures. MEMS accelerometers have noise floors low enough to detect ambient structural vibrations — no hardware installation required.",
        techStack: ["DeviceMotion API high-freq accelerometer", "WASM FFT pipeline (real-time)", "Meyda.js audio feature extraction", "Service Worker offline"],
        scores: [{ label: "Wow Factor", value: 10 }, { label: "Buildability", value: 7 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 9 }],
        buildability: "7/10 — Noise robustness across varied phone hardware is the primary challenge.",
        fundedBy: "FEMA, JICA, World Bank Disaster Risk Financing",
        impact: "9/10",
    },

    {
        num: 10, name: "TREMOR / KEEL", color: "8B0000",
        category: "Disaster Response · Structural Safety Assessment",
        killLine: "The building looks fine. 40% of earthquake deaths happen after the shaking stops.",
        wound: "Turkey 2023: 41% of fatalities occurred to people re-entering damaged structures to retrieve belongings. Turkey has 12,000 structural engineers for 85 million people. After the 2023 event, inspection queue: 480,000 buildings. At 10 inspections/engineer/day, full clearance takes 13 years. People do not wait 13 years.",
        demo: "Phone held to Turkey 2023 aftermath photo. Overlay fires: orange bounding boxes around shear cracks. Screen turns red: DO NOT ENTER. Then acoustic test on conference room wall: tap, graph appears, normal resonance, SAFE. Final image: red screen, cracked building circled in orange. Every judge does the math: 480,000 buildings, 13 years, 30-second scan.",
        what: "Three simultaneous sensor analyses: (1) VISUAL — TensorFlow.js MobileNet-V3 real-time crack detection, WebGL overlay; (2) ACOUSTIC — FFT extracts dominant resonant frequency; structurally compromised concrete resonates differently (acoustic emission principle validated since 1975); (3) INERTIAL — accelerometer reads ambient micro-vibrations. Three signals → SAFE / CAUTION / DO NOT ENTER.",
        techStack: ["TensorFlow.js MobileNet-V3", "Web Audio API FFT pipeline", "WASM signal processing (40x faster than JS)", "WebGL AR-style overlay", "WebShare API GPS photo sharing"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 7 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 9 }],
        buildability: "7/10 — Visual detection achievable with ASCE 2019 public dataset. Acoustic test calibrated for one surface type for demo.",
        fundedBy: "JICA, USAID OFDA, Build Change, Munich Re",
        impact: "8/10",
    },

    // ── CATEGORY 4: IDENTITY & PRIVACY ───────────────────────────
    {
        num: 11, name: "IRIS / HAVEN / VEIL", color: ACCENT_PURPLE,
        category: "Identity & Privacy · Zero-Knowledge Credentials",
        killLine: "Prove your identity or qualifications to rescuers without ever revealing your personal data.",
        wound: "117 million people are forcibly displaced worldwide (UNHCR 2024). They lose bank accounts, medical history, education credentials, and the right to work at their skill level. In Germany alone, 300,000 skilled refugees work below qualification due to unprovable credentials. Every blockchain identity project puts data on-chain: visible, traceable, seizable.",
        demo: "A judge scans a QR code. Screen shows: 'VERIFIED: Medical degree. Cardiologist. No further information available.' Presenter: 'That clinic knows she is qualified. They do not know her name. They do not know where she is from. They do not know where she lives.' Pause. 'She is working. She is safe.'",
        what: "Zero-knowledge credential wallet. Noir (Aztec's ZK DSL) compiled to WASM generates Groth16 proofs in-browser in <4 seconds. Proof: 'this person holds a medical degree' without revealing country, university, or any linkable identifier. Social attestation: five vouchers co-sign via threshold signatures. Nothing on-chain except the verification key. Proof lives entirely on user's device.",
        techStack: ["SnarkJS Groth16 WASM prover (<5s)", "TLSNotary attestation", "Semaphore anonymous group membership", "WebCrypto / WebAuthn biometric binding", "IPFS credential storage"],
        scores: [{ label: "Wow Factor", value: 8 }, { label: "Buildability", value: 7 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 10 }],
        buildability: "9/10 — Hardest: writing circom circuits targeting specific JSON responses. Demo fix: use one specific predictable API or controlled mock-bank server.",
        fundedBy: "UNHCR Innovation Fund, European Innovation Council, a16z crypto, Open Society Foundations",
        impact: "8/10",
    },

    {
        num: 12, name: "WITNESS", color: "2C3E50",
        category: "Identity & Privacy · Evidence Preservation",
        killLine: "Prove a war crime happened. Reveal nothing about who you are.",
        wound: "459,000 civilians killed in conflicts since 2010. Of videos uploaded to document them, 73% deleted within 6 weeks — platform takedowns, source death, or device seizure. The witness dies before the evidence does.",
        demo: "Judge films the room. URL generates a 2KB proof. Demonstrator scrambles the phone, deletes the video, factory-resets on stage. Opens a fresh laptop. Pastes the proof. Proof verifies. The video is gone but the truth survived.",
        what: "A journalist or refugee films something. Browser generates a Groth16 proof binding the video hash to GPS, time, device sensor entropy, and a TLSNotary attestation that the upload reached a public endpoint. Proof anchored via OpenTimestamps to Bitcoin blockchain (as public timestamp service only). Witness identity never revealed. Verifiable by any court or tribunal.",
        techStack: ["SnarkJS Groth16 WASM prover", "TLSNotary", "OpenTimestamps / Bitcoin", "Semaphore ZK group membership", "WebCrypto / WebAuthn"],
        scores: [{ label: "Wow Factor", value: 10 }, { label: "Buildability", value: 7 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 9 }],
        buildability: "7/10 — TLSNotary + Groth16 proof generation combined is the primary complexity. Demo timing must be managed.",
        fundedBy: "Open Society Foundations, Reporters Without Borders, Aztec / 0xParc grants",
        impact: "8/10",
    },

    // ── CATEGORY 5: EARTH & ENVIRONMENT ──────────────────────────
    {
        num: 13, name: "CANOPY / VIGIL", color: ACCENT_GREEN,
        category: "Agriculture · Satellite Crop Failure Prediction",
        killLine: "The satellite watched your harvest die for six weeks. No one told you.",
        wound: "100,000 Indian farmers have died by suicide over the past decade — 87% in the post-harvest-failure window. NDVI spectral data from Sentinel-2 detects crop stress 3–6 weeks before visible failure. That gap is the intervention window. Sentinel-2 covers every agricultural field every 5 days. The data is free, public, updated near-real-time. It has never been surfaced to the farmer whose field it shows.",
        demo: "URL opens. GPS locks. MapLibre renders NDVI layer. Time slider appears: 90 days of Sentinel-2 passes. Slide backward: map was green six weeks ago. Yellow now. NDVI velocity line shows trajectory. 'Projected yield at current decline rate: 31% of expected.' Then real coordinates of a Vidarbha field are entered live. Same curve. Same number. A farmer is standing in that field right now. It looks fine to him.",
        what: "GPS auto-detects field or farmer drops pin. ESA Copernicus STAC API returns last 18 Sentinel-2 passes for that polygon. WebGL shader computes NDVI per pixel: (B8−B4)/(B8+B4). Temporal heatmap: 90 days. Linear regression calculates NDVI velocity. If velocity crosses crop-specific decline threshold (local JSON lookup, 40 crop types): red alert — days to projected yield threshold, two recommended interventions, nearest extension service number.",
        techStack: ["ESA Copernicus Sentinel-2 STAC API", "MapLibre GL WebGL tile renderer", "WASM phenology model", "Yjs CRDT offline sync", "NASA FIRMS active fire overlay", "Web Speech API (multilingual TTS)"],
        scores: [{ label: "Wow Factor", value: 8 }, { label: "Buildability", value: 6 }, { label: "Global Impact", value: 10 }, { label: "Originality", value: 8 }],
        buildability: "5/10 — Hardest: Sentinel-2 API rate limits under demo conditions. Fix: pre-cache 3–4 field coordinates the night before.",
        fundedBy: "Bill & Melinda Gates Foundation Agriculture, CGIAR CIMMYT, ESA Phi-lab, Acumen",
        impact: "9/10",
    },

    {
        num: 14, name: "TERRA", color: "1B6CA8",
        category: "Environment · Water Contamination Detection",
        killLine: "Detect toxic water contamination in your village in real-time, from space.",
        wound: "1.5 billion people consume contaminated water, causing 500,000 deaths annually. Detection is currently too slow and centralized — it takes months to confirm what satellites can show in days.",
        demo: "The judge enters a village name. The screen instantly shows a live map using satellite data, pinpointing a toxic reservoir in bright red — data that usually takes months to confirm.",
        what: "Processes Sentinel-2 spectral imagery in the browser via WebGL shaders, calculating the NDWI (Normalized Difference Water Index) to identify quality anomalies. All computation local, results immediate.",
        techStack: ["Sentinel-2 API", "WebGL NDWI shaders", "MapLibre GL", "Copernicus data pipeline"],
        scores: [{ label: "Wow Factor", value: 7 }, { label: "Buildability", value: 6 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 8 }],
        buildability: "6/10 — WebGL spectral band math is straightforward. Primary challenge is satellite data latency.",
        fundedBy: "World Bank Water Global Practice, USAID WaterLinks, UNICEF WASH",
        impact: "8/10",
    },

    {
        num: 15, name: "SENTRY", color: "#E67E22",
        category: "Environment · Wildfire Defense",
        killLine: "Your neighbor's dead brush is your burning house. Here's the map that proves it.",
        wound: "80% of homes lost in wildfires are destroyed by ember cast — burning debris carried up to 2km ahead of the fire front. Ember-resistant venting costs $50/home. Average California homeowner spends $0 on it. In 2023: 28,000+ California homes burned. The failure is that the collective consequence of individual inaction is invisible until the fire arrives.",
        demo: "SENTRY opens to Paradise, CA — Camp Fire site. Parcels appear as tiles, mostly grey. START SIMULATION: Rothermel fire wave rolls through in 15 seconds. 94% of the neighborhood burns. Real addresses. Real houses that burned in 2018. New scenario: every home cleared brush and ember vents. Fire wave hits green tiles and stalls. 40% survives. Two simulations. Same neighborhood. Two futures. Variable: $50.",
        what: "Maps real neighborhood as a tower-defense game board using actual parcel data. Each home's defense level calculated from Sentinel-2 NDVI analysis of vegetation clearance + user-reported actions. Neighbor's uncleared tree 40m away reduces your HP by 11 points — shown live. Real actions raise HP and improve neighbors' scores. Collective resilience score. Fire season countdown. Leaderboard.",
        techStack: ["Sentinel-2 NDVI via Copernicus API", "Rothermel fire spread physics (WASM)", "MapLibre GL 3D neighborhood view", "Web Push API notifications"],
        scores: [{ label: "Wow Factor", value: 7 }, { label: "Buildability", value: 8 }, { label: "Global Impact", value: 7 }, { label: "Originality", value: 8 }],
        buildability: "6/10 — Easiest build in the environment category. Copernicus API is free and documented. Pre-load Paradise, CA parcel data for demo.",
        fundedBy: "CAL FIRE Innovation Fund, US Forest Service, State Farm & Allianz",
        impact: "7/10",
    },

    {
        num: 16, name: "SWELL", color: "005B96",
        category: "Environment · Flood Prediction",
        killLine: "She had four hours. The official forecast said the flood would miss her.",
        wound: "Pakistan 2022 floods: 33 million displaced, 1,739 killed. Official inundation forecasts showed the event at 10km basin-level resolution. A village 3km from the predicted safe boundary flooded in 6 hours with no warning. Shallow water equation simulation at street-level resolution has never left the supercomputer. It is now possible in a browser.",
        demo: "3D terrain map. River valley. Slider: 'River level +4m.' Water flows — not uniformly, but down every drainage channel and road cut. Buildings turn orange: 'Primary school: T+1h 40min.' A clock counts up. Then: August 27 2022 Sindh river gauge data loaded. Simulation matches documented inundation boundary within one grid cell. A blue box: official 'safe zone.' The gap is 3km. 11 people died in that gap. The data existed on August 26th.",
        what: "SRTM 30m DEM tiles via public CDN. WebGPU WGSL compute shaders run simplified 2D diffusion-wave shallow water equations on the DEM grid — water depth and velocity per 30m cell per 5-second timestep. Babylon.js renders terrain mesh with dynamic water surface at 60fps. OpenStreetMap building footprints overlaid with per-structure inundation timing. USGS/OpenHydro river gauge WebSocket feed for live updates.",
        techStack: ["WebGPU WGSL compute shaders (SWE simulation)", "SRTM 30m DEM tiles", "Babylon.js terrain renderer", "OpenStreetMap building footprints", "USGS river gauge WebSocket"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 8 }, { label: "Global Impact", value: 8 }, { label: "Originality", value: 9 }],
        buildability: "8/10 — WebGPU stable in Chrome 113+ only. Demo fix: dedicated GPU laptop, Chrome browser, pre-cache DEM tiles, limit to 10km² domain.",
        fundedBy: "Google.org Crisis Response, Bezos Earth Fund, USAID Climate Change, World Bank DRFI",
        impact: "8/10",
    },

    {
        num: 17, name: "FLORA", color: "4A7C59",
        category: "Humanitarian · Landmine Detection",
        killLine: "Your phone's compass just became a landmine detector.",
        wound: "2024: 6,279 casualties from unexploded ordnance globally — highest since 2020. 90% of victims were civilians, nearly half were children. Demining requires $5,000 metal detectors and dangerous slow sweeps. Traditional detectors beep on amplitude — any metal triggers them. FLORA analyzes the morphology of the magnetic field disruption over time.",
        demo: "Phone sweeps over sandbox. Steel bolts and scrap: screen stays grey. Move to deactivated PFM-1 butterfly mine replica: screen snaps to blaring red, GPS locked. The room realizes the phone just differentiated between harmless trash and high explosives based purely on microscopic magnetic field distortions.",
        what: "Every smartphone has a 3-axis magnetometer capable of measuring µT fluctuations. FLORA captures raw magnetic flux data continuously as user walks. Real-time magnetic distortion waveform fed into a lightweight ONNX neural net running locally in the browser. AI classifies specific magnetic perturbation signature of a landmine's firing pin and casing geometry, filtering out standard scrap metal noise.",
        techStack: ["HTML5 Magnetometer API", "ONNX Runtime Web (quantized MobileNetV3)", "GPS coordinate locking", "IndexedDB hazard map storage"],
        scores: [{ label: "Wow Factor", value: 9 }, { label: "Buildability", value: 8 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 9 }],
        buildability: "8/10 — Hardest: managing baseline noise in smartphone magnetometers. Demo fix: train model exclusively on the specific mine replica and auditorium environment.",
        fundedBy: "HALO Trust, GICHD, Defense Innovation Unit (DIU)",
        impact: "9/10",
    },

    // ── CATEGORY 6: COMPUTE & SCIENCE ────────────────────────────
    {
        num: 18, name: "ASCEND", color: ACCENT_PURPLE,
        category: "Science · Distributed Drug Discovery",
        killLine: "A drug discovery laboratory that runs in a browser tab on your school laptop.",
        wound: "1.27 million people die annually from antimicrobial-resistant bacterial infections. Drug discovery costs $2.6B per molecule and 12 years per cycle. There are an estimated 10^60 possible drug-like molecules; humanity has tested ~10^8. The bottleneck is not biology — it is compute, locked in pharma. A 17-year-old in Lagos with a Chromebook has access to zero of it.",
        demo: "Browser opens. 3D protein folds in real time — generated by laptop GPU, no cloud. Drag candidate molecule into binding pocket. Audience opens same URL. Counter: 1 GPU → 200 GPUs as audience joins. Binding affinities scroll. Green hit lights up. 'Citizen team #4413 just docked a candidate against MRSA. Compute cost: $0.'",
        what: "WebGPU compute shader implementation of AlphaFold-style protein folding + AutoDock Vina molecular docking, running entirely on user's GPU. Distributed across browser tabs via WebRTC, forming a citizen supercomputer. Student picks antibiotic-resistant pathogen, browses 10M candidate molecules, sees real-time binding affinity, submits top hit to public open-science queue.",
        techStack: ["WGSL compute shaders (ESMFold transformer attention)", "AutoDock Vina WASM port", "Three.js molecular visualization", "WebRTC peer compute pool", "libp2p result aggregation", "Rust + wasm-pack"],
        scores: [{ label: "Wow Factor", value: 10 }, { label: "Buildability", value: 9 }, { label: "Global Impact", value: 10 }, { label: "Originality", value: 10 }],
        buildability: "9/10 — Hardest: making WebGPU folding numerically stable at 4-bit quantization.",
        fundedBy: "Schmidt Futures, Chan Zuckerberg Biohub, Astellas Pharma Innovation, Wellcome Leap",
        impact: "10/10",
    },

    {
        num: 19, name: "NOVA", color: ACCENT_TEAL,
        category: "Science · Pandemic Simulation",
        killLine: "A full-scale epidemiological contagion model running in your browser to stop a pandemic.",
        wound: "Pandemic detection is reactive, not proactive. Every hour of delay in the first 72 hours costs millions of lives and trillions in economic loss.",
        demo: "Judge hits 'Run Simulation.' Screen instantly erupts into a massive real-time particle simulation showing how a virus will spread from a single point across a city in 14 days, computed at 60 FPS in a browser tab.",
        what: "Massively parallel simulation kernels using WebGPU compute shaders. Agent-based epidemic modeling (SIR + spatial) running on consumer GPU. Enables predictive modeling that previously required supercomputers.",
        techStack: ["WebGPU compute shaders", "WGSL epidemic kernels", "Three.js particle visualization", "GeoJSON city mesh data"],
        scores: [{ label: "Wow Factor", value: 10 }, { label: "Buildability", value: 9 }, { label: "Global Impact", value: 10 }, { label: "Originality", value: 10 }],
        buildability: "9/10 — WebGPU agent simulation is tractable. Primary challenge: scaling to realistic city-scale agent counts at 60fps.",
        fundedBy: "WHO Innovation Fund, Chan Zuckerberg Initiative, NIH, DARPA",
        impact: "10/10",
    },

    // ── CATEGORY 7: INFRASTRUCTURE ───────────────────────────────
    {
        num: 20, name: "RESONATE", color: "795548",
        category: "Infrastructure · Bridge Structural Health Monitoring",
        killLine: "A crowdsourced seismometer that detects bridge collapses using smartphone microphones.",
        wound: "45,000 bridges in the US are officially structurally deficient. The population crosses them 171.5 million times daily. Current SHM requires $50,000 piezoelectric arrays. Catastrophic bridge failures result in mass casualties because microscopic fractures shift natural resonant frequency over months — undetected.",
        demo: "Phone on acrylic bridge model. Steel cylinder rolls: smooth green waveform. Presenter silently snaps a hairline fracture into one strut — invisible to audience. Cylinder rolls again. Green waveform violently distorts in silence, immediately flashing crimson: mathematical isolation of the exact frequency shift of structural death. The phone just heard the bridge dying.",
        what: "DeviceMotion API + microphone capture acoustic and vibrational resonance of structure. WASM FFT pipeline isolates fundamental frequency of the bridge, strips vehicle engine noise via spectral subtraction, detects micro-hertz deviations from historical baseline. Every commuter becomes a calibrated structural diagnostic node.",
        techStack: ["DeviceMotion API + microphone", "WASM FFT pipeline (real-time)", "Meyda.js audio feature extraction", "Decentralized public frequency ledger"],
        scores: [{ label: "Wow Factor", value: 8 }, { label: "Buildability", value: 6 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 8 }],
        buildability: "6/10 — Hardest: spectral subtraction to isolate structural reverberation from vehicle noise. Demo fix: pre-calculate acrylic model resonant frequencies.",
        fundedBy: "US DOT ARPA-I, FHWA Bridge Program",
        impact: "9/10",
    },

    // ── CATEGORY 8: PROJECT MANAGEMENT ──────────────────────────
    {
        num: 21, name: "DRIFT", color: ACCENT_BLUE,
        category: "B2B SaaS · Belief-State Project Management",
        killLine: "The first project management system that doesn't track work. It tracks what your team believes about work.",
        wound: "1.25 billion knowledge workers globally. McKinsey 2020: large IT projects run 45% over budget — root cause was misaligned expectations, not poor execution. HBR found 74% of cross-functional project failures trace to unresolved implicit assumptions. The specific victim: a cross-functional team of 4–12 people coordinating on Slack + Linear + Notion + Figma + GitHub simultaneously. Engineer A thinks 'v2 API' means auth included. PM thinks endpoints only. Conservative economic estimate: $2.3 trillion/year in coordination failures.",
        demo: "Judge looks at a live screen. Left: a Slack conversation from 4 days ago. Normal. Friendly. Productive. No red flags. Right: DRIFT's belief state comparison. Engineer A believes: 'v2 API = endpoints + auth, Friday = this Friday EOD, ready = deployed to staging.' Engineer B believes: 'v2 API = endpoints only, Friday = next Friday, ready = basic functionality.' Below both: red counter. COLLISION IN: 2.1 DAYS. Estimated rework cost: 3.4 engineering days. Intervention cost: 1 message. Judge clicks 'Send.' Counter disappears.",
        what: "Passive Slack + GitHub + Linear webhooks. For each team member, maintains a JSON belief-state about each project entity (deadline, scope, ownership, definition of done) — updated continuously by Claude Sonnet with extended context. Not RAG — an episodic memory architecture where new messages update existing beliefs. Every 15 minutes: compare belief states across all team members, flag divergences, classify as factual/interpretive/priority, assign a Collision Score. Causal intervention ranker outputs the minimum viable intervention: one message, one person, right moment.",
        techStack: ["Claude Sonnet API (extended context)", "Belief-state JSON episodic memory", "Slack / GitHub / Linear streaming webhooks", "Divergence detection engine", "Causal intervention ranker (Pearl do-calculus)", "Real-time collision dashboard"],
        scores: [{ label: "Wow Factor", value: 10 }, { label: "Buildability", value: 8 }, { label: "Global Impact", value: 9 }, { label: "Originality", value: 10 }],
        buildability: "8/10 — 24hr MVP: Slack only, 3 entity types, 1 live divergence with collision timer, 1 auto-generated intervention message. That is the demo.",
        fundedBy: "YC, a16z, Sequoia — Revenue model: $49/seat/month B2B SaaS (10-seat minimum). Secondary: Assumption Failure Database API ($50K–$200K/yr). Tertiary: Enterprise Epistemic Map ($200K–$500K/yr)",
        impact: "9/10",
    },

];

// ============================================================
// BUILD DOCUMENT
// ============================================================

function buildProject(proj) {
    const color = proj.color || ACCENT_BLUE;
    const header = sectionHeader(proj.num, proj.name, proj.category, color);

    const content = [
        ...header,
        killLine(proj.killLine),
        new Paragraph({ spacing: { before: 160, after: 0 } }),

        new Paragraph({ children: [new TextRun({ text: "THE WOUND", size: 20, bold: true, font: "Arial", color: color, allCaps: true })], spacing: { before: 160, after: 60 } }),
        body(proj.wound),

        new Paragraph({ children: [new TextRun({ text: "THE DEMO MOMENT", size: 20, bold: true, font: "Arial", color: color, allCaps: true })], spacing: { before: 160, after: 60 } }),
        body(proj.demo, { italic: true }),

        new Paragraph({ children: [new TextRun({ text: "WHAT IT ACTUALLY DOES", size: 20, bold: true, font: "Arial", color: color, allCaps: true })], spacing: { before: 160, after: 60 } }),
        body(proj.what),

        new Paragraph({ children: [new TextRun({ text: "TECH STACK", size: 20, bold: true, font: "Arial", color: color, allCaps: true })], spacing: { before: 160, after: 60 } }),
        ...proj.techStack.map(t => bullet(t)),

        new Paragraph({ spacing: { before: 140, after: 60 } }),
        scoreTable(proj.scores),

        new Paragraph({ spacing: { before: 140, after: 60 } }),
        labeledPara("BUILDABILITY", proj.buildability, color),
        labeledPara("FUNDED BY", proj.fundedBy, color),
        labeledPara("IMPACT IF IT WORKS", proj.impact, color),
    ];

    return content;
}

// Cover page
function coverPage() {
    return [
        new Paragraph({ spacing: { before: 1200, after: 200 } }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "FAR AWAY × ZUUP", size: 72, bold: true, font: "Arial", color: ACCENT_BLUE })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "21 IDEAS THAT COULD CHANGE EVERYTHING", size: 36, bold: true, font: "Arial", color: DARK_GRAY })],
            spacing: { before: 100, after: 200 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "International Open-Theme Hackathon  ·  Ages 15–25  ·  4,413 Teams Globally", size: 22, font: "Arial", color: TEXT_SECONDARY })],
            spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Compiled by FAR AWAY by Zuup  ·  May 2026", size: 20, font: "Arial", color: TEXT_SECONDARY, italics: true })],
            spacing: { before: 0, after: 400 },
        }),
        divider(ACCENT_BLUE),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "MISSION", size: 24, bold: true, font: "Arial", color: DARK_GRAY })],
            spacing: { before: 200, after: 120 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Build something that causes visible silence in the room the moment it is demoed.", size: 22, font: "Arial", color: DARK_GRAY, italics: true })],
            spacing: { before: 0, after: 400 },
        }),
        divider(MID_GRAY),
        // Summary table
        new Paragraph({
            children: [new TextRun({ text: "ALL 21 IDEAS AT A GLANCE", size: 24, bold: true, font: "Arial", color: DARK_GRAY })],
            spacing: { before: 200, after: 140 },
        }),
        ...buildSummaryTable(),
        pageBreak(),
    ];
}

function buildSummaryTable() {
    const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const colWidths = [600, 2600, 3200, 1480, 1480];
    const total = colWidths.reduce((a, b) => a + b, 0);

    function hCell(text) {
        return new TableCell({
            borders, width: { size: 600, type: WidthType.DXA },
            shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: 18, bold: true, font: "Arial", color: WHITE })] })]
        });
    }

    const headers = new TableRow({
        children: [
            new TableCell({ borders, width: { size: colWidths[0], type: WidthType.DXA }, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: "#", size: 18, bold: true, font: "Arial", color: WHITE })] })] }),
            new TableCell({ borders, width: { size: colWidths[1], type: WidthType.DXA }, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: "NAME", size: 18, bold: true, font: "Arial", color: WHITE })] })] }),
            new TableCell({ borders, width: { size: colWidths[2], type: WidthType.DXA }, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: "CATEGORY", size: 18, bold: true, font: "Arial", color: WHITE })] })] }),
            new TableCell({ borders, width: { size: colWidths[3], type: WidthType.DXA }, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "IMPACT", size: 18, bold: true, font: "Arial", color: WHITE })] })] }),
            new TableCell({ borders, width: { size: colWidths[4], type: WidthType.DXA }, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BUILD", size: 18, bold: true, font: "Arial", color: WHITE })] })] }),
        ]
    });

    const dataRows = projects.map((p, i) => {
        const impact = p.scores.find(s => s.label === "Global Impact");
        const wow = p.scores.find(s => s.label === "Wow Factor");
        const build = p.scores.find(s => s.label === "Buildability");
        const impactVal = impact ? impact.value : (parseInt(p.impact) || 8);
        const buildVal = build ? build.value : 7;
        const rowFill = i % 2 === 0 ? "F9F9F9" : WHITE;
        return new TableRow({
            children: [
                new TableCell({ borders, width: { size: colWidths[0], type: WidthType.DXA }, shading: { fill: rowFill, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: String(p.num).padStart(2, "0"), size: 18, bold: true, font: "Arial", color: p.color || ACCENT_BLUE })] })] }),
                new TableCell({ borders, width: { size: colWidths[1], type: WidthType.DXA }, shading: { fill: rowFill, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: p.name, size: 19, bold: true, font: "Arial", color: DARK_GRAY })] })] }),
                new TableCell({ borders, width: { size: colWidths[2], type: WidthType.DXA }, shading: { fill: rowFill, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: p.category, size: 18, font: "Arial", color: TEXT_SECONDARY })] })] }),
                new TableCell({ borders, width: { size: colWidths[3], type: WidthType.DXA }, shading: { fill: impactVal >= 9 ? "E8F5E9" : impactVal >= 7 ? "E3F2FD" : "FFF8E1", type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${impactVal}/10`, size: 19, bold: true, font: "Arial", color: impactVal >= 9 ? ACCENT_GREEN : ACCENT_BLUE })] })] }),
                new TableCell({ borders, width: { size: colWidths[4], type: WidthType.DXA }, shading: { fill: rowFill, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${buildVal}/10`, size: 19, font: "Arial", color: buildVal >= 8 ? ACCENT_GREEN : TEXT_SECONDARY })] })] }),
            ]
        });
    });

    return [new Table({
        width: { size: total, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [headers, ...dataRows],
    })];
}

// Build all content
const allChildren = [
    ...coverPage(),
    ...projects.flatMap(p => buildProject(p)),
];

const doc = new Document({
    numbering: {
        config: [{
            reference: "bullets",
            levels: [{
                level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }]
        }]
    },
    styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 40, bold: true, font: "Arial", color: DARK_GRAY },
                paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 28, bold: true, font: "Arial", color: DARK_GRAY },
                paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 }
            },
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        headers: {
            default: new Header({
                children: [new Paragraph({
                    children: [
                        new TextRun({ text: "FAR AWAY × ZUUP  —  Hackathon Idea Compendium", size: 18, font: "Arial", color: TEXT_SECONDARY }),
                        new TextRun({ text: "\t", size: 18 }),
                        new TextRun({ text: "May 2026", size: 18, font: "Arial", color: TEXT_SECONDARY }),
                    ],
                    tabStops: [{ type: "right", position: 9360 }],
                    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: MID_GRAY, space: 1 } },
                })]
            })
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "Page ", size: 18, font: "Arial", color: TEXT_SECONDARY }),
                        new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: TEXT_SECONDARY }),
                        new TextRun({ text: " of ", size: 18, font: "Arial", color: TEXT_SECONDARY }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: TEXT_SECONDARY }),
                    ],
                    border: { top: { style: BorderStyle.SINGLE, size: 2, color: MID_GRAY, space: 1 } },
                })]
            })
        },
        children: allChildren,
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync("e:/memoria/FAR_AWAY_Zuup_Hackathon_Compendium.docx", buffer);
    console.log("Done!");
});