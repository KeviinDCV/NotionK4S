import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Share2,
  Trash2,
  Edit3,
  Users,
  X,
  Check,
  UserPlus,
} from 'lucide-react';
import { usePersonalNotesStore } from '../store/personalNotesStore';
import { useTeamStore } from '../store/teamStore';
import { useAuthStore } from '../store/authStore';
import { ConfirmModal } from '../components/ConfirmModal';
import { PersonalNote } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function Notepad() {
  const { user } = useAuthStore();
  const { notes, sharedWithMe, isLoading, fetchNotes, createNote, updateNote, deleteNote, shareNote, unshareNote, getShares } = usePersonalNotesStore();
  const { members, fetchMembers } = useTeamStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  const [shares, setShares] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');

  useEffect(() => {
    fetchNotes();
    fetchMembers();
  }, [fetchNotes, fetchMembers]);

  useEffect(() => {
    if (shareModal.noteId) {
      getShares(shareModal.noteId).then(setShares);
    }
  }, [shareModal.noteId, getShares]);

  const filteredNotes = (activeTab === 'my' ? notes : sharedWithMe).filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return;
    const { note } = await createNote(newTitle.trim());
    if (note) {
      setSelectedNote(note);
      setEditContent('');
      setEditTitle(newTitle.trim());
      setIsEditing(true);
    }
    setShowNewNote(false);
    setNewTitle('');
  };

  const handleSelectNote = (note: PersonalNote) => {
    if (isEditing && selectedNote) {
      // Guardar cambios antes de cambiar
      updateNote(selectedNote.id, { title: editTitle, content: editContent });
    }
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    await updateNote(selectedNote.id, { title: editTitle, content: editContent });
    setSelectedNote({ ...selectedNote, title: editTitle, content: editContent });
    setIsEditing(false);
  };

  const handleDeleteNote = async () => {
    if (deleteModal.noteId) {
      await deleteNote(deleteModal.noteId);
      if (selectedNote?.id === deleteModal.noteId) {
        setSelectedNote(null);
      }
    }
    setDeleteModal({ isOpen: false, noteId: null });
  };

  const handleShare = async (userId: string, canEdit: boolean) => {
    if (!shareModal.noteId) return;
    await shareNote(shareModal.noteId, userId, canEdit);
    const newShares = await getShares(shareModal.noteId);
    setShares(newShares);
  };

  const handleUnshare = async (userId: string) => {
    if (!shareModal.noteId) return;
    await unshareNote(shareModal.noteId, userId);
    const newShares = await getShares(shareModal.noteId);
    setShares(newShares);
  };

  const canEditNote = (note: PersonalNote) => {
    if (note.owner_id === user?.id) return true;
    // Verificar si tiene permiso de edición en shares
    return shares.some(s => s.shared_with === user?.id && s.can_edit);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar de notas */}
      <div className="w-80 bg-[#181825] border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={20} />
              Notepad
            </h1>
            <button
              onClick={() => setShowNewNote(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar notas..."
              className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex mt-4 bg-[#11111b] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'my' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mis Notas ({notes.length})
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'shared' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Compartidas ({sharedWithMe.length})
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay notas</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-blue-600/20 border border-blue-500/50'
                    : 'hover:bg-[#1e1e2e] border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-white text-sm truncate">{note.title}</h3>
                  <div className="flex items-center gap-1">
                    {note.is_shared && <Share2 size={12} className="text-green-400" />}
                    {note.owner_id !== user?.id && <Users size={12} className="text-blue-400" />}
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                  {note.content || 'Sin contenido'}
                </p>
                <p className="text-gray-600 text-xs mt-2">
                  {format(new Date(note.updated_at), "d MMM HH:mm", { locale: es })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-[#11111b]">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-transparent text-xl font-bold text-white focus:outline-none"
                    placeholder="Título de la nota"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-white">{selectedNote.title}</h2>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {activeTab === 'shared' && selectedNote.owner && (
                    <span>Compartida por {selectedNote.owner.full_name} • </span>
                  )}
                  Actualizada {format(new Date(selectedNote.updated_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEditNote(selectedNote) && (
                  <>
                    {isEditing ? (
                      <button
                        onClick={handleSaveNote}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Check size={16} />
                        Guardar
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>
                    )}
                  </>
                )}
                {selectedNote.owner_id === user?.id && (
                  <>
                    <button
                      onClick={() => setShareModal({ isOpen: true, noteId: selectedNote.id })}
                      className="p-2 hover:bg-[#1e1e2e] text-gray-400 hover:text-white rounded-lg transition-colors"
                      title="Compartir"
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, noteId: selectedNote.id })}
                      className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none text-base leading-relaxed"
                  placeholder="Escribe tu nota aquí..."
                />
              ) : (
                <div className="prose prose-invert max-w-none">
                  {selectedNote.content ? (
                    <pre className="whitespace-pre-wrap font-sans text-gray-300 text-base leading-relaxed">
                      {selectedNote.content}
                    </pre>
                  ) : (
                    <p className="text-gray-500 italic">Esta nota está vacía. Haz clic en "Editar" para agregar contenido.</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText size={64} className="mx-auto mb-4 opacity-30" />
              <p>Selecciona una nota o crea una nueva</p>
            </div>
          </div>
        )}
      </div>

      {/* New Note Modal */}
      {showNewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#181825] rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Nueva Nota</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título de la nota"
              className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowNewNote(false); setNewTitle(''); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#181825] rounded-xl border border-gray-700 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Share2 size={20} />
                Compartir Nota
              </h3>
              <button
                onClick={() => setShareModal({ isOpen: false, noteId: null })}
                className="p-1 hover:bg-[#1e1e2e] rounded-lg text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-400 mb-4">Selecciona usuarios para compartir esta nota:</p>
              
              {members.filter(m => m.id !== user?.id).map((member) => {
                const isShared = shares.some(s => s.shared_with === member.id);
                const share = shares.find(s => s.shared_with === member.id);
                
                return (
                  <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {member.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{member.full_name}</p>
                        <p className="text-gray-500 text-xs">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isShared ? (
                        <>
                          <select
                            value={share?.can_edit ? 'edit' : 'view'}
                            onChange={(e) => handleShare(member.id, e.target.value === 'edit')}
                            className="bg-[#11111b] border border-gray-700 rounded px-2 py-1 text-sm text-white"
                          >
                            <option value="view">Solo ver</option>
                            <option value="edit">Puede editar</option>
                          </select>
                          <button
                            onClick={() => handleUnshare(member.id)}
                            className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleShare(member.id, false)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <UserPlus size={14} />
                          Compartir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {members.filter(m => m.id !== user?.id).length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay otros usuarios para compartir</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, noteId: null })}
        onConfirm={handleDeleteNote}
        title="Eliminar nota"
        message="¿Estás seguro de eliminar esta nota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
