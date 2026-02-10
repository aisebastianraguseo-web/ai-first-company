import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import BookmarksList from "@/components/BookmarksList";
import AddBookmarkForm from "@/components/AddBookmarkForm";
import Sidebar from "@/components/Sidebar";

interface Bookmark {
    id: string;
    url: string;
    title: string | null;
    ai_categories: string[];
    created_at: string;
}

async function getBookmarks(userId: string): Promise<Bookmark[]> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching bookmarks:", error);
        return [];
    }

    return data || [];
}

export default async function DashboardPage() {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const bookmarks = await getBookmarks(user.id);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Sidebar />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Add Bookmark
                        </h2>
                        <AddBookmarkForm />
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Your Bookmarks ({bookmarks.length})
                        </h2>
                        <BookmarksList bookmarks={bookmarks} />
                    </div>
                </div>
            </div>
        </div>
    );
}
