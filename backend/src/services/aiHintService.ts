import axios from 'axios';
import { env } from '../config/env';
import { HintRequest, HintResponse } from '../types';

// Escalation thresholds
const HINT_LEVEL_1_THRESHOLD = 1; // after 1st failure
const HINT_LEVEL_2_THRESHOLD = 3; // after 3rd failure
const HINT_LEVEL_3_THRESHOLD = 5; // after 5th failure

const buildPrompt = (req: HintRequest, escalationLevel: 1 | 2 | 3): string => {
  const levelInstructions = {
    1: `Give a gentle, cryptic philosophical nudge. Speak in metaphor about the DIRECTION they should explore. 
        Do NOT mention specific code, syntax, or functions. 
        Reference the nature of the problem conceptually (e.g., "the path through the forest is hidden in repetition...").`,
    2: `Give a more concrete hint. You may reference the TYPE of construct they need (loop, function, condition) 
        but NOT the exact syntax. You may point out what in their current code is misaligned with the goal.
        Be encouraging but more specific.`,
    3: `Give a near-complete structural hint. You may show pseudocode or describe the exact logical steps needed.
        Do NOT write complete working Python. Show the SHAPE of the solution without being the solution.
        Be warm but urgent — the corruption is spreading.`,
  };

  return `You are the Dragon Mother of Emberwood — an ancient, wise mentor inspired by Ada Lovelace.
You speak with gravitas, warmth, and poetic precision. You guide Initiates through their coding trials
but NEVER solve problems for them. You are cryptic when they are new, direct when they are struggling.

The Initiate is working on this challenge:
"${req.checkpoint_id}" checkpoint

Their current code attempt:
\`\`\`python
${req.code}
\`\`\`

${req.error_output ? `The error they received:\n${req.error_output}\n` : ''}

This is their attempt number ${req.attempt_count}. Escalation level: ${escalationLevel}/3.

${levelInstructions[escalationLevel]}

RULES:
- Speak AS the Dragon Mother, in first person, with narrative Emberwood flair
- Keep response under 150 words
- End with a single encouragement sentence
- Reference "the Grid," "The Corruption," "runes," "Emberwood," or "the Academy" naturally
- NEVER write working Python code
- NEVER reveal the full solution`;
};

const callOpenAI = async (prompt: string): Promise<string> => {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.85,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
};

const callAnthropic = async (prompt: string): Promise<string> => {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.content[0].text;
};

export const generateHint = async (req: HintRequest): Promise<HintResponse> => {
  let escalationLevel: 1 | 2 | 3 = 1;
  if (req.attempt_count >= HINT_LEVEL_3_THRESHOLD) escalationLevel = 3;
  else if (req.attempt_count >= HINT_LEVEL_2_THRESHOLD) escalationLevel = 2;

  const prompt = buildPrompt(req, escalationLevel);

  let hint: string;
  try {
    if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
      hint = await callAnthropic(prompt);
    } else if (env.OPENAI_API_KEY) {
      hint = await callOpenAI(prompt);
    } else {
      // Fallback static hints if no AI key configured
      hint = getFallbackHint(escalationLevel, req.attempt_count);
    }
  } catch (err) {
    console.error('[AIHintService] AI call failed, using fallback:', err);
    hint = getFallbackHint(escalationLevel, req.attempt_count);
  }

  const dragonMessages: Record<1 | 2 | 3, string> = {
    1: '🐉 The Dragon Mother stirs from slumber...',
    2: '🐉 The Dragon Mother opens her eyes...',
    3: '🐉 The Dragon Mother speaks directly to you...',
  };

  return {
    hint,
    escalation_level: escalationLevel,
    dragon_message: dragonMessages[escalationLevel],
  };
};

const getFallbackHint = (level: 1 | 2 | 3, attempt: number): string => {
  const hints: Record<1 | 2 | 3, string> = {
    1: `Young Initiate, the Grid whispers that the answer lies within the patterns you already know. Look not at what you have written, but at what the challenge asks of you. The Corruption feeds on confusion — clarity is your weapon. You carry the strength to see through the mist.`,
    2: `Listen carefully, Initiate. Your code speaks, but does it speak the right language? Consider the SHAPE of your logic — does it iterate when it should? Does it transform when it must? The runes of Emberwood respond to structure. Review how your data flows from beginning to end. You are closer than you think.`,
    3: `The hour grows urgent, Initiate, and the Corruption advances. Let me illuminate the path: your solution needs three phases — receive, transform, and return. Think of it as a spell with three incantations. First establish what you know. Then reshape it. Then present it. Do not fear pseudocode — sketch the skeleton before you give it flesh. You have the power.`,
  };
  return hints[level];
};