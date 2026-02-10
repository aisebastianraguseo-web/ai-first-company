import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const bookmarkId = params.id
    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'Bookmark ID is required' },
        { status: 400 }
      )
    }
    
    // 3. Delete bookmark (cascade will delete categories)
    const supabase = createServerSupabaseClient()
    
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', user.id) // Ensure user owns the bookmark
    
    if (error) {
      console.error('Database delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      )
    }
    
    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'Bookmark deleted successfully'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const bookmarkId = params.id
    const body = await request.json()
    const { is_favorite } = body
    
    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'Bookmark ID is required' },
        { status: 400 }
      )
    }
    
    if (typeof is_favorite !== 'boolean') {
      return NextResponse.json(
        { error: 'is_favorite must be a boolean' },
        { status: 400 }
      )
    }
    
    // 3. Update bookmark
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('bookmarks')
      .update({ is_favorite })
      .eq('id', bookmarkId)
      .eq('user_id', user.id) // Ensure user owns the bookmark
      .select()
      .single()
    
    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json(
        { error: 'Failed to update bookmark' },
        { status: 500 }
      )
    }
    
    // 4. Return success
    return NextResponse.json({
      success: true,
      data
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}