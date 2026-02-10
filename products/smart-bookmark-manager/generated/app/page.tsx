import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { BookmarkIcon, SearchIcon, TagIcon, SparklesIcon } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";

export default async function LandingPage() {
    const user = await currentUser();

    // Redirect authenticated users to dashboard
    if (user) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="container mx-auto px-4 py-6">
                <nav className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <BookmarkIcon className="h-8 w-8 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900">
                            Smart Bookmark Manager
                        </h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <SignInButton mode="modal">
                            <button className="btn-secondary">Sign In</button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="btn-primary">Sign Up</button>
                        </SignUpButton>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-4 py-16">
                <div className="text-center max-w-4xl mx-auto">
                    <h2 className="text-5xl font-bold text-gray-900 mb-6">
                        Save it, find it -{" "}
                        <span className="text-blue-600">ohne zu denken</span>
                    </h2>

                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                        Der einzige Bookmark Manager mit automatischer
                        AI-Kategorisierung. Sammle Links ohne Chaos, finde alles
                        ohne Suchen.
                    </p>

                    <SignUpButton mode="modal">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl">
                            Get Started Free
                        </button>
                    </SignUpButton>

                    <p className="text-sm text-gray-500 mt-4">
                        No credit card required • Free forever
                    </p>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
                    <div className="text-center p-6">
                        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SparklesIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            AI Categorizes Automatically
                        </h3>
                        <p className="text-gray-600">
                            Claude AI analyzes your bookmarks and suggests smart
                            categories. No manual tagging needed.
                        </p>
                    </div>

                    <div className="text-center p-6">
                        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SearchIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            Smart Search Finds Everything
                        </h3>
                        <p className="text-gray-600">
                            Search by title, URL, or category. Lightning-fast
                            results in under 500ms.
                        </p>
                    </div>

                    <div className="text-center p-6">
                        <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TagIcon className="h-8 w-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            No Manual Organization
                        </h3>
                        <p className="text-gray-600">
                            Just save URLs. AI handles the rest. Filter by
                            categories or mark favorites.
                        </p>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="text-center mt-20 p-8 bg-white rounded-2xl shadow-sm border border-gray-200 max-w-2xl mx-auto">
                    <blockquote className="text-lg text-gray-700 italic mb-4">
                        "Finally, a bookmark manager that actually works. I
                        saved 200+ links in my first week and can find
                        everything instantly."
                    </blockquote>
                    <div className="text-gray-500">— Future Happy User</div>
                </div>
            </main>
        </div>
    );
}
