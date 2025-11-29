import { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Send,
  Plus,
  Code,
  Edit2,
  Trash2,
  X,
  Lock,
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function Chat() {
  const { user } = useAuthStore();
  const {
    channels,
    messages,
    currentChannel,
    isLoading,
    isLoadingMessages,
    fetchChannels,
    setCurrentChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    createChannel,
    subscribeToMessages,
  } = useChatStore();

  const [newMessage, setNewMessage] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (currentChannel) {
      const unsubscribe = subscribeToMessages(currentChannel.id);
      return unsubscribe;
    }
  }, [currentChannel, subscribeToMessages]);

  useEffect(() => {
    // Auto-scroll al final cuando llegan nuevos mensajes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChannel) return;

    await sendMessage(
      currentChannel.id,
      newMessage,
      isCodeMode ? 'code' : 'text',
      isCodeMode ? codeLanguage : undefined
    );

    setNewMessage('');
    setIsCodeMode(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    await createChannel(newChannelName.toLowerCase().replace(/\s+/g, '-'), newChannelDesc);
    setShowNewChannel(false);
    setNewChannelName('');
    setNewChannelDesc('');
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editContent.trim()) return;
    await editMessage(editingMessage, editContent);
    setEditingMessage(null);
    setEditContent('');
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ id: messageId, x: e.clientX, y: e.clientY });
  };

  const formatMessageDate = (date: string) => {
    const d = parseISO(date);
    if (isToday(d)) return `Hoy a las ${format(d, 'HH:mm')}`;
    if (isYesterday(d)) return `Ayer a las ${format(d, 'HH:mm')}`;
    return format(d, "d MMM 'a las' HH:mm", { locale: es });
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: typeof messages }[] = [];
    let currentDate = '';

    messages.forEach((msg) => {
      const msgDate = format(parseISO(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const formatGroupDate = (date: string) => {
    const d = parseISO(date);
    if (isToday(d)) return 'Hoy';
    if (isYesterday(d)) return 'Ayer';
    return format(d, "EEEE, d 'de' MMMM", { locale: es });
  };

  return (
    <div className="flex flex-1 min-h-0 bg-[#11111b]">
      {/* Sidebar de canales */}
      <div className="w-64 bg-[#181825] border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Canales</h2>
            <button
              onClick={() => setShowNewChannel(true)}
              className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-gray-400 hover:text-white transition-colors"
              title="Crear canal"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setCurrentChannel(channel)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentChannel?.id === channel.id
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:bg-[#1e1e2e] hover:text-white'
                  }`}
                >
                  {channel.type === 'private' ? (
                    <Lock size={16} />
                  ) : (
                    <Hash size={16} />
                  )}
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área principal de chat */}
      <div className="flex-1 flex flex-col">
        {currentChannel ? (
          <>
            {/* Header del canal */}
            <div className="px-6 py-4 border-b border-gray-700 bg-[#181825]">
              <div className="flex items-center gap-3">
                <Hash size={20} className="text-gray-400" />
                <div>
                  <h1 className="font-semibold text-white">{currentChannel.name}</h1>
                  {currentChannel.description && (
                    <p className="text-sm text-gray-500">{currentChannel.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Hash size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Bienvenido a #{currentChannel.name}</p>
                  <p className="text-sm">Este es el inicio del canal. ¡Envía el primer mensaje!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupMessagesByDate().map((group) => (
                    <div key={group.date}>
                      {/* Separador de fecha */}
                      <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-gray-700" />
                        <span className="text-xs text-gray-500 font-medium">
                          {formatGroupDate(group.date)}
                        </span>
                        <div className="flex-1 h-px bg-gray-700" />
                      </div>

                      {/* Mensajes del grupo */}
                      <div className="space-y-4">
                        {group.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className="group flex gap-3 hover:bg-[#181825]/50 -mx-4 px-4 py-2 rounded-lg"
                            onContextMenu={(e) => msg.user_id === user?.id && handleContextMenu(e, msg.id)}
                          >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                              {msg.user?.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-white">
                                  {msg.user?.full_name || 'Usuario'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatMessageDate(msg.created_at)}
                                </span>
                                {msg.edited_at && (
                                  <span className="text-xs text-gray-600">(editado)</span>
                                )}
                              </div>

                              {editingMessage === msg.id ? (
                                <div className="mt-2">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-[#11111b] border border-gray-600 rounded-lg p-2 text-white resize-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={handleEditMessage}
                                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      onClick={() => setEditingMessage(null)}
                                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : msg.message_type === 'code' ? (
                                <div className="mt-1 bg-[#11111b] rounded-lg overflow-hidden border border-gray-700">
                                  {msg.code_language && (
                                    <div className="px-3 py-1 bg-[#181825] text-xs text-gray-400 border-b border-gray-700">
                                      {msg.code_language}
                                    </div>
                                  )}
                                  <pre className="p-3 text-sm text-gray-300 overflow-x-auto">
                                    <code>{msg.content}</code>
                                  </pre>
                                </div>
                              ) : (
                                <p className="text-gray-300 mt-1 whitespace-pre-wrap break-words">
                                  {msg.content}
                                </p>
                              )}
                            </div>

                            {/* Acciones (solo para mensajes propios) */}
                            {msg.user_id === user?.id && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
                                <button
                                  onClick={() => {
                                    setEditingMessage(msg.id);
                                    setEditContent(msg.content);
                                  }}
                                  className="p-1.5 rounded hover:bg-[#1e1e2e] text-gray-500 hover:text-white"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteMessage(msg.id)}
                                  className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input de mensaje */}
            <div className="px-6 py-4 border-t border-gray-700 bg-[#181825]">
              {isCodeMode && (
                <div className="flex items-center gap-2 mb-2">
                  <Code size={16} className="text-blue-400" />
                  <span className="text-sm text-blue-400">Modo código</span>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-[#11111b] border border-gray-600 rounded px-2 py-1 text-sm text-gray-300"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="sql">SQL</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="bash">Bash</option>
                    <option value="json">JSON</option>
                  </select>
                  <button
                    onClick={() => setIsCodeMode(false)}
                    className="ml-auto text-gray-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-[#11111b] rounded-xl border border-gray-700 focus-within:border-blue-500 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Mensaje en #${currentChannel.name}`}
                    className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 outline-none resize-none"
                    rows={isCodeMode ? 4 : 1}
                    style={{ minHeight: isCodeMode ? '100px' : '44px', maxHeight: '200px' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCodeMode(!isCodeMode)}
                    className={`p-3 rounded-xl transition-colors ${
                      isCodeMode
                        ? 'bg-blue-500 text-white'
                        : 'bg-[#11111b] text-gray-400 hover:text-white hover:bg-[#1e1e2e]'
                    }`}
                    title="Enviar código"
                  >
                    <Code size={20} />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Hash size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl font-medium">Selecciona un canal</p>
              <p className="text-sm mt-1">Elige un canal de la lista para empezar a chatear</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo canal */}
      {showNewChannel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#181825] rounded-xl border border-gray-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Crear Canal</h2>
              <button
                onClick={() => setShowNewChannel(false)}
                className="p-2 rounded-lg hover:bg-[#1e1e2e] text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del canal
                </label>
                <div className="flex items-center bg-[#11111b] border border-gray-600 rounded-lg overflow-hidden">
                  <span className="px-3 text-gray-500">#</span>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="nuevo-canal"
                    className="flex-1 bg-transparent px-2 py-3 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="¿De qué trata este canal?"
                  className="w-full bg-[#11111b] border border-gray-600 rounded-lg px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewChannel(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Crear Canal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-[#181825] border border-gray-700 rounded-lg shadow-xl py-1 min-w-[150px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.id);
                if (msg) {
                  setEditingMessage(msg.id);
                  setEditContent(msg.content);
                }
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-[#1e1e2e] text-left"
            >
              <Edit2 size={16} />
              Editar
            </button>
            <button
              onClick={() => {
                deleteMessage(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 text-left"
            >
              <Trash2 size={16} />
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
