import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function categorizeUrl(url: string): Promise<string[]> {
    try {
        const message = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `Analyze this URL and suggest 2-3 relevant categories (single words or short phrases): ${url}
Return only the categories as a comma-separated list, nothing else.`,
                },
            ],
        });

        const response = (message.content[0] as any).text ?? "";
        return response
            .split(",")
            .map((c: string) => c.trim())
            .filter(Boolean)
            .slice(0, 3);
    } catch (error) {
        console.error("AI categorization error:", error);
        return ["Uncategorized"];
    }
}
