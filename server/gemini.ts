import { GoogleGenAI, Type } from '@google/genai';

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface SkillMatchResult {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  aiInsight: string;
  recommendation: string;
}

// Algorithmic fallback for skill matching
export function calculateSkillMatchAlgorithmic(
  studentSkills: string[],
  studentInterests: string[] = [],
  internshipSkills: string[],
  internshipTitle: string = ''
): SkillMatchResult {
  const normStudent = studentSkills.map((s) => s.trim().toLowerCase());
  const normInterests = studentInterests.map((s) => s.trim().toLowerCase());
  const normRequired = internshipSkills.map((s) => s.trim().toLowerCase());

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  internshipSkills.forEach((req, idx) => {
    const rLower = normRequired[idx];
    const isDirectMatch = normStudent.some(
      (st) => st === rLower || st.includes(rLower) || rLower.includes(st)
    );
    if (isDirectMatch) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  });

  let rawScore = 0;
  if (internshipSkills.length > 0) {
    rawScore = (matchedSkills.length / internshipSkills.length) * 85;
  } else {
    rawScore = 75;
  }

  // Bonus if student's career interests align with title
  const titleWords = internshipTitle.toLowerCase().split(/\s+/);
  const interestBonus = normInterests.some((int) =>
    titleWords.some((w) => w.length > 3 && int.includes(w))
  )
    ? 15
    : 5;

  const matchPercentage = Math.min(100, Math.round(rawScore + interestBonus));

  let recommendation = '';
  if (matchPercentage >= 80) {
    recommendation = `Strong candidate match! You have ${matchedSkills.length} core competencies. Highlight your hands-on project portfolio when applying.`;
  } else if (matchPercentage >= 50) {
    recommendation = `Solid foundation with ${matchedSkills.length} matching skills. Consider reviewing ${missingSkills.slice(0, 2).join(' and ')} before your interview.`;
  } else {
    recommendation = `Growth opportunity. You're building towards this role. Upskilling in ${missingSkills.slice(0, 3).join(', ')} will significantly boost your readiness.`;
  }

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    aiInsight: `Matched ${matchedSkills.length} of ${internshipSkills.length} required skills for ${internshipTitle}.`,
    recommendation,
  };
}

export async function analyzeSkillMatch(
  studentSkills: string[],
  studentInterests: string[],
  internshipTitle: string,
  internshipSkills: string[],
  internshipDescription: string
): Promise<SkillMatchResult> {
  const fallback = calculateSkillMatchAlgorithmic(
    studentSkills,
    studentInterests,
    internshipSkills,
    internshipTitle
  );

  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  try {
    const prompt = `You are an expert tech career advisor. Compare this student's profile to the internship requirements.
Student Skills: ${JSON.stringify(studentSkills)}
Student Career Interests: ${JSON.stringify(studentInterests)}
Internship Role: "${internshipTitle}"
Required Skills: ${JSON.stringify(internshipSkills)}
Description: "${internshipDescription}"

Return structured JSON with:
1. matchPercentage: integer 0-100 indicating realistic candidate readiness.
2. matchedSkills: array of skills the student has that align with requirements.
3. missingSkills: array of key skills the student needs to learn.
4. aiInsight: concise 1-2 sentence summary of strengths for this position.
5. recommendation: actionable 1-2 sentence advice for applying or upskilling.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchPercentage: { type: Type.INTEGER },
            matchedSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            missingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            aiInsight: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: [
            'matchPercentage',
            'matchedSkills',
            'missingSkills',
            'aiInsight',
            'recommendation',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (typeof parsed.matchPercentage === 'number') {
      return {
        matchPercentage: Math.max(10, Math.min(100, Math.round(parsed.matchPercentage))),
        matchedSkills: parsed.matchedSkills || fallback.matchedSkills,
        missingSkills: parsed.missingSkills || fallback.missingSkills,
        aiInsight: parsed.aiInsight || fallback.aiInsight,
        recommendation: parsed.recommendation || fallback.recommendation,
      };
    }
    return fallback;
  } catch (err) {
    console.warn('Gemini skill match failed, using fallback:', err);
    return fallback;
  }
}

// Pre-defined fallback questions for reliable practice when offline/quota exhausted
const FALLBACK_QUESTIONS: Record<string, string[]> = {
  python: [
    'Explain the difference between deep copy and shallow copy in Python, and provide a concrete use case for each.',
    'How do Python generators work, and what advantages does the `yield` statement provide in terms of memory efficiency?',
    'Explain how Python manages memory with reference counting and garbage collection, and how to handle circular references.',
  ],
  react: [
    'Explain how the React Virtual DOM diffing algorithm functions and why using stable keys is critical for lists.',
    'Compare `useEffect` and `useLayoutEffect`. When is it necessary to use `useLayoutEffect` to prevent visual flicker?',
    'What strategies do you use in React 18/19 to prevent unnecessary component re-renders (e.g., memo, useMemo, useCallback)?',
  ],
  javascript: [
    'Explain the JavaScript Event Loop, Call Stack, Microtask queue, and Macrotask queue with an execution example.',
    'What is the difference between Prototypal Inheritance and Classical Class-based Inheritance in JavaScript?',
    'How do Closures work in JavaScript, and what is a common memory leak pitfall associated with them?',
  ],
  java: [
    'What is the difference between `==` and `.equals()` in Java, and why must you override `hashCode()` when overriding `equals()`?',
    'Explain the Java Memory Model: difference between Stack and Heap memory and how Garbage Collection works.',
    'What is the difference between an Interface and an Abstract Class in modern Java (Java 8+ with default methods)?',
  ],
  sql: [
    'Explain the difference between `WHERE` and `HAVING` clauses, and write an example query using `GROUP BY`.',
    'What is the difference between `INNER JOIN`, `LEFT OUTER JOIN`, and `FULL OUTER JOIN`?',
    'What are database indexes, how do B-Tree indexes improve query performance, and what are their trade-offs during inserts?',
  ],
  'data structures': [
    'Compare the time complexity of searching, inserting, and deleting in an Array vs. a Singly Linked List.',
    'Explain how a Hash Table handles collisions (chaining vs. open addressing) and what its worst-case time complexity is.',
    'When would you choose a Breadth-First Search (BFS) over a Depth-First Search (DFS) on a graph?',
  ],
  'machine learning': [
    'Explain the bias-variance tradeoff in supervised learning models and how regularization techniques (L1/L2) help.',
    'What is the difference between Precision and Recall, and how do you decide which metric to prioritize for an anomaly detection task?',
    'How does Gradient Descent optimize neural network loss functions, and why is learning rate scheduling critical?',
  ],
  hr: [
    'Tell me about a time you encountered a significant roadblock in a technical team project. How did you resolve it?',
    'How do you prioritize deadlines when balancing multiple challenging academic and internship responsibilities?',
    'Why are you interested in this specific internship role and what unique strengths do you bring to our team?',
  ],
};

export async function generateInterviewQuestions(
  role: string,
  topic: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
): Promise<
  Array<{
    questionNumber: number;
    question: string;
    expectedConcepts: string[];
  }>
> {
  const cleanTopic = topic.trim().toLowerCase();
  const fallbackList = FALLBACK_QUESTIONS[cleanTopic] || FALLBACK_QUESTIONS['hr'];

  const fallbackQuestions = fallbackList.map((q, idx) => ({
    questionNumber: idx + 1,
    question: q,
    expectedConcepts: ['Clarity', 'Technical precision', 'Practical example'],
  }));

  const ai = getAiClient();
  if (!ai) {
    return fallbackQuestions;
  }

  try {
    const prompt = `Generate 4 realistic technical interview questions for a student applying for a "${role}" position.
Topic: "${topic}"
Difficulty Level: "${difficulty}"

Each question should test practical understanding, problem-solving, and fundamentals.
Return a structured JSON array of 4 question objects with:
- questionNumber (1 to 4)
- question (clear interview question)
- expectedConcepts (array of 3-4 key technical terms or concepts the student should mention)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionNumber: { type: Type.INTEGER },
              question: { type: Type.STRING },
              expectedConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['questionNumber', 'question', 'expectedConcepts'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4);
    }
    return fallbackQuestions;
  } catch (err) {
    console.warn('Gemini question generation failed, using fallback:', err);
    return fallbackQuestions;
  }
}

export async function evaluateInterviewAnswer(
  role: string,
  topic: string,
  question: string,
  studentAnswer: string
): Promise<{
  score: number;
  constructiveFeedback: string;
  idealAnswerGuide: string;
  keyStrengths: string[];
  improvementAreas: string[];
}> {
  const fallbackEvaluation = {
    score: Math.min(9, Math.max(4, Math.round(studentAnswer.length / 40) + 4)),
    constructiveFeedback:
      studentAnswer.length > 80
        ? 'Good conceptual effort. You explained the core idea clearly, though expanding on trade-offs and real-world edge cases would make your answer stand out.'
        : 'Brief answer. While you touched on the topic, an interviewer will look for deeper technical terminology and an illustrative code or architectural example.',
    idealAnswerGuide:
      'A strong answer defines the core concept clearly, explains how it functions under the hood, mentions performance or complexity implications, and references a concrete real-world project example.',
    keyStrengths: ['Direct communication', 'Identified relevant concepts'],
    improvementAreas: ['Include specific code examples', 'Discuss trade-offs and performance'],
  };

  const ai = getAiClient();
  if (!ai) {
    return fallbackEvaluation;
  }

  try {
    const prompt = `You are a supportive, high-standards senior tech interviewer evaluating a student candidate.
Target Role: "${role}"
Technical Topic: "${topic}"
Interview Question: "${question}"
Candidate's Answer: "${studentAnswer}"

Evaluate the answer thoughtfully:
1. score: Integer from 1 to 10 (1 = completely off, 5 = average/surface-level, 8 = strong, 10 = exceptional).
2. constructiveFeedback: 2-3 sentences of constructive feedback explaining how the interviewer perceived this response.
3. idealAnswerGuide: Clear, friendly breakdown of what a complete 10/10 answer includes.
4. keyStrengths: Array of 2-3 positive points in their answer.
5. improvementAreas: Array of 2-3 specific technical gaps, missing nuances, or communication points to practice.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            constructiveFeedback: { type: Type.STRING },
            idealAnswerGuide: { type: Type.STRING },
            keyStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvementAreas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'score',
            'constructiveFeedback',
            'idealAnswerGuide',
            'keyStrengths',
            'improvementAreas',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (typeof parsed.score === 'number') {
      return {
        score: Math.max(1, Math.min(10, Math.round(parsed.score))),
        constructiveFeedback: parsed.constructiveFeedback,
        idealAnswerGuide: parsed.idealAnswerGuide,
        keyStrengths: parsed.keyStrengths || fallbackEvaluation.keyStrengths,
        improvementAreas: parsed.improvementAreas || fallbackEvaluation.improvementAreas,
      };
    }
    return fallbackEvaluation;
  } catch (err) {
    console.warn('Gemini answer evaluation failed, using fallback:', err);
    return fallbackEvaluation;
  }
}

export async function generateInterviewSummary(
  role: string,
  topic: string,
  questionsAndAnswers: Array<{
    question: string;
    studentAnswer: string;
    score: number;
    feedback: string;
  }>
): Promise<{
  overallScore: number;
  summary: string;
  strongPoints: string[];
  weakAreas: string[];
  actionableAdvice: string[];
}> {
  const avgScore = Math.round(
    questionsAndAnswers.reduce((acc, curr) => acc + (curr.score || 6), 0) /
      Math.max(1, questionsAndAnswers.length) *
      10
  );

  const fallbackSummary = {
    overallScore: Math.min(100, Math.max(40, avgScore)),
    summary: `You completed the ${topic} mock interview for the ${role} position. You demonstrated foundational technical grasp across multiple core questions.`,
    strongPoints: ['Structured communication', 'Clear grasp of fundamental syntax and principles'],
    weakAreas: ['Explaining low-level execution mechanisms', 'Proactively discussing edge-case performance'],
    actionableAdvice: [
      'Practice framing technical answers using the STAR method (Situation, Task, Action, Result).',
      `Deepen your knowledge of ${topic} internals and memory models.`,
      'Build a focused GitHub portfolio project demonstrating practical applications of these concepts.',
    ],
  };

  const ai = getAiClient();
  if (!ai) {
    return fallbackSummary;
  }

  try {
    const prompt = `Synthesize a comprehensive final performance evaluation for a student candidate who completed a mock interview.
Role: "${role}"
Topic: "${topic}"
Interview Log:
${JSON.stringify(questionsAndAnswers, null, 2)}

Provide structured JSON:
- overallScore: Integer between 0 and 100
- summary: 2-3 sentences summarizing their readiness and interview presence
- strongPoints: Array of 3 specific technical or communication strengths demonstrated
- weakAreas: Array of 3 areas needing targeted revision
- actionableAdvice: Array of 3 concrete next steps to ace real technical recruiter interviews`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            strongPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            weakAreas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            actionableAdvice: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['overallScore', 'summary', 'strongPoints', 'weakAreas', 'actionableAdvice'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (typeof parsed.overallScore === 'number') {
      return {
        overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
        summary: parsed.summary,
        strongPoints: parsed.strongPoints || fallbackSummary.strongPoints,
        weakAreas: parsed.weakAreas || fallbackSummary.weakAreas,
        actionableAdvice: parsed.actionableAdvice || fallbackSummary.actionableAdvice,
      };
    }
    return fallbackSummary;
  } catch (err) {
    console.warn('Gemini summary generation failed, using fallback:', err);
    return fallbackSummary;
  }
}
