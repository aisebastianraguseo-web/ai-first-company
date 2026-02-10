import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { categorizeUrl } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: "URL is required" },
                { status: 400 }
            );
        }

        // Categorize with AI
        const ai_categories = await categorizeUrl(url);

        // Save to database
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase
            .from("bookmarks")
            .insert({
                user_id: user.id,
                url,
                title: url, // You can fetch actual title later
                ai_categories,
            })
            .select()
            .single();

        if (error) {
            console.error("Database insert error:", error);
            return NextResponse.json(
                { error: "Failed to save bookmark" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "ID is required" },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();
        const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            console.error("Database delete error:", error);
            return NextResponse.json(
                { error: "Failed to delete bookmark" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
