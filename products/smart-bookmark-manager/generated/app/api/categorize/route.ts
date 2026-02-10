import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { categorizeWithAI } from '@/lib/anthropic'
import { extractPageContent } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 2. Input validation
    const body = await request.json()
    const { bookmarkId, url, title } = body
    
    if (!bookmarkId || !url || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: bookmarkId, url, title' },
        { status: 400 }
      )
    }
    
    // 3. Extract page content
    let content = ''
    try {
      content = await extractPageContent(url)
    } catch (error) {
      console.error('Failed to extract content:', error)
      // Continue with just title if content extraction fails
      content = title
    }
    
    // 4. Get AI categories
    let categories: string[] = []
    try {
      categories = await categorizeWithAI(title, url, content)
    } catch (error) {
      console.error('AI categorization failed:', error)
      // Fallback to a general category
      categories = ['General']
    }
    
    // 5. Save categories to database
    const supabase = createServerSupabaseClient()
    
    // Verify bookmark belongs to user
    const { data: bookmark } = await supabase
      .from('bookmarks')
      .select('user_id')
      .eq('id', bookmarkId)
      .single()
    
    if (!bookmark || bookmark.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Bookmark not found or access denied' },
        { status: 404 }
      )
    }
    
    // Insert categories
    const categoryData = categories.map(category => ({
      bookmark_id: bookmarkId,
      category_name: category
    }))
    
    const { error: insertError } = await supabase
      .from('bookmark_categories')
      .insert(categoryData)
    
    if (insertError) {
      console.error('Failed to save categories:', insertError)
      return NextResponse.json(
        { error: 'Failed to save categories' },
        { status: 500 }
      )
    }
    
    // 6. Return success
    return NextResponse.json({
      success: true,
      data: {
        bookmarkId,
        categories
      }
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}