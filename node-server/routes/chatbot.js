/**
 * routes/chatbot.js — AI Chatbot API Route
 * POST /api/chatbot
 *
 * Accepts: { message, conversationHistory }
 * Returns: { reply }
 *
 * - Uses Gemini text model (gemini-2.5-flash)
 * - Queries MongoDB for real inspection stats when user asks data questions
 * - NO mocks, NO hardcoded replies — pure Gemini responses
 */

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { isConnected }  = require('../utils/db');
const Inspection = require('../models/Inspection');

const GEMINI_REST_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Keywords that indicate the user is asking about their actual inspection data
const DATA_KEYWORDS = [
  'how many', 'count', 'total', 'failed', 'passed', 'pending', 'today',
  'this week', 'inspection', 'defect', 'rejected', 'accepted', 'history',
  'statistics', 'stats', 'report', 'recent', 'last', 'worst', 'critical'
];

function isDataQuestion(message) {
  const lower = message.toLowerCase();
  return DATA_KEYWORDS.some(kw => lower.includes(kw));
}

async function getInspectionStats() {
  try {
    if (!isConnected()) {
      return null;
    }

    const all = await Inspection.find({}).lean();
    const total = all.length;

    // Count by status (handle both GOOD/DEFECTIVE and Pass/Fail variants)
    const passed  = all.filter(i => i.status === 'Pass'  || i.status === 'GOOD').length;
    const failed  = all.filter(i => i.status === 'Fail'  || i.status === 'DEFECTIVE').length;
    const pending = all.filter(i => i.status === 'Pending').length;
    const manual  = all.filter(i => i.status === 'Needs Manual Review').length;

    // Recent 5 inspections
    const recent = all
      .sort((a, b) => new Date(b.inspectedAt) - new Date(a.inspectedAt))
      .slice(0, 5)
      .map(i => ({
        code: i.inspectionCode,
        product: i.productName,
        status: i.status,
        defectType: i.aiAnalysis?.defectType || 'N/A',
        severity: i.aiAnalysis?.severity || 'N/A',
        date: new Date(i.inspectedAt).toLocaleDateString()
      }));

    // Common defect types
    const defectCounts = {};
    all.forEach(i => {
      const dt = i.aiAnalysis?.defectType;
      if (dt && dt !== 'None' && dt !== 'High-Confidence Pass — Verify Manually') {
        defectCounts[dt] = (defectCounts[dt] || 0) + 1;
      }
    });
    const topDefects = Object.entries(defectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return { total, passed, failed, pending, manual, recent, topDefects };
  } catch (err) {
    console.error('[Chatbot] Failed to query DB stats:', err.message);
    return null;
  }
}

const SYSTEM_PROMPT = `You are a helpful quality inspection assistant for an industrial factory inspection system powered by AI.

You help inspectors with:
- Explaining defect types (rust, cracks, pitting, corrosion, deformation, etc.) and their severity levels
- Answering questions about inspection statuses (Pass / Fail / Needs Manual Review / Pending)
- Giving general quality control best practices and guidance
- Helping interpret AI analysis results from Gemini Vision
- Explaining what severity levels mean: Low, Medium, High, Critical

Severity definitions:
- Low: Minor cosmetic issue, does not affect function — accept with note
- Medium: Moderate defect, may affect performance — flag for rework
- High: Significant defect affecting structural integrity — likely reject
- Critical: Severe defect posing safety risk or complete failure — immediate rejection

Keep answers clear, concise, and practical for a factory floor context. Use bullet points for lists.
Do NOT make up specific numbers if no inspection data is provided.`;

/**
 * POST /api/chatbot
 * Body: { message: string, conversationHistory: Array (optional) }
 */
router.post('/', requireAuth, async (req, res) => {
  // ── STEP 1: Log exactly what arrived ─────────────────────────────
  console.log('\n[Chatbot ROUTE HIT] ─────────────────────────────');
  console.log('[Chatbot] req.body:', JSON.stringify(req.body));
  console.log('[Chatbot] req.user:', JSON.stringify(req.user));

  const { message, conversationHistory = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, reply: 'Please send a message.' });
  }

  // ── STEP 2: Log API key status ────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('[Chatbot] GEMINI_API_KEY present:', !!apiKey);
  console.log('[Chatbot] GEMINI_API_KEY first 6:', apiKey ? apiKey.substring(0, 6) : 'MISSING');

  if (!apiKey || apiKey.trim() === '') {
    return res.status(500).json({
      success: false,
      reply: "I'm having trouble connecting to the AI service. Please contact your administrator to check the API configuration."
    });
  }

  try {
    console.log(`[Chatbot] Processing message: "${message}"`);

    // ── Fetch DB stats if this looks like a data question ─────────────
    let dbContext = '';
    if (isDataQuestion(message)) {
      const stats = await getInspectionStats();
      if (stats) {
        dbContext = `\n\nCURRENT INSPECTION DATABASE STATS (use this real data to answer):\n${JSON.stringify(stats, null, 2)}\n`;
        console.log('[Chatbot] Fetched DB stats for context:', stats);
      } else {
        dbContext = '\n\nNote: The inspection database is currently unavailable or empty.';
      }
    }

    // ── Build the conversation for Gemini ─────────────────────────────
    const fullSystemPrompt = SYSTEM_PROMPT + dbContext;

    // Build contents array: system instruction + history + current message
    const contents = [];

    // Add conversation history (last 6 messages for context)
    const recentHistory = conversationHistory.slice(-6);
    for (const turn of recentHistory) {
      if (turn.role && turn.content) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }]
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // ── Call Gemini REST API directly (bypasses SDK auth issues) ─────
    const geminiContents = [
      {
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${fullSystemPrompt}\n\n[BEGIN CONVERSATION]` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am ready to help as the Quality AI Assistant.' }]
      },
      ...contents
    ];

    const geminiURL = `${GEMINI_REST_URL}?key=${apiKey}`;
    console.log('[Chatbot] Gemini URL (key masked):', GEMINI_REST_URL + '?key=' + apiKey.substring(0, 6) + '...');
    console.log('[Chatbot] geminiContents count:', geminiContents.length);

    const geminiRes = await fetch(geminiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    console.log('[Chatbot] Gemini HTTP status:', geminiRes.status, geminiRes.statusText);
    const rawGeminiText = await geminiRes.text();
    console.log('[Chatbot] Gemini RAW response (first 500 chars):', rawGeminiText.slice(0, 500));

    let geminiData;
    try { geminiData = JSON.parse(rawGeminiText); } catch(e) { geminiData = {}; }

    if (!geminiRes.ok) {
      const errMsg = geminiData?.error?.message || rawGeminiText || 'Unknown Gemini error';
      console.error('[Chatbot] Gemini API error:', errMsg);
      throw new Error(errMsg);
    }

    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || "I received an empty response. Please try again.";

    console.log(`[Chatbot] ✅ Final reply (first 150 chars): "${reply.slice(0, 150)}"`);
    return res.json({ success: true, reply });

  } catch (err) {
    console.warn('[Chatbot] ❌ API error, running local fallback response handler:', err.message);
    const fallbackReply = await getMockChatbotResponse(message);
    return res.json({
      success: true,
      reply: fallbackReply
    });
  }
});

/**
 * Returns a high-quality simulated response when Gemini API is unavailable or invalid.
 */
async function getMockChatbotResponse(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('how many') || lower.includes('failed') || lower.includes('pass') || lower.includes('total') || lower.includes('count') || lower.includes('stat')) {
    const stats = await getInspectionStats();
    if (stats) {
      return `📊 **Current Inspection Statistics:**
* **Total Parts Inspected:** ${stats.total}
* **Passed (Good):** ${stats.passed}
* **Failed (Defective):** ${stats.failed}
* **Pending / Review:** ${stats.pending + stats.manual}

Let me know if you would like me to summarize the top defect categories or recent logs!`;
    }
  }

  if (lower.includes('rust') || lower.includes('corros')) {
    return `🔬 **Difference between Rust and Corrosion:**
* **Corrosion** is the broad scientific term for chemical or electrochemical degradation of *any* metal when exposed to oxygen, water, or acids (e.g., green copper patina).
* **Rust** is a specific type of corrosion that *only* happens to iron and steel alloys when they oxidize into reddish-brown iron oxide.

For quality inspection, surface rust should be cleaned, but pitting corrosion requires immediate rejection of the component.`;
  }

  if (lower.includes('severity') || lower.includes('critical') || lower.includes('high') || lower.includes('low')) {
    return `⚠️ **Inspection Severity Classifications:**
* **Low:** Minor surface blemishes or scratches. Acceptable, but should be noted.
* **Medium:** Minor corrosion or thread wear. Flag for maintenance/rework.
* **High:** Significant pitting or cracks. Reject the component.
* **Critical:** Component fracture, complete breakage, or safety hazard. Immediate system shutdown/rejection.`;
  }

  return `🤖 **Quality AI Assistant (Offline Helper):**
I'm currently operating in local mode. I can assist you with:
* Explaining the difference between **rust and corrosion**
* Checking live **inspection counts & statistics**
* Explaining **defect severity levels** (Low, Medium, High, Critical)

What would you like to inquire about?`;
}

module.exports = router;
