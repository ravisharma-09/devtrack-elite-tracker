


export interface GroqMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama3-70b-8192";

/**
 * Reusable base client for calling Groq with structured JSON outputs.
 * 
 * NOTE: The user's VITE_GROQ_API_KEY must be in the .env file. 
 * Since this is a client-side dev app, we fetch it from Vite's import.meta.env
 */
export async function invokeGroqJSON(messages: GroqMessage[], temperature = 0.2): Promise<any> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_GROQ_API_KEY is not set in your .env file!");
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: messages,
                temperature: temperature,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq API error HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Empty content received from Groq");
        }

        return JSON.parse(content);
    } catch (e: any) {
        console.error("[GroqClient] Failed to invoke Groq LLM:", e);
        throw e;
    }
}
