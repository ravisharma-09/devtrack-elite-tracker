import { invokeGroqJSON } from './groqClient';

export interface QuestionSuggestion {
    platform: "LeetCode" | "Codeforces";
    name: string;
    difficulty: "Easy" | "Medium" | "Hard" | string;
    link: string;
}

export interface WebProjectSuggestion {
    title: string;
    description: string;
    techStack: string[];
}

export interface GroqQuestionSuggestions {
    topic: string;
    description: string;
    questions: QuestionSuggestion[];
    projects: WebProjectSuggestion[];
}

export async function getGroqQuestionSuggestions(
    weakTopic: string
): Promise<GroqQuestionSuggestions> {

    const systemPrompt = `
You are an elite competitive programming and technical interview coach.
Your student has identified "${weakTopic}" as their weakest topic right now.

Your exact job is to generate a list of exactly 5 highly-rated, highly-effective coding problems for them to practice THIS topic, PLUS 2 small practical Web Development micro-projects they can build to apply their skills in a real-world context.

You MUST return ONLY a JSON object with this exact schema:
{
    "topic": "${weakTopic}",
    "description": "A 1-sentence motivational explanation why mastering this topic is crucial.",
    "questions": [
        {
            "platform": "LeetCode" | "Codeforces",
            "name": "Exact problem name",
            "difficulty": "Easy" | "Medium" | "Hard",
            "link": "The absolute direct URL to the problem on leetcode.com or codeforces.com"
        }
    ],
    "projects": [
        {
            "title": "Short catchy project name (e.g., Task Tracker)",
            "description": "1-2 sentences describing what to build and why it's useful.",
            "techStack": ["React", "TypeScript", "Tailwind"]
        }
    ]
}

Ensure the links are 100% accurate standard URL formats.
`;

    const data = await invokeGroqJSON([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate 5 problem suggestions and 2 project ideas for the topic: ${weakTopic}.` }
    ], 0.4); // slightly more temp for creative problem picking

    return {
        topic: weakTopic,
        description: data.description || "Mastering this topic will unlock new algorithmic paradigms.",
        questions: data.questions || [],
        projects: data.projects || []
    };
}
