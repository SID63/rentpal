'use client'

import { useState } from 'react'
import { ItemWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { messageService } from '@/lib/database'
import Image from 'next/image'

interface StartConversationProps {
  item: ItemWithDetails
  onConversationStarted?: (conversationId: string) => void
  className?: string
}

export default function StartConversation({ 
  item, 
  onConversationStarted,
  className = "" 
}: StartConversationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || !user || sending) return

    setSending(true)
    setError(null)

    try {
      // First, check if a conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .or(`participant_1_id.eq.${item.owner_id},participant_2_id.eq.${item.owner_id}`)
        .eq('item_id', item.id)
        .single()

      let conversationId: string

      if (existingConversation) {
        conversationId = existingConversation.id
      } else {
        // Create new conversation
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            participant_1_id: user.id,
            participant_2_id: item.owner_id,
            item_id: item.id
          })
          .select('id')
          .single()

        if (conversationError || !newConversation) {
          throw new Error('Failed to create conversation')
        }

        conversationId = newConversation.id
      }

      // Send the message
      const sentMessage = await messageService.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: item.owner_id,
        content: message.trim(),
        message_type: 'text'
      })

      if (!sentMessage) {
        throw new Error('Failed to send message')
      }

      setMessage('')
      setIsOpen(false)
      
      if (onConversationStarted) {
        onConversationStarted(conversationId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (!user || user.id === item.owner_id) {
    return null // Don't show for item owner or unauthenticated users
  }

  return (
    <div className={className}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Contact Owner
        </button>
      ) : (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Send a Message</h3>
            <button
              onClick={() => {
                setIsOpen(false)
                setMessage('')
                setError(null)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Owner Info */}
          <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
            {item.owner.avatar_url ? (
              <Image
                src={item.owner.avatar_url}
                alt={item.owner.full_name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {item.owner.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{item.owner.full_name}</p>
              <p className="text-sm text-gray-600">Owner of {item.title}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSendMessage}>
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Your Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi! I'm interested in renting "${item.title}". Could you tell me more about it?`}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setMessage('')
                  setError(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}