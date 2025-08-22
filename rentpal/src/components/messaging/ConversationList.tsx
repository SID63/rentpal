'use client'

import { useState } from 'react'
import { ConversationWithDetails } from '@/types/database'
import { useConversations } from '@/hooks/useDatabase'
import { useAuth } from '@/contexts/AuthContext'

interface ConversationListProps {
  onConversationSelect?: (conversation: ConversationWithDetails) => void
  selectedConversationId?: string
  className?: string
}

export default function ConversationList({ 
  onConversationSelect, 
  selectedConversationId,
  className = "" 
}: ConversationListProps) {
  const { conversations, loading, error } = useConversations()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true
    
    const otherParticipant = conversation.participant_1_id === user?.id 
      ? conversation.participant_2 
      : conversation.participant_1
    
    return otherParticipant.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conversation.item?.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) { // 7 days
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getOtherParticipant = (conversation: ConversationWithDetails) => {
    return conversation.participant_1_id === user?.id 
      ? conversation.participant_2 
      : conversation.participant_1
  }

  if (loading) {
    return (
      <div className={`bg-white border-r ${className}`}>
        <div className="p-4 border-b">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white border-r ${className}`}>
        <div className="p-4 text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-r ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Messages</h2>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <svg 
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="overflow-y-auto">
        {filteredConversations.length > 0 ? (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation)
              const isSelected = conversation.id === selectedConversationId
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => onConversationSelect?.(conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {otherParticipant.avatar_url ? (
                        <img
                          src={otherParticipant.avatar_url}
                          alt={otherParticipant.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {otherParticipant.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {otherParticipant.full_name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatLastMessageTime(conversation.last_message_at)}
                        </span>
                      </div>
                      
                      {conversation.item && (
                        <p className="text-xs text-gray-600 mb-1 truncate">
                          About: {conversation.item.title}
                        </p>
                      )}
                      
                      {conversation.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.last_message.content}
                        </p>
                      )}
                      
                      {/* Unread indicator */}
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <div className="flex items-center justify-between mt-2">
                          <div></div>
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-sm text-gray-600">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Start a conversation by messaging someone about their item'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}