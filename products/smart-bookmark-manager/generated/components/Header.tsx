'use client'

import { UserButton } from '@clerk/nextjs'
import { BookmarkIcon } from 'lucide-react'
import Link from 'next/link'
import SearchForm from './SearchForm'

export default function Header(): JSX.Element {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <BookmarkIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Smart Bookmarks</h1>
          </Link>
          
          {/* Search */}
          <div className="flex-1 max-w-lg mx-8">
            <SearchForm />
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}