"use client";

import { BookmarkIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Bookmark {
    id: string;
    url: string;
    title: string | null;
    ai_categories: string[];
    created_at: string;
}

interface Props {
    bookmarks: Bookmark[];
}

export default function BookmarksList({ bookmarks }: Props) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    async function handleDelete(id: string) {
        if (!confirm("Delete this bookmark?")) return;

        setDeletingId(id);
        try {
            const response = await fetch(`/api/bookmarks?id=${id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to delete");

            router.refresh();
        } catch (err) {
            alert("Failed to delete bookmark");
        } finally {
            setDeletingId(null);
        }
    }

    if (bookmarks.length === 0) {
        return (
            <div className="text-center py-12">
                <BookmarkIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No bookmarks
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    Get started by adding a new bookmark.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bookmark-card">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                {bookmark.title || bookmark.url}
                            </h3>
                            <a
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate block">
                                {bookmark.url}
                            </a>
                            {bookmark.ai_categories &&
                                bookmark.ai_categories.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {bookmark.ai_categories.map(
                                            (cat, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    {cat}
                                                </span>
                                            )
                                        )}
                                    </div>
                                )}
                        </div>
                        <button
                            onClick={() => handleDelete(bookmark.id)}
                            disabled={deletingId === bookmark.id}
                            className="ml-4 text-gray-400 hover:text-red-600">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
