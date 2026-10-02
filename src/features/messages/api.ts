import { apiGet, apiSend } from "@/lib/api/client"
import type { Conversation, ConversationMessage, ConversationParticipant, IncidentMessage } from "@/types/api"

export const messagesApi = {
  conversations: () => apiGet<Conversation[]>("/conversaciones"),
  participants: () => apiGet<ConversationParticipant[]>("/conversaciones/participantes"),
  createConversation: (body: {
    tipo: "PRIVADA" | "GRUPAL"
    nombre?: string
    participantes: string[]
  }) => apiSend<Conversation>("/conversaciones", "POST", body),
  messages: (id: string) => apiGet<ConversationMessage[]>(`/conversaciones/${id}/mensajes`),
  send: (id: string, cuerpo: string) =>
    apiSend<ConversationMessage>(`/conversaciones/${id}/mensajes`, "POST", { cuerpo }),
  sendFile: (id: string, file: File, cuerpo: string) => {
    const form = new FormData()
    form.append("archivo", file)
    if (cuerpo.trim()) form.append("cuerpo", cuerpo.trim())
    return apiSend<ConversationMessage>(`/conversaciones/${id}/mensajes/archivo`, "POST", form)
  },
  supervisedChats: () => apiGet<IncidentMessage[]>("/chat-supervision/tecnico-empleado"),
}
