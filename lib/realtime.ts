import { supabaseClient } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type GameEventPayload = {
  type: string
  [key: string]: unknown
}

// Function to subscribe to a room's realtime channel
export const subscribeToRoom = (
  roomCode: string,
  onEventReceived: (payload: GameEventPayload) => void
) => {
  const channel = supabaseClient.channel(`room:${roomCode}`)

  channel
    .on('broadcast', { event: 'game_event' }, (payload) => {
      onEventReceived(payload.payload as GameEventPayload)
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Berhasil terhubung ke channel room:${roomCode}`)
      }
    })

  return channel
}

// Function to leave a room's realtime channel
export const unsubscribeFromRoom = (channel: RealtimeChannel | null) => {
  if (channel) {
    supabaseClient.removeChannel(channel)
  }
}
