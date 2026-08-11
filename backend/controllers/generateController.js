import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/vapi/generate
 * Generates interview questions using Google's Gemini AI.
 */
export async function generateQuestions(req, res) {
  try {
    // 1. Extract the interview configuration from the request
    const { domain, domainLabel, difficulty, topics, numQuestions } = req.body;

    // 2. Define exactly what each difficulty level means
    const difficultyContext = {
      entry: 'a fresh graduate or junior with 0–2 years of experience',
      mid: 'a mid-level professional with 2–5 years of experience',
      senior: 'a senior professional with 5+ years of experience',
    };

    // 3. Build the prompt instructions for the AI
    const prompt = `You are an expert ${domainLabel} interviewer at a top firm.
Generate exactly ${numQuestions} high-quality interview questions for ${difficultyContext[difficulty]}.
Domain: ${domainLabel}
Key topics to cover: ${topics.join(', ')}

Requirements:
- Questions should be progressively deeper (start accessible, end challenging)
- Each question should be standalone and clear when spoken aloud
- Mix conceptual, behavioral, and situational questions
- Do NOT number the questions
- Return a JSON array of strings representing the questions.`;

    // 4. Call the Gemini API, enforcing a JSON response format
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      contents: prompt,
      config: { 
        // This tells Gemini to strictly return valid JSON
        responseMimeType: 'application/json' 
      },
    });

    // 5. Parse the returned JSON text into a JavaScript array
    const text = (result.text ?? '').trim();
    const questions = JSON.parse(text);

    // 6. Send the generated questions back to the frontend
    return res.json({ questions });
    
  } catch (err) {
    console.error('Question generation error:', err);
    return res.status(500).json({ error: 'Failed to generate questions' });
  }
}
