'use client'

import { UserButton } from '@clerk/nextjs'
import { BookmarkIcon, PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Smart Bookmarks</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            pathname === '/dashboard'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookmarkIcon className="h-5 w-5" />
          <span className="text-sm font-medium">All Bookmarks</span>
        </Link>

        <Link
          href="/dashboard/add"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            pathname === '/dashboard/add'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <PlusIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Add Bookmark</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  )
}
