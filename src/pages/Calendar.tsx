import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckSquare,
  Bug,
  Sparkles,
  FileText,
  Plus,
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { Note } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const typeIcons: Record<string, any> = {
  task: CheckSquare,
  bug: Bug,
  feature: Sparkles,
  note: FileText,
};

const typeColors: Record<string, string> = {
  task: 'bg-yellow-500',
  bug: 'bg-red-500',
  feature: 'bg-purple-500',
  note: 'bg-blue-500',
};

const statusColors: Record<string, string> = {
  pending: 'border-l-yellow-500',
  in_progress: 'border-l-blue-500',
  completed: 'border-l-green-500',
  cancelled: 'border-l-gray-500',
};

export function Calendar() {
  const navigate = useNavigate();
  const { notes, fetchNotes } = useNotesStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Agregar días del mes anterior para completar la primera semana
  const startDay = monthStart.getDay();
  const prefixDays = Array.from({ length: startDay }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (startDay - i));
    return date;
  });

  // Agregar días del mes siguiente para completar la última semana
  const endDay = monthEnd.getDay();
  const suffixDays = Array.from({ length: 6 - endDay }, (_, i) => {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  const allDays = [...prefixDays, ...daysInMonth, ...suffixDays];

  // Agrupar notas por fecha
  const notesByDate = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    notes.forEach((note) => {
      if (note.due_date) {
        const dateKey = note.due_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(note);
      }
    });
    return grouped;
  }, [notes]);

  const getNotesForDate = (date: Date): Note[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return notesByDate[dateKey] || [];
  };

  const selectedDateNotes = selectedDate ? getNotesForDate(selectedDate) : [];

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="flex h-full">
      {/* Calendario */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <CalendarIcon size={28} />
              Calendario
            </h1>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-[#1e1e2e] rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-[#1e1e2e] rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={() => {
              const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
              navigate(`/notes/new?date=${dateParam}&type=task`);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nueva Tarea
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const dayNotes = getNotesForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => navigate(`/notes/new?date=${format(day, 'yyyy-MM-dd')}&type=task`)}
                className={`
                  min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all
                  ${isCurrentMonth ? 'bg-[#181825]' : 'bg-[#11111b]'}
                  ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-600'}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${!isCurrentMonth && 'text-gray-600'}
                  ${isCurrentMonth && !isTodayDate && 'text-gray-300'}
                  ${isTodayDate && 'text-blue-400'}
                `}>
                  <span className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full
                    ${isTodayDate && 'bg-blue-600 text-white'}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {dayNotes.slice(0, 3).map((note) => {
                    const Icon = typeIcons[note.type] || FileText;
                    return (
                      <div
                        key={note.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/notes/${note.id}`);
                        }}
                        className={`
                          flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate
                          ${typeColors[note.type]} bg-opacity-20 text-white
                          hover:bg-opacity-30 transition-colors
                        `}
                      >
                        <Icon size={10} />
                        <span className="truncate">{note.title}</span>
                      </div>
                    );
                  })}
                  {dayNotes.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayNotes.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar - Detalle del día seleccionado */}
      <div className="w-80 bg-[#181825] border-l border-gray-700 p-4 overflow-auto">
        <h3 className="text-lg font-semibold text-white mb-4">
          {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona un día'}
        </h3>

        {selectedDate && (
          <>
            {selectedDateNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay tareas para este día</p>
                <button
                  onClick={() => navigate(`/notes/new?date=${format(selectedDate!, 'yyyy-MM-dd')}&type=task`)}
                  className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Crear tarea
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateNotes.map((note) => {
                  const Icon = typeIcons[note.type] || FileText;
                  return (
                    <div
                      key={note.id}
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className={`
                        p-3 bg-[#11111b] rounded-lg border-l-4 cursor-pointer
                        hover:bg-[#1e1e2e] transition-colors
                        ${statusColors[note.status]}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${typeColors[note.type]} bg-opacity-20`}>
                          <Icon size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{note.title}</h4>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{note.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`
                              px-2 py-0.5 rounded text-xs
                              ${note.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                note.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                note.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'}
                            `}>
                              {note.status === 'completed' ? 'Completado' :
                               note.status === 'in_progress' ? 'En progreso' :
                               note.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                            </span>
                            {note.estimated_hours && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={12} />
                                {note.estimated_hours}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
