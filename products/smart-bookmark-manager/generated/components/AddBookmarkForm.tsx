"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddBookmarkForm() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim() }),
            });

            const contentType = response.headers.get("content-type") || "";

            // If the server didn't return JSON, read text so we can show a useful error
            if (!contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(
                    `Expected JSON from /api/bookmarks, got ${
                        contentType || "unknown content-type"
                    }: ${text.slice(0, 180)}`
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Failed to add bookmark");
            }

            setUrl("");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label
                    htmlFor="url"
                    className="block text-sm font-medium text-gray-700 mb-2">
                    URL
                </label>
                <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="input-field"
                    required
                    disabled={loading}
                />
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}>
                {loading ? "Adding..." : "Add Bookmark"}
            </button>
        </form>
    );
}
