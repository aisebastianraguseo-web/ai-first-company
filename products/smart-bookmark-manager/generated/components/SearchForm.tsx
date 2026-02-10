'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'

export default function SearchForm(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setSearch(searchParams?.get('search') || '')
  }, [searchParams])

  useEffect(() => {
    if (search.length < 2) return

    const timeoutId = setTimeout(() => {
      setIsLoading(true)
      const params = new URLSearchParams(searchParams?.toString())
      
      if (search.trim()) {
        params.set('search', search.trim())
      } else {
        params.delete('search')
      }
      
      router.push(`/dashboard?${params.toString()}`)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, router, searchParams])

  const handleClear = (): void => {
    setSearch('')
    const params = new URLSearchParams(searchParams?.toString())
    params.delete('search')
    router.push(`/dashboard?${params.toString()}`)
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (search.length < 2) return

    const params = new URLSearchParams(searchParams?.toString())
    if (search.trim()) {
      params.set('search', search.trim())
    } else {
      params.delete('search')
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {search.length > 0 && search.length < 2 && (
        <p className="text-sm text-gray-500 mt-1">Type at least 2 characters to search</p>
      )}
    </form>
  )
}