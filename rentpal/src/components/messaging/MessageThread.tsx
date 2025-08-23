'use client'

import { useState, useEffect, useRef } from 'react'
import { ConversationWithDetails, MessageWithDetails } from '@/types/database'
import { useMessages } from '@/hooks/useDatabase'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

interface MessageThreadProps {
  conversation: ConversationWithDetails
  className?: string
}

export default function MessageThread({ 
  conversation, 
  className = "" 
}: MessageThreadProps) {
  const { messages, loading, error, sendMessage } = useMessages(conversation.id)
  const { user } = useAuth()
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const otherParticipant = conversation.participant_1_id === user?.id 
    ? conversation.participant_2 
    : conversation.participant_1

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    setSending(true)
    
    try {
      await sendMessage(newMessage.trim())
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const groupMessagesByDate = (messages: MessageWithDetails[]) => {
    const groups: { [key: string]: MessageWithDetails[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  if (loading) {
    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        {/* Header */}
        <div className="p-4 border-b animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-xs">
                <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          {otherParticipant.avatar_url ? (
            <Image
              src={otherParticipant.avatar_url}
              alt={otherParticipant.full_name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {otherParticipant.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Info */}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{otherParticipant.full_name}</h3>
            {conversation.item && (
              <p className="text-sm text-gray-600">About: {conversation.item.title}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {conversation.booking && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Booking #{conversation.booking.id.slice(-8).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messageGroups).map(([dateString, dayMessages]) => (
          <div key={dateString}>
            {/* Date Header */}
            <div className="flex justify-center mb-4">
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {formatDateHeader(dateString)}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dayMessages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.message_type === 'system' ? (
                          <p className="text-sm italic">{message.content}</p>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${
                        isOwnMessage ? 'text-right' : 'text-left'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
              <p className="text-gray-600">Send a message to get started.</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}