'use client'

import { useState } from 'react'
import { ConversationWithDetails } from '@/types/database'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'

interface MessagingInterfaceProps {
  className?: string
}

export default function MessagingInterface({ className = "" }: MessagingInterfaceProps) {
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)

  const handleConversationSelect = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation)
    setIsMobileView(true)
  }

  const handleBackToList = () => {
    setIsMobileView(false)
    setSelectedConversation(null)
  }

  return (
    <div className={`flex h-full bg-gray-100 ${className}`}>
      {/* Conversation List - Hidden on mobile when conversation is selected */}
      <div className={`w-full md:w-80 flex-shrink-0 ${
        isMobileView ? 'hidden md:block' : 'block'
      }`}>
        <ConversationList
          onConversationSelect={handleConversationSelect}
          selectedConversationId={selectedConversation?.id}
          className="h-full"
        />
      </div>

      {/* Message Thread */}
      <div className={`flex-1 ${
        !selectedConversation && !isMobileView ? 'hidden md:flex' : 'flex'
      } flex-col`}>
        {selectedConversation ? (
          <div className="flex flex-col h-full">
            {/* Mobile back button */}
            <div className="md:hidden p-4 border-b bg-white">
              <button
                onClick={handleBackToList}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to conversations
              </button>
            </div>
            
            <MessageThread 
              conversation={selectedConversation} 
              className="flex-1"
            />
          </div>
        ) : (
          /* Empty State - Desktop only */
          <div className="hidden md:flex flex-1 items-center justify-center bg-white">
            <div className="text-center max-w-md mx-auto px-6">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600 mb-6">
                Choose a conversation from the list to start messaging, or start a new conversation by contacting someone about their item.
              </p>
              
              {/* Quick Actions */}
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Browse Items
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                  View My Listings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}