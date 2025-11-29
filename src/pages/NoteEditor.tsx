import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  FileText,
  CheckSquare,
  Bug,
  Sparkles,
  Tag,
  MessageSquare,
  Send,
  Trash2,
  Clock,
  Calendar,
  PlayCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { useAuthStore } from '../store/authStore';
import { useCommentsStore } from '../store/commentsStore';
import { useTeamStore } from '../store/teamStore';
import { Note } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const noteTypes = [
  { value: 'note', label: 'Nota', icon: FileText, color: 'bg-blue-500' },
  { value: 'task', label: 'Tarea', icon: CheckSquare, color: 'bg-yellow-500' },
  { value: 'bug', label: 'Bug', icon: Bug, color: 'bg-red-500' },
  { value: 'feature', label: 'Feature', icon: Sparkles, color: 'bg-purple-500' },
];

const noteStatuses = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const notePriorities = [
  { value: 'low', label: 'Baja', color: 'bg-gray-500' },
  { value: 'medium', label: 'Media', color: 'bg-blue-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
];

const statusConfig = [
  { value: 'pending', label: 'Pendiente', icon: Clock, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  { value: 'in_progress', label: 'En Progreso', icon: PlayCircle, color: 'bg-blue-500', textColor: 'text-blue-400' },
  { value: 'completed', label: 'Completado', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-400' },
  { value: 'cancelled', label: 'Cancelado', icon: XCircle, color: 'bg-gray-500', textColor: 'text-gray-400' },
];

export function NoteEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const parentFromUrl = searchParams.get('parent');
  const dateFromUrl = searchParams.get('date');
  const typeFromUrl = searchParams.get('type') as Note['type'] | null;
  const { notes, createNote, updateNote } = useNotesStore();
  const { user } = useAuthStore();
  const { comments, fetchComments, addComment, deleteComment } = useCommentsStore();
  const { members, fetchMembers } = useTeamStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: (typeFromUrl || 'task') as Note['type'],
    status: 'pending' as Note['status'],
    priority: 'medium' as Note['priority'],
    project: '',
    tags: [] as string[],
    assigned_to: '' as string,
    parent_id: parentFromUrl || '',
    due_date: dateFromUrl || '' as string,
    estimated_hours: '' as string,
  });
  const [tagInput, setTagInput] = useState('');

  const isEditing = !!id;
  const currentNote = notes.find(n => n.id === id);
  const subtasks = notes.filter(n => n.parent_id === id);
  const parentNote = currentNote?.parent_id ? notes.find(n => n.id === currentNote.parent_id) : null;
  const parentNoteFromUrl = parentFromUrl ? notes.find(n => n.id === parentFromUrl) : null;
  const isCreatingSubtask = !isEditing && !!parentFromUrl;

  // Cargar miembros del equipo
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Resetear formulario cuando se crea una nueva nota/subtarea
  useEffect(() => {
    if (!id) {
      // Es una nueva nota, resetear el formulario
      setFormData({
        title: '',
        content: '',
        type: (typeFromUrl || 'task') as Note['type'],
        status: 'pending' as Note['status'],
        priority: 'medium' as Note['priority'],
        project: '',
        tags: [],
        assigned_to: '',
        parent_id: parentFromUrl || '',
        due_date: dateFromUrl || '',
        estimated_hours: '',
      });
    }
  }, [id, parentFromUrl, dateFromUrl, typeFromUrl]);

  useEffect(() => {
    if (id) {
      const note = notes.find(n => n.id === id);
      if (note) {
        setFormData({
          title: note.title,
          content: note.content,
          type: note.type,
          status: note.status,
          priority: note.priority,
          project: note.project || '',
          tags: note.tags || [],
          assigned_to: note.assigned_to || '',
          parent_id: note.parent_id || '',
          due_date: note.due_date || '',
          estimated_hours: note.estimated_hours?.toString() || '',
        });
        fetchComments(id);
      }
    }
  }, [id, notes, fetchComments]);

  const handleStatusChange = async (newStatus: Note['status']) => {
    setFormData({ ...formData, status: newStatus });
    if (isEditing && id) {
      await updateNote(id, { status: newStatus });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !id || !user) return;
    await addComment(id, newComment.trim(), user.id);
    setNewComment('');
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const noteData = {
      ...formData,
      created_by: user?.id,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      due_date: formData.due_date || null,
    };

    let result;
    if (isEditing) {
      result = await updateNote(id!, noteData);
    } else {
      result = await createNote(noteData);
    }

    setIsLoading(false);

    if (!result.error) {
      // Si es subtarea, volver a la tarea padre; si no, ir a la lista
      if (isCreatingSubtask && parentFromUrl) {
        navigate(`/notes/${parentFromUrl}`);
      } else {
        navigate('/notes');
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => isCreatingSubtask ? navigate(`/notes/${parentFromUrl}`) : navigate('/notes')}
          className="p-2 rounded-lg hover:bg-[#181825] text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing 
              ? 'Editar ' + noteTypes.find(t => t.value === formData.type)?.label 
              : isCreatingSubtask 
                ? 'Nueva Subtarea' 
                : 'Nueva ' + noteTypes.find(t => t.value === formData.type)?.label}
          </h1>
          <p className="text-gray-400 mt-1">
            {isEditing 
              ? 'Modifica los detalles' 
              : isCreatingSubtask && parentNoteFromUrl
                ? `Subtarea de: ${parentNoteFromUrl.title}`
                : 'Crea un nuevo registro'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-sm text-gray-400 mb-3">Tipo de nota</label>
          <div className="flex gap-3">
            {noteTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, type: type.value as Note['type'] })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                  formData.type === type.value
                    ? `${type.color} border-transparent text-white`
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <type.icon size={18} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Título</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Título de la nota..."
            className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-lg"
            required
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Contenido</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Describe los detalles..."
            rows={8}
            className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            required
          />
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Note['status'] })}
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {noteStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Prioridad</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Note['priority'] })}
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {notePriorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project & Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Proyecto (opcional)</label>
            <input
              type="text"
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              placeholder="Nombre del proyecto..."
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <UserPlus size={16} />
              Asignar a
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Sin asignar</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} {member.id === user?.id ? '(Yo)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date & Estimated Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Fecha de vencimiento
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Clock size={16} />
              Horas estimadas
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              placeholder="Ej: 4.5"
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Parent Task (para subtareas) */}
        {!isEditing && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tarea padre (opcional - para crear subtarea)</label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full bg-[#181825] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Ninguna (tarea principal)</option>
              {notes
                .filter(n => !n.parent_id) // Solo tareas principales
                .map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Breadcrumb si es subtarea */}
        {parentNote && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-[#181825] p-3 rounded-lg">
            <span>Subtarea de:</span>
            <Link
              to={`/notes/${parentNote.id}`}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              {parentNote.title}
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Etiquetas</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm"
              >
                <Tag size={14} />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Agregar etiqueta..."
              className="flex-1 bg-[#181825] border border-gray-700 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-[#181825] border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="px-6 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                {isEditing ? 'Guardar Cambios' : 'Crear Nota'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Status Change - Solo en modo edición */}
      {isEditing && (
        <div className="mt-8 p-6 bg-[#181825] rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare size={20} />
            Cambio Rápido de Estado
          </h3>
          <div className="flex flex-wrap gap-3">
            {statusConfig.map((status) => {
              const Icon = status.icon;
              const isActive = formData.status === status.value;
              return (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value as Note['status'])}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    isActive
                      ? `${status.color} border-transparent text-white`
                      : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <Icon size={18} />
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments Section - Solo en modo edición */}
      {isEditing && (
        <div className="mt-8 p-6 bg-[#181825] rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={20} />
            Comentarios ({comments.length})
          </h3>

          {/* Add Comment */}
          <div className="flex gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                rows={3}
                className="w-full bg-[#11111b] border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Send size={16} />
                  Comentar
                </button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay comentarios aún. ¡Sé el primero en comentar!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-[#11111b] rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {comment.user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-white">
                          {comment.user?.full_name || 'Usuario'}
                        </span>
                        <span className="text-gray-500 text-sm ml-2">
                          {format(new Date(comment.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                      </div>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar comentario"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300 mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subtasks Section - Solo en modo edición */}
      {isEditing && (
        <div className="mt-8 p-6 bg-[#181825] rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckSquare size={20} />
              Subtareas ({subtasks.length})
            </h3>
            <button
              onClick={() => navigate(`/notes/new?parent=${id}`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={16} />
              Nueva Subtarea
            </button>
          </div>

          {subtasks.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No hay subtareas. Crea una para dividir el trabajo.
            </p>
          ) : (
            <div className="space-y-2">
              {subtasks.map((subtask) => {
                const statusInfo = statusConfig.find(s => s.value === subtask.status);
                const StatusIcon = statusInfo?.icon || Clock;
                return (
                  <div
                    key={subtask.id}
                    onClick={() => navigate(`/notes/${subtask.id}`)}
                    className="flex items-center gap-3 p-3 bg-[#11111b] rounded-lg hover:bg-[#1e1e2e] cursor-pointer transition-colors"
                  >
                    <StatusIcon size={18} className={statusInfo?.textColor || 'text-gray-400'} />
                    <span className="flex-1 text-white">{subtask.title}</span>
                    <span className={`text-xs px-2 py-1 rounded ${statusInfo?.color} text-white`}>
                      {statusInfo?.label}
                    </span>
                    <ChevronRight size={16} className="text-gray-500" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
