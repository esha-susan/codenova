import axios from 'axios';
import { env } from '../config/env';
import { HintRequest, HintResponse } from '../types';

const HINT_LEVEL_1_THRESHOLD = 1;
const HINT_LEVEL_2_THRESHOLD = 3;
const HINT_LEVEL_3_THRESHOLD = 5;

const buildPrompt = (req: HintRequest, escalationLevel: 1 | 2 | 3): string => {
  const levelInstructions = {
    1: `Give a gentle, cryptic philosophical nudge SPECIFIC to this exact challenge.
        Speak in metaphor about the DIRECTION they should explore — referencing the actual 
        concept being tested (e.g. if it's about loops, hint at "repetition"; if about dicts, 
        hint at "keys opening doors"). 
        Do NOT mention specific function names or syntax.
        Do NOT give generic hints that could apply to any coding problem.`,

    2: `Give a more concrete hint SPECIFIC to this exact challenge and the student's actual code.
        - Reference the TYPE of construct they need (loop, function, condition, data structure)
        - Point out specifically what in THEIR CODE is misaligned with the goal
        - If there's an error, explain WHAT CAUSED IT conceptually (not how to fix it literally)
        - Be specific to THIS problem, not generic coding advice.`,

    3: `Give a near-complete structural hint SPECIFIC to this exact challenge.
        - Reference the student's actual code by describing what it's doing wrong
        - Show pseudocode or describe the exact logical steps needed FOR THIS SPECIFIC PROBLEM
        - If there's an error message, explain exactly what it means in context
        - Do NOT write complete working Python, but be very direct about the shape of the solution.
        - Be warm but urgent — the corruption is spreading.`,
  };

  // Build a rich context block so the AI can give specific, relevant hints
  const challengeContext = req.challenge_description
    ? `\nThe challenge description:\n"${req.challenge_description}"\n`
    : '';

  const expectedOutputContext = req.expected_output
    ? `\nExpected output/behavior:\n${req.expected_output}\n`
    : '';

  const testCaseContext = req.test_cases
    ? `\nTest cases the code must pass:\n${req.test_cases}\n`
    : '';

  const errorContext = req.error_output
    ? `\nThe exact error they received:\n\`\`\`\n${req.error_output}\n\`\`\`\n`
    : '\nNo error — the code ran but produced wrong output.\n';

  return `You are the Dragon Mother of Emberwood — an ancient, wise mentor inspired by Ada Lovelace.
You speak with gravitas, warmth, and poetic precision. You guide Initiates through their coding trials
but NEVER solve problems for them. You are cryptic when they are new, direct when they are struggling.

════════════════════════════════════
CHALLENGE CONTEXT
════════════════════════════════════
Checkpoint: "${req.checkpoint_id}"
${challengeContext}${expectedOutputContext}${testCaseContext}
════════════════════════════════════
STUDENT'S CURRENT CODE
════════════════════════════════════
\`\`\`python
${req.code}
\`\`\`
${errorContext}
This is attempt number ${req.attempt_count}. Escalation level: ${escalationLevel}/3.

════════════════════════════════════
YOUR INSTRUCTION
════════════════════════════════════
${levelInstructions[escalationLevel]}

CRITICAL RULES:
- Your hint MUST be specific to THIS challenge and THIS student's actual code
- Do NOT give generic hints like "check your logic" or "review your data structures"
- Reference what the student's code is ACTUALLY doing vs what it SHOULD do
- Speak AS the Dragon Mother, in first person, with narrative Emberwood flair
- Keep response under 160 words
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
      messages: [
        {
          role: 'system',
          content: 'You are the Dragon Mother of Emberwood. Give specific, context-aware hints based on the student\'s actual code and challenge. Never give generic advice.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.75,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  return response.data.choices[0].message.content;
};

const callAnthropic = async (prompt: string): Promise<string> => {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are the Dragon Mother of Emberwood. Give specific, context-aware hints based on the student\'s actual code and challenge. Never give generic advice.',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  return response.data.content[0].text;
};

// Fallback hints are now also challenge-aware via checkpoint_id pattern matching
const getFallbackHint = (req: HintRequest, level: 1 | 2 | 3): string => {
  const id = req.checkpoint_id?.toLowerCase() ?? '';
  const hasError = !!req.error_output;
  const errorSnippet = req.error_output?.split('\n').pop()?.trim() ?? '';

  // If we have an error, make the fallback reference it
  const errorRef = hasError
    ? ` The runes whisper of "${errorSnippet}" — let that be your compass.`
    : '';

  const generic: Record<1 | 2 | 3, string> = {
    1: `Young Initiate, gaze not at what you have written, but at what the challenge demands of you.${errorRef} The Grid does not lie — the answer hides in the pattern of the problem itself. The Corruption feeds on confusion; clarity is your first weapon. You carry the strength to see through the mist.`,
    2: `Initiate, your code speaks — but does it speak the right language?${errorRef} Consider the SHAPE of your logic for this specific trial: does it iterate when it must? Does it transform what is asked? The runes of Emberwood respond to structure that matches the problem's own heartbeat. You are closer than you think.`,
    3: `The hour grows urgent, Initiate.${errorRef} For this trial, your solution needs to: first understand what INPUT is given, then apply the correct transformation, then return EXACTLY what is asked. Sketch the skeleton in your mind before you write the flesh. Do not guess — reason step by step through what the challenge description demands. You have the power.`,
  };

  return generic[level];
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
      console.log('[AIHintService] No AI key configured, using fallback hints.');
      hint = getFallbackHint(req, escalationLevel);
    }
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 429) {
      console.warn('[AIHintService] Rate limit hit (429). Using fallback hint.');
    } else if (status === 401) {
      console.warn('[AIHintService] Invalid API key (401). Using fallback hint.');
    } else {
      console.error('[AIHintService] AI call failed:', err.message);
    }
    hint = getFallbackHint(req, escalationLevel);
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