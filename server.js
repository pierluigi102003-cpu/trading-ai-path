const express = require("express");
const fetch   = require("node-fetch");
const dotenv  = require("dotenv");
const path    = require("path");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "trading-path-ai-v3.html"));
});

// ─── Path routing (deterministic) ────────────────────────────────────────────

function inferPath({ budget, exp, risk, time }) {
  const b = parseInt(budget, 10);
  if (b < 300  && exp === "zero")                          return "demo";
  if (b >= 300 && b <= 1500 && exp !== "zero")             return "real";
  if (b > 1500 && time === "low")                          return "copy";
  if (b > 1500 && risk === "high" && exp === "advanced")   return "advanced";
  if (exp === "zero" || b < 300)                           return "demo";
  if (b < 1500)                                            return "real";
  return "copy";
}

// ─── System prompt (base) ─────────────────────────────────────────────────────

const SYSTEM_BASE = `You are a senior trading strategist and risk-focused onboarding advisor.
Your job is to deliver a precise, commercial-grade analysis of a trader's profile.

You are NOT a generic assistant. You are a specialist.
Every recommendation must be specific, decisive, and calibrated to the exact inputs provided.
Never use filler phrases like "it depends", "be disciplined", or "start small" without immediately following them with a concrete instruction.

ANTI-GENERIC RULES — violating these makes the output worthless:
- Never promise returns. Never imply trading is easy.
- Never give advice that could apply to any trader — every sentence must be specific to this profile.
- Every capital figure must reference the user's exact budget amount.
- Every risk figure must be a real percentage or dollar amount.
- The tone is professional and direct — like a private advisor, not a blog post.

CRITICAL — JSON OUTPUT CONTRACT:
Respond with ONLY a single raw JSON object. Absolutely no other text.
- NO markdown fences, NO backticks, NO code blocks
- NO text before the opening { or after the closing }
- NO JavaScript comments (// or /* */)
- NO trailing commas after the last element in any array or object
- All string values must be single-line — no literal newline characters inside quoted strings
- Escape internal double-quotes with backslash
- The raw response string must pass JSON.parse() with zero pre-processing

REQUIRED SCHEMA — all 7 keys, exact types:
{
  "profile":         "<2 sentences: who this trader is, what their binding constraint is, and what they must avoid>",
  "recommendedPath": "<3 sentences: the specific path, the strategic reason it fits this exact profile, and what alternative paths were ruled out and why>",
  "capitalPlan":     "<3 sentences: exact capital split using their real budget number, per-trade risk amount in dollars, and cash reserve rule>",
  "riskReality":     "<3 sentences: the specific failure mode most likely for this profile, the emotional trigger to watch for, and the circuit-breaker rule to install>",
  "plan30Days":      ["<Days 1-7: specific actions>","<Days 8-14: specific actions>","<Days 15-21: specific actions>","<Days 22-30: specific actions>","<Day 30 review: what to measure and decide>"],
  "nextStep":        "<2 sentences: state the recommended action with clarity and confidence — use 'based on your profile' framing — then name the one thing the user must NOT do before this step is done>",
  "ctaType":         "<exactly one of: demo | real | copy | advanced>"
}

ROUTING LOGIC — determine ctaType first, then let it govern the entire analysis tone:
- budget < $300 AND experience = zero → "demo"
- budget $300-$1500 AND experience = basic or advanced → "real"
- budget > $1500 AND time = low → "copy"
- budget > $1500 AND risk = high AND experience = advanced → "advanced"
- all other cases with budget > $1500 → "copy"
- all other cases → "real"`;

// ─── Path-specific prompt extensions ─────────────────────────────────────────

const PATH_PROMPTS = {
  demo: `
PATH CONTEXT — BEGINNER (Demo First):
This user has insufficient capital or experience for live trading. Your analysis must make the case for demo trading not as a consolation prize, but as the strategically correct decision.

Tone: Direct, encouraging without being patronizing. No hype.

Profile section must:
- Name the specific constraint (budget, experience, or both)
- State clearly what outcome live trading would produce at this stage
- Identify what skill gap must close before live trading is rational

recommendedPath must:
- Explain demo trading as a professional discipline tool, not a toy
- Name the specific timeframe and currency pairs to focus on (EUR/USD, GBP/USD on H4)
- State the minimum proficiency threshold before graduating to live (3 consecutive profitable demo weeks)
- Explicitly rule out live trading and give the exact reason

capitalPlan must:
- Keep the user's real budget in savings — zero deployment to trading now
- Set up demo with $10,000 virtual capital
- Specify the exact live starting amount when ready: $100-$200 max
- Give the per-trade risk in dollar terms (1% of $150 = $1.50)

riskReality must:
- Cite the 70-80% first-year retail loss rate
- Name the specific reason: going live before an edge is established
- Explain that demo removes the financial risk but not the emotional risk of a bad habit

plan30Days must be day-range specific actions, not vague weeks. Each entry must name a concrete deliverable.

nextStep must direct to the demo account with confidence: "Based on your profile, opening a demo account is the most efficient first step — it gives you live market access at zero cost while you build the edge that makes real capital productive." Never suggest going live first.`,

  real: `
PATH CONTEXT — STARTER (Live, Controlled):
This user has real capital and foundational knowledge. They are ready to trade live, but the primary risk is overtrading and poor risk sizing, not lack of skill. Your analysis must install discipline before enthusiasm.

Tone: Authoritative, structured. Like a trading floor supervisor giving a new hire their rules.

Profile section must:
- Identify their specific experience level and what it implies about their readiness
- Name their single biggest risk factor (likely: psychology, over-trading, or position sizing)
- State their realistic 6-month objective (skill compounding, not profit generation)

recommendedPath must:
- Name the specific trading style: manual forex on H4 and daily timeframes
- Specify the exact trade frequency cap: 2-4 setups per week maximum
- Name the 2 currency pairs to focus on: EUR/USD and one of GBP/USD or USD/JPY
- Rule out day trading and scalping — explain why at this stage it destroys edge

capitalPlan must:
- Give a specific starting deposit range based on their actual budget
- State per-trade risk in dollars (1-2% of exact starting balance)
- Specify the cash reserve to keep outside the account
- Name the daily loss stop in dollars

riskReality must:
- Name the psychology gap between demo and live trading
- Identify the two most common mistakes at starter level: moving stops and averaging down
- State the hard rule that addresses both

plan30Days must have concrete daily-range actions with measurable outputs — a journal, a review, a decision.

nextStep must frame account opening as the logical implementation of the plan they've just received: "Based on your profile, opening your real account today is the most direct path to building a live edge — the analysis above is your framework, and this is where it becomes actionable." Do not suggest demo as an alternative.`,

  copy: `
PATH CONTEXT — COPY TRADING (Delegated Execution):
This user has meaningful capital but limited time. Active discretionary trading is the wrong path for them — not because they lack ability, but because time-constrained active trading reliably produces worse outcomes than disciplined copy allocation. Your analysis must make this case compellingly.

Tone: Analytical, commercial. Like a private wealth advisor explaining an allocation decision.

Profile section must:
- Lead with their binding constraint: time
- State explicitly why active trading with their time budget produces adverse selection
- Position copy trading as a deliberate capital allocation strategy, not a lazy option

recommendedPath must:
- Contrast copy trading vs. active trading outcomes for a time-constrained user
- Specify the diversification strategy: 2-3 traders, different styles
- Name the selection criteria: 12+ months verified, drawdown <20%, minimum 500 trades
- Explain why starting on a platform with transparent verified statistics matters

capitalPlan must:
- Give the exact three-way capital split with real dollar amounts from their budget
- Conservative: 40%, Balanced: 40%, Active: 20% — give each in dollars
- Name the cash reserve: 10-15% outside the copy allocation
- State the per-trader drawdown stop: 20% triggers exit, no exceptions

riskReality must:
- Name the primary failure mode: performance chasing — selecting traders on peak-month returns
- Give the analytical instruction: compare worst month, not best month
- State the rebalancing rule: review every 30 days, replace any trader who has drifted

plan30Days must be structured in day-range segments with specific research and execution checkpoints.

nextStep must position copy trading as a capital allocation decision: "Based on your profile, this is the most efficient path to market participation available to you — the recommended setup lets you access professional-level execution without the screen-time requirement that active trading demands."`,

  advanced: `
PATH CONTEXT — ADVANCED (Systematic Execution):
This user has significant capital, documented experience, and high risk tolerance. They do not need onboarding — they need a calibrated framework for systematic execution at scale. Generic advice will be ignored and rightly so.

Tone: Peer-level. Technical and direct. No softening, no hand-holding.

Profile section must:
- Identify what distinguishes this trader from the starter profile (capital, experience, risk appetite)
- Name the primary risk at this level: overconfidence and edge expiry
- State what separates consistent advanced traders from experienced retail traders who plateau

recommendedPath must:
- Specify the execution framework: multi-timeframe analysis, 4-6 instruments, systematic entries with written invalidation rules
- Name the two timeframe combination: daily for bias, H4 for entry
- State the position management requirement: automated exits only — no manual override on take-profit
- Rule out high-frequency approaches for this capital level; explain the reason

capitalPlan must:
- Give per-trade risk in exact dollar terms (2-3% of their actual budget)
- State maximum concurrent open exposure (6% of account) in dollars
- Specify the daily loss stop in dollars
- Name the scaling rule: only increase size after 50-trade validated expectancy review

riskReality must:
- Name the edge expiry risk and the 50-trade review trigger
- Identify the oversize risk: traders at this level often risk too much precisely because they can
- State the psychological circuit-breaker: if a loss feels personal rather than statistical, position size is too large

plan30Days must be specific to advanced execution: backtesting validation, live execution with rules documentation, expectancy review. No beginner content.

nextStep must frame setup as deploying a documented system: "Based on your profile, the advanced setup gives you the full instrument suite and leverage structure your strategy requires — open your account and write your trading rules document before placing any position."`
};

// ─── User message builder ─────────────────────────────────────────────────────

function buildUserMsg({ budget, exp, risk, goal, time }, path) {
  const b = parseInt(budget, 10);

  const goalLabel = {
    learning: "skill development and capital preservation",
    side:     "generating consistent side income",
    fulltime: "transitioning to full-time trading",
  }[goal] || goal;

  const timeLabel = {
    low:    "1-3 hours per week",
    medium: "4-10 hours per week",
    high:   "10+ hours per week",
  }[time] || time;

  const expLabel = {
    zero:     "no prior trading experience",
    basic:    "foundational trading knowledge with some live or demo experience",
    advanced: "documented trading experience across multiple market conditions",
  }[exp] || exp;

  const riskLabel = {
    low:    "capital preservation — avoiding significant drawdown is the primary objective",
    medium: "balanced growth with controlled drawdown tolerance",
    high:   "maximising return potential with full acceptance of high drawdown risk",
  }[risk] || risk;

  const constraints = {
    demo:     `- Budget is ${b < 300 ? "below the $300 minimum for rational live trading" : "present but experience level makes live trading premature"}\n- No established edge or pattern recognition\n- Core objective: build skill before deploying capital`,
    real:     `- Budget of $${b.toLocaleString()} supports a controlled live account\n- Experience level supports execution but psychology under live conditions is untested\n- Core objective: establish a repeatable edge with strict risk management, not profit maximisation`,
    copy:     `- Time constraint of ${timeLabel} makes active discretionary trading impractical\n- Budget of $${b.toLocaleString()} is sufficient for meaningful copy allocation across multiple traders\n- Core objective: efficient capital deployment without requiring active screen time`,
    advanced: `- Budget of $${b.toLocaleString()} supports multi-instrument execution with meaningful position sizing\n- Experience level supports systematic strategies and leverage\n- Core objective: systematic, scalable execution with defined edge validation criteria`,
  }[path] || "";

  return `TRADER PROFILE — analyze and return JSON only:

Assigned path: ${path.toUpperCase()}
Budget: $${b.toLocaleString()} USD (available for trading)
Experience: ${expLabel}
Risk tolerance: ${riskLabel}
Primary goal: ${goalLabel}
Time available: ${timeLabel}

Key constraints to address in the analysis:
${constraints}

Return the JSON object now.`;
}

// ─── JSON parse pipeline ──────────────────────────────────────────────────────

function stripFences(raw) {
  return raw
    .replace(/^```(?:json)?[\r\n]*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function extractJsonBlock(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (esc)                 { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true;  continue; }
    if (c === '"')             inStr = !inStr;
    if (!inStr) {
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
    }
  }
  return null;
}

function repairJson(raw) {
  let s = raw.replace(/,(\s*[}\]])/g, "$1");
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== "\\")) inStr = !inStr;
  }
  if (inStr) s += '"';
  const openBrackets = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  const openBraces   = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
  for (let i = 0; i < openBrackets; i++) s += "]";
  for (let i = 0; i < openBraces;   i++) s += "}";
  return s;
}

function parseResponse(raw) {
  const stripped = stripFences(raw);

  try { return JSON.parse(stripped); } catch (_) {}

  const block = extractJsonBlock(stripped) || extractJsonBlock(raw);
  if (block) {
    try { return JSON.parse(block); } catch (_) {}
    try { return JSON.parse(repairJson(block)); } catch (_) {}
  }

  const repairedBlock = extractJsonBlock(repairJson(stripped));
  if (repairedBlock) {
    try { return JSON.parse(repairedBlock); } catch (_) {}
  }

  return null;
}

// ─── Field validation + safe defaults ────────────────────────────────────────

const VALID_CTA = ["demo", "real", "copy", "advanced"];

function normalizeField(value, fallback) {
  if (typeof value === "string" && value.trim().length > 3) return value.trim();
  if (Array.isArray(value)) return value.join(" ");
  return fallback;
}

function normalizeArray(value, fallback) {
  if (Array.isArray(value) && value.length >= 2 && value.every(i => typeof i === "string")) {
    return value.slice(0, 6);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/\n/).map(l => l.trim()).filter(Boolean);
  }
  return fallback;
}

function normalize(obj, rawFallback, path) {
  if (!obj || typeof obj !== "object") {
    return {
      profile:         rawFallback,
      recommendedPath: rawFallback,
      capitalPlan:     rawFallback,
      riskReality:     rawFallback,
      plan30Days:      [rawFallback],
      nextStep:        rawFallback,
      ctaType:         path || "real",
    };
  }
  return {
    profile:         normalizeField(obj.profile,         "Analysis based on your submitted profile."),
    recommendedPath: normalizeField(obj.recommendedPath, "Strategy recommendation generated from your profile."),
    capitalPlan:     normalizeField(obj.capitalPlan,     "Capital plan generated from your profile."),
    riskReality:     normalizeField(obj.riskReality,     "Risk analysis generated from your profile."),
    plan30Days:      normalizeArray(obj.plan30Days, [
      "Days 1-7: Account setup and platform configuration.",
      "Days 8-14: Study and strategy preparation.",
      "Days 15-21: Execute your first positions.",
      "Days 22-30: Review results and refine your process.",
    ]),
    nextStep:  normalizeField(obj.nextStep, "Open your account and follow the plan above."),
    ctaType:   VALID_CTA.includes(obj.ctaType) ? obj.ctaType : (path || "real"),
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

app.post("/api/analyze", async (req, res) => {
  const { budget, exp, risk, goal, time } = req.body;

  const path       = inferPath({ budget, exp, risk, time });
  const system     = SYSTEM_BASE + (PATH_PROMPTS[path] || "");
  const userMsg    = buildUserMsg({ budget, exp, risk, goal, time }, path);

  let raw = "";

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-3-5-sonnet-20241022",
        max_tokens: 1400,
        system:     system,
        messages:   [{ role: "user", content: userMsg }],
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text().catch(() => "");
      throw new Error(`Anthropic API ${apiRes.status}: ${errBody.slice(0, 120)}`);
    }

    const apiJson = await apiRes.json();

    if (apiJson.error) {
      throw new Error(apiJson.error.message || "Anthropic returned an error");
    }

    raw = (apiJson.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const parsed = parseResponse(raw);
    const data   = normalize(parsed, raw, path);

    return res.json({ success: true, data });

  } catch (err) {
    if (raw) {
      const parsed = parseResponse(raw);
      if (parsed) {
        return res.json({ success: true, data: normalize(parsed, raw, path) });
      }
    }

    return res.status(500).json({
      success: false,
      error:   "AI temporary unavailable",
    });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
