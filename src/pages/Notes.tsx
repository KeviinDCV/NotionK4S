import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  CheckSquare,
  Bug,
  Sparkles,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { ConfirmModal } from '../components/ConfirmModal';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const typeFilters = [
  { value: null, label: 'Todos', icon: FileText },
  { value: 'task', label: 'Tareas', icon: CheckSquare },
  { value: 'bug', label: 'Bugs', icon: Bug },
  { value: 'feature', label: 'Features', icon: Sparkles },
  { value: 'note', label: 'Notas', icon: FileText },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
};


export function Notes() {
  const navigate = useNavigate();
  const { notes, isLoading, fetchNotes, deleteNote, filter, setFilter } = useNotesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noteId: string | null; noteTitle: string }>({
    isOpen: false,
    noteId: null,
    noteTitle: '',
  });
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilter({ search: value });
  };

  const openDeleteModal = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, noteId: id, noteTitle: title });
    setActiveMenu(null);
  };

  const handleDelete = async () => {
    if (deleteModal.noteId) {
      await deleteNote(deleteModal.noteId);
    }
    setDeleteModal({ isOpen: false, noteId: null, noteTitle: '' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare size={16} />;
      case 'bug': return <Bug size={16} />;
      case 'feature': return <Sparkles size={16} />;
      default: return <FileText size={16} />;
    }
  };

  // Filtrar subtareas - solo mostrar tareas principales (sin parent_id)
  const mainNotes = notes.filter(note => !note.parent_id);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notas</h1>
          <p className="text-gray-400 mt-1">Gestiona todas tus notas y registros</p>
        </div>
        <button
          onClick={() => navigate('/notes/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nueva Nota
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar notas..."
            className="w-full bg-[#181825] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {typeFilters.map((type) => (
            <button
              key={type.value || 'all'}
              onClick={() => setFilter({ type: type.value })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filter.type === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#181825] text-gray-400 hover:text-white hover:bg-[#1e1e2e]'
              }`}
            >
              <type.icon size={16} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : mainNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainNotes.map((note) => (
            <div
              key={note.id}
              className="bg-[#181825] rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors group cursor-pointer"
              onClick={() => navigate(`/notes/${note.id}`)}
              onContextMenu={(e) => handleContextMenu(e, note)}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${
                  note.type === 'task' ? 'bg-yellow-500/20 text-yellow-400' :
                  note.type === 'bug' ? 'bg-red-500/20 text-red-400' :
                  note.type === 'feature' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {getTypeIcon(note.type)}
                  {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setActiveMenu(activeMenu === note.id ? null : note.id)}
                    className="p-1 rounded hover:bg-[#1e1e2e] text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {activeMenu === note.id && (
                    <div className="absolute right-0 top-8 bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                      <button
                        onClick={() => {
                          navigate(`/notes/${note.id}`);
                          setActiveMenu(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-[#181825] hover:text-white"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => openDeleteModal(note.id, note.title)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-[#181825]"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <h3 className="text-white font-medium mb-2 line-clamp-2">{note.title}</h3>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4">{note.content}</p>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[note.status]}`}>
                  {note.status === 'completed' ? 'Completado' :
                   note.status === 'in_progress' ? 'En progreso' :
                   note.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                </span>
                <span className="text-gray-500 text-xs">
                  {format(new Date(note.created_at), "d MMM", { locale: es })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No hay notas</h3>
          <p className="text-gray-400 mb-6">Crea tu primera nota para empezar a documentar</p>
          <button
            onClick={() => navigate('/notes/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Crear Nota
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, noteId: null, noteTitle: '' })}
        onConfirm={handleDelete}
        title="Eliminar nota"
        message={`¿Estás seguro de eliminar "${deleteModal.noteTitle}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Context Menu (Click Derecho) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          items={[
            {
              label: 'Abrir',
              icon: <ExternalLink size={16} />,
              onClick: () => navigate(`/notes/${contextMenu.data.id}`),
            },
            {
              label: 'Editar',
              icon: <Edit size={16} />,
              onClick: () => navigate(`/notes/${contextMenu.data.id}`),
            },
            {
              label: 'Copiar título',
              icon: <Copy size={16} />,
              onClick: () => navigator.clipboard.writeText(contextMenu.data.title),
            },
            { divider: true, label: '', onClick: () => {} },
            {
              label: 'Eliminar',
              icon: <Trash2 size={16} />,
              onClick: () => openDeleteModal(contextMenu.data.id, contextMenu.data.title),
              variant: 'danger',
            },
          ]}
        />
      )}
    </div>
  );
}
