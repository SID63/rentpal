// Real-time messaging hook using Supabase subscriptions
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Message, ConversationWithDetails } from '@/types/database'

export function useRealTimeMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) {
      setLoading(false)
      return
    }

    const fetchMessages = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles(*)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) {
          setError('Failed to fetch messages')
          return
        }

        setMessages(data || [])
      } catch {
        setError('Failed to fetch messages')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMessage) {
            setMessages(prev => [...prev, newMessage])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Update message (e.g., mark as read)
          const { data: updatedMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (updatedMessage) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Mark messages as read when user views them
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return

    const unreadMessages = messages.filter(
      msg => !msg.is_read && msg.recipient_id === user.id
    )

    if (unreadMessages.length > 0) {
      const markAsRead = async () => {
        const messageIds = unreadMessages.map(msg => msg.id)
        
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', messageIds)
      }

      // Debounce the mark as read operation
      const timeoutId = setTimeout(markAsRead, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [messages, user, conversationId])

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !conversationId || !content.trim()) return null

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          recipient_id: '', // Will be determined by the conversation
          content: content.trim(),
          message_type: 'text'
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      return data
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message')
      return null
    }
  }, [user, conversationId])

  return {
    messages,
    loading,
    error,
    sendMessage
  }
}

export function useRealTimeConversations() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch initial conversations
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchConversations = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            participant_1:profiles!conversations_participant_1_id_fkey(*),
            participant_2:profiles!conversations_participant_2_id_fkey(*),
            item:items(*),
            booking:bookings(*)
          `)
          .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false })

        if (error) {
          setError('Failed to fetch conversations')
          return
        }

        // Fetch unread counts for each conversation
        const conversationsWithUnread = await Promise.all(
          (data || []).map(async (conversation) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversation.id)
              .eq('recipient_id', user.id)
              .eq('is_read', false)

            return {
              ...conversation,
              unread_count: count || 0
            }
          })
        )

        setConversations(conversationsWithUnread)
      } catch {
        setError('Failed to fetch conversations')
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [user])

  // Set up real-time subscription for conversations
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `participant_1_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the complete conversation with relations
          const { data: newConversation } = await supabase
            .from('conversations')
            .select(`
              *,
              participant_1:profiles!conversations_participant_1_id_fkey(*),
              participant_2:profiles!conversations_participant_2_id_fkey(*),
              item:items(*),
              booking:bookings(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newConversation) {
            setConversations(prev => [{ ...newConversation, unread_count: 0 }, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `participant_2_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the complete conversation with relations
          const { data: newConversation } = await supabase
            .from('conversations')
            .select(`
              *,
              participant_1:profiles!conversations_participant_1_id_fkey(*),
              participant_2:profiles!conversations_participant_2_id_fkey(*),
              item:items(*),
              booking:bookings(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newConversation) {
            setConversations(prev => [{ ...newConversation, unread_count: 0 }, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          // Update conversation (e.g., last_message_at)
          setConversations(prev =>
            prev.map(conv =>
              conv.id === payload.new.id
                ? { ...conv, last_message_at: payload.new.last_message_at }
                : conv
            ).sort((a, b) => 
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Set up real-time subscription for new messages (to update unread counts)
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`user_messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          // Update unread count for the conversation
          setConversations(prev =>
            prev.map(conv =>
              conv.id === payload.new.conversation_id
                ? { ...conv, unread_count: (conv.unread_count || 0) + 1 }
                : conv
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          // Update unread count when messages are marked as read
          if (payload.new.is_read && !payload.old.is_read) {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === payload.new.conversation_id
                  ? { ...conv, unread_count: Math.max(0, (conv.unread_count || 0) - 1) }
                  : conv
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    conversations,
    loading,
    error
  }
}