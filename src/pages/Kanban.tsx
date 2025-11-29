import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Filter,
  CheckSquare,
  Bug,
  Sparkles,
  FileText,
  Clock,
  AlertCircle,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { useSprintStore } from '../store/sprintStore';
import { useTeamStore } from '../store/teamStore';
import { Note } from '../lib/supabase';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

type KanbanColumn = 'backlog' | 'pending' | 'in_progress' | 'completed';

interface Column {
  id: KanbanColumn;
  title: string;
  color: string;
  bgColor: string;
  statuses: Note['status'][];
}

const columns: Column[] = [
  { 
    id: 'pending', 
    title: 'Pendiente', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    statuses: ['pending']
  },
  { 
    id: 'in_progress', 
    title: 'En Progreso', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    statuses: ['in_progress']
  },
  { 
    id: 'completed', 
    title: 'Completado', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/10 border-green-500/30',
    statuses: ['completed']
  },
];

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-500',
};

const typeIcons: Record<string, React.ReactNode> = {
  task: <CheckSquare size={14} />,
  bug: <Bug size={14} />,
  feature: <Sparkles size={14} />,
  note: <FileText size={14} />,
};

const typeColors: Record<string, string> = {
  task: 'text-yellow-400 bg-yellow-500/20',
  bug: 'text-red-400 bg-red-500/20',
  feature: 'text-purple-400 bg-purple-500/20',
  note: 'text-blue-400 bg-blue-500/20',
};

export function Kanban() {
  const navigate = useNavigate();
  const { notes, fetchNotes, updateNote, deleteNote } = useNotesStore();
  const { sprints, currentSprint, fetchSprints } = useSprintStore();
  const { members, fetchMembers } = useTeamStore();
  
  const [selectedSprint, setSelectedSprint] = useState<string | 'all' | 'backlog'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchSprints();
    fetchMembers();
  }, [fetchNotes, fetchSprints, fetchMembers]);

  // Filtrar notas (excluir subtareas y canceladas)
  const filteredNotes = notes.filter(note => {
    if (note.parent_id) return false; // Excluir subtareas
    if (note.status === 'cancelled') return false;
    
    // Filtro por sprint
    if (selectedSprint === 'backlog') {
      if (note.sprint_id) return false;
    } else if (selectedSprint !== 'all') {
      if (note.sprint_id !== selectedSprint) return false;
    }
    
    // Filtro por tipo
    if (typeFilter && note.type !== typeFilter) return false;
    
    return true;
  });

  // Agrupar notas por columna
  const getNotesForColumn = (column: Column) => {
    return filteredNotes.filter(note => column.statuses.includes(note.status));
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, note: Note) => {
    setDraggedNote(note);
    e.dataTransfer.effectAllowed = 'move';
    
    // Crear una imagen de arrastre personalizada
    const target = e.currentTarget as HTMLElement;
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '-1000px';
    clone.style.width = `${target.offsetWidth}px`;
    clone.style.opacity = '0.9';
    clone.style.transform = 'rotate(3deg)';
    clone.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, target.offsetWidth / 2, 20);
    
    // Limpiar el clone después
    setTimeout(() => {
      document.body.removeChild(clone);
      target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedNote(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: KanbanColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, column: Column) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedNote) return;
    
    // Si el estado ya es el mismo, no hacer nada
    if (column.statuses.includes(draggedNote.status)) return;
    
    // Actualizar el estado de la nota
    const newStatus = column.statuses[0];
    await updateNote(draggedNote.id, { status: newStatus });
    setDraggedNote(null);
  };

  const getAssignedUser = (userId?: string | null) => {
    if (!userId) return null;
    return members.find(m => m.id === userId);
  };

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    return isPast(parseISO(dueDate)) && !isToday(parseISO(dueDate));
  };

  return (
    <div className="h-full flex flex-col bg-[#11111b]">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Tablero Kanban</h1>
            <p className="text-gray-400 mt-1">Arrastra las tareas para cambiar su estado</p>
          </div>
          <button
            onClick={() => navigate('/notes/new?type=task')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Nueva Tarea
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          {/* Filtro de Sprint */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
              className="bg-[#181825] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los Sprints</option>
              <option value="backlog">📋 Backlog (sin sprint)</option>
              {sprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.status === 'active' ? '🟢 ' : ''}{sprint.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Tipo */}
          <div className="flex gap-1">
            {[
              { value: null, label: 'Todos', icon: null },
              { value: 'task', label: 'Tareas', icon: <CheckSquare size={14} /> },
              { value: 'bug', label: 'Bugs', icon: <Bug size={14} /> },
              { value: 'feature', label: 'Features', icon: <Sparkles size={14} /> },
            ].map(filter => (
              <button
                key={filter.value || 'all'}
                onClick={() => setTypeFilter(filter.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  typeFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#181825] text-gray-400 hover:text-white hover:bg-[#1e1e2e]'
                }`}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>

          {/* Sprint actual badge */}
          {currentSprint && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">
                Sprint activo: {currentSprint.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(column => {
            const columnNotes = getNotesForColumn(column);
            const isDropTarget = dragOverColumn === column.id;
            
            return (
              <div
                key={column.id}
                className={`w-80 flex flex-col rounded-xl border ${column.bgColor} ${
                  isDropTarget ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column)}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <h2 className={`font-semibold ${column.color}`}>
                      {column.title}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${column.color} bg-black/20`}>
                      {columnNotes.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <CheckSquare size={32} className="opacity-30 mb-2" />
                      <p className="text-sm">Sin tareas</p>
                    </div>
                  ) : (
                    columnNotes.map(note => {
                      const assignedUser = getAssignedUser(note.assigned_to);
                      const overdue = isOverdue(note.due_date);
                      
                      return (
                        <div
                          key={note.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, note)}
                          onDragEnd={handleDragEnd}
                          className="bg-[#181825] rounded-lg border border-gray-700 p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all group"
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${typeColors[note.type]}`}>
                              {typeIcons[note.type]}
                              <span className="capitalize">{note.type}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {/* Priority indicator */}
                              <div 
                                className={`w-2 h-2 rounded-full ${priorityColors[note.priority]}`}
                                title={`Prioridad: ${note.priority}`}
                              />
                              
                              {/* Menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenu(activeMenu === note.id ? null : note.id);
                                  }}
                                  className="p-1 rounded hover:bg-[#1e1e2e] text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                
                                {activeMenu === note.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10"
                                      onClick={() => setActiveMenu(null)}
                                    />
                                    <div className="absolute right-0 top-6 bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                                      <button
                                        onClick={() => {
                                          navigate(`/notes/${note.id}`);
                                          setActiveMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-[#181825]"
                                      >
                                        <ExternalLink size={14} />
                                        Abrir
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigate(`/notes/${note.id}`);
                                          setActiveMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-[#181825]"
                                      >
                                        <Edit size={14} />
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => {
                                          deleteNote(note.id);
                                          setActiveMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-[#181825]"
                                      >
                                        <Trash2 size={14} />
                                        Eliminar
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 
                            className="text-white font-medium text-sm mb-2 cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => navigate(`/notes/${note.id}`)}
                          >
                            {note.title}
                          </h3>

                          {/* Meta info */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-3">
                              {/* Due date */}
                              {note.due_date && (
                                <div className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                                  <Calendar size={12} />
                                  <span>{format(parseISO(note.due_date), 'd MMM', { locale: es })}</span>
                                  {overdue && <AlertCircle size={12} />}
                                </div>
                              )}
                              
                              {/* Estimated hours */}
                              {note.estimated_hours && (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  <span>{note.estimated_hours}h</span>
                                </div>
                              )}
                            </div>

                            {/* Assigned user */}
                            {assignedUser ? (
                              <div 
                                className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium"
                                title={assignedUser.full_name}
                              >
                                {assignedUser.full_name?.charAt(0).toUpperCase()}
                              </div>
                            ) : (
                              <div 
                                className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-500"
                                title="Sin asignar"
                              >
                                <User size={12} />
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {note.tags.slice(0, 3).map(tag => (
                                <span 
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-gray-700 text-gray-400 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 text-gray-500 text-xs">
                                  +{note.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Drag handle indicator */}
                          <div className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity">
                            <GripVertical size={14} className="text-gray-500" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add task button */}
                <div className="p-3 border-t border-gray-700/50">
                  <button
                    onClick={() => navigate('/notes/new?type=task')}
                    className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-white hover:bg-[#181825] rounded-lg transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Agregar tarea
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
