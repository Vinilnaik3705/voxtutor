import Interview from '../models/Interview.js';
import Feedback from '../models/Feedback.js';
import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/feedback
 * Analyzes the interview transcript using Gemini AI and generates a detailed feedback report.
 */
export async function generateFeedback(req, res) {
  try {
    // 1. Extract data from the request body
    const { interviewId, userId, domainLabel, difficulty, transcript } = req.body;

    // 2. Format the transcript array into a readable text format for the AI
    const transcriptText = transcript
      .map((turn) =>
        `${turn.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${turn.content}`
      )
      .join('\n\n');

    // 3. Build the prompt instructions telling the AI how to grade the candidate
    const prompt = `You are a senior ${domainLabel} hiring manager analyzing a mock interview.
Difficulty level: ${difficulty}

Interview Transcript:
${transcriptText}

Analyze the candidate's performance and return ONLY valid JSON matching this structure:
{
  "overallScore": <integer 0-100>,
  "verdict": "<Strong Hire | Hire | Maybe | No Hire>",
  "summary": "<2-3 sentence overall assessment>",
  "categories": [
    {
      "name": "Technical Knowledge",
      "score": <0-100>,
      "feedback": "<specific, constructive feedback referencing actual answers>",
      "rating": "<excellent | good | average | poor>"
    },
    {
      "name": "Communication Clarity",
      "score": <0-100>,
      "feedback": "<specific feedback>",
      "rating": "<excellent | good | average | poor>"
    },
    {
      "name": "Problem-Solving Approach",
      "score": <0-100>,
      "feedback": "<specific feedback>",
      "rating": "<excellent | good | average | poor>"
    },
    {
      "name": "Domain Experience",
      "score": <0-100>,
      "feedback": "<specific feedback>",
      "rating": "<excellent | good | average | poor>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "nextSteps": ["<actionable step 1>", "<actionable step 2>", "<actionable step 3>"]
}`;

    // 4. Call Gemini AI, enforcing a strict JSON response
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json' 
      },
    });

    // 5. Parse the returned JSON text into a JavaScript object
    const text = (result.text ?? '').trim();
    const analysis = JSON.parse(text);

    // 6. Save the new feedback report to the database
    const feedback = await Feedback.create({
      interviewId,
      userId,
      ...analysis,
    });

    // 7. Mark the original interview as 'completed'
    await Interview.findByIdAndUpdate(interviewId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    // 8. Format the response for the frontend (convert MongoDB ObjectIds to strings)
    const formattedFeedback = feedback.toObject();
    formattedFeedback.id = formattedFeedback._id.toString();
    formattedFeedback.interviewId = formattedFeedback.interviewId.toString();

    // 9. Send the feedback report back to the frontend
    return res.json({ feedback: formattedFeedback });
    
  } catch (err) {
    console.error('Feedback generation error:', err);
    return res.status(500).json({ error: 'Failed to generate feedback' });
  }
}

/**
 * GET /api/feedback/:interviewId
 * Retrieves an existing feedback report for a specific interview.
 */
export async function getFeedback(req, res) {
  try {
    // 1. Find the feedback document in the database
    const feedback = await Feedback.findOne({ interviewId: req.params.interviewId }).lean();

    if (!feedback) {
      return res.json({ feedback: null });
    }

    // 2. Format the response for the frontend
    feedback.id = feedback._id.toString();
    feedback.interviewId = feedback.interviewId.toString();

    // 3. Send the feedback report back
    return res.json({ feedback });
    
  } catch (err) {
    console.error('Get feedback error:', err);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}
