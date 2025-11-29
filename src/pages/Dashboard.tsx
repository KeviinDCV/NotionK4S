import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CheckSquare, 
  Bug, 
  Sparkles,
  TrendingUp,
  Clock,
  Video,
  Calendar,
  Target,
  Sun,
  Moon,
  Sunrise,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { useAuthStore } from '../store/authStore';
import { useMeetingsStore } from '../store/meetingsStore';
import { useSprintStore } from '../store/sprintStore';
import { format, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Obtener saludo según la hora
function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Buenos días', icon: Sunrise };
  if (hour >= 12 && hour < 19) return { text: 'Buenas tardes', icon: Sun };
  return { text: 'Buenas noches', icon: Moon };
}

export function Dashboard() {
  const navigate = useNavigate();
  const { notes, fetchNotes, isLoading } = useNotesStore();
  const { user } = useAuthStore();
  const { meetings, fetchMeetings } = useMeetingsStore();
  const { currentSprint, fetchSprints } = useSprintStore();

  useEffect(() => {
    fetchNotes();
    fetchMeetings();
    fetchSprints();
  }, [fetchNotes, fetchMeetings, fetchSprints]);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Tareas que vencen hoy (excluir subtareas)
  const todayTasks = notes.filter(n => {
    if (n.parent_id) return false; // Excluir subtareas
    if (n.type !== 'task' || n.status === 'completed') return false;
    if (!n.due_date) return false;
    return isToday(parseISO(n.due_date));
  });

  // Tareas que vencen mañana (excluir subtareas)
  const tomorrowTasks = notes.filter(n => {
    if (n.parent_id) return false; // Excluir subtareas
    if (n.type !== 'task' || n.status === 'completed') return false;
    if (!n.due_date) return false;
    return isTomorrow(parseISO(n.due_date));
  });

  // Reuniones de hoy
  const todayMeetings = meetings.filter(m => {
    if (m.status === 'completed' || m.status === 'cancelled') return false;
    return isToday(parseISO(m.scheduled_at));
  }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Estadísticas del sprint actual (excluir subtareas)
  const sprintStats = currentSprint ? {
    totalTasks: notes.filter(n => !n.parent_id && n.sprint_id === currentSprint.id).length,
    completedTasks: notes.filter(n => !n.parent_id && n.sprint_id === currentSprint.id && n.status === 'completed').length,
    daysRemaining: differenceInDays(parseISO(currentSprint.end_date), new Date()),
  } : null;

  const sprintProgress = sprintStats && sprintStats.totalTasks > 0 
    ? Math.round((sprintStats.completedTasks / sprintStats.totalTasks) * 100)
    : 0;

  // Stats generales (excluir subtareas)
  const stats = {
    pendingTasks: notes.filter(n => !n.parent_id && n.type === 'task' && n.status !== 'completed').length,
    openBugs: notes.filter(n => !n.parent_id && n.type === 'bug' && n.status !== 'completed').length,
    completedToday: notes.filter(n => !n.parent_id && n.status === 'completed' && isToday(parseISO(n.updated_at))).length,
    upcomingMeetings: meetings.filter(m => m.status === 'scheduled').length,
  };

  // Actividad reciente (últimos 5 elementos modificados, excluir subtareas)
  const recentActivity = [...notes]
    .filter(n => !n.parent_id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header con saludo dinámico */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <GreetingIcon size={28} className="text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">
            {greeting.text}, {user?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
        </div>
        <p className="text-gray-400">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })} • 
          <span className="ml-2 text-blue-400">Ctrl+K para buscar</span>
        </p>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tareas de hoy */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Calendar size={18} className="text-yellow-400" />
              Tareas para hoy
            </h2>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
              {todayTasks.length} pendientes
            </span>
          </div>
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.slice(0, 3).map(task => (
                <div 
                  key={task.id} 
                  onClick={() => navigate(`/notes/${task.id}`)}
                  className="flex items-center gap-3 p-3 bg-[#181825]/50 rounded-lg hover:bg-[#181825] transition-colors cursor-pointer"
                >
                  <CheckSquare size={16} className="text-yellow-400" />
                  <span className="text-white truncate flex-1">{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
              {todayTasks.length > 3 && (
                <button 
                  onClick={() => navigate('/calendar')}
                  className="text-yellow-400 text-sm flex items-center gap-1 hover:underline"
                >
                  Ver {todayTasks.length - 3} más <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              🎉 No tienes tareas pendientes para hoy
            </p>
          )}
        </div>

        {/* Reuniones de hoy */}
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-500/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Video size={18} className="text-teal-400" />
              Reuniones de hoy
            </h2>
            <span className="px-2 py-1 bg-teal-500/20 text-teal-400 rounded-full text-xs font-medium">
              {todayMeetings.length} programadas
            </span>
          </div>
          {todayMeetings.length > 0 ? (
            <div className="space-y-2">
              {todayMeetings.slice(0, 3).map(meeting => (
                <div 
                  key={meeting.id}
                  onClick={() => navigate('/meetings')}
                  className="flex items-center gap-3 p-3 bg-[#181825]/50 rounded-lg hover:bg-[#181825] transition-colors cursor-pointer"
                >
                  <div className="text-teal-400 font-mono text-sm min-w-[50px]">
                    {format(parseISO(meeting.scheduled_at), 'HH:mm')}
                  </div>
                  <span className="text-white truncate flex-1">{meeting.title}</span>
                  {meeting.status === 'in_progress' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 animate-pulse">
                      En curso
                    </span>
                  )}
                </div>
              ))}
              {todayMeetings.length > 3 && (
                <button 
                  onClick={() => navigate('/meetings')}
                  className="text-teal-400 text-sm flex items-center gap-1 hover:underline"
                >
                  Ver todas <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              📅 No tienes reuniones programadas para hoy
            </p>
          )}
        </div>
      </div>

      {/* Sprint actual */}
      {currentSprint && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Target size={18} className="text-purple-400" />
                {currentSprint.name}
              </h2>
              {currentSprint.goal && (
                <p className="text-gray-400 text-sm mt-1">{currentSprint.goal}</p>
              )}
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                sprintStats && sprintStats.daysRemaining <= 3 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {sprintStats && sprintStats.daysRemaining > 0 
                  ? `${sprintStats.daysRemaining} días restantes` 
                  : 'Sprint finalizado'}
              </span>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Progreso del Sprint</span>
              <span className="text-white font-medium">{sprintProgress}%</span>
            </div>
            <div className="h-3 bg-[#11111b] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${sprintProgress}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm mt-3">
            <span className="text-gray-400">
              {sprintStats?.completedTasks || 0} de {sprintStats?.totalTasks || 0} tareas completadas
            </span>
            <span className="text-gray-500">
              {format(parseISO(currentSprint.start_date), 'd MMM', { locale: es })} - {format(parseISO(currentSprint.end_date), 'd MMM', { locale: es })}
            </span>
          </div>
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#181825] rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <CheckSquare size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
              <p className="text-gray-500 text-xs">Tareas pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-[#181825] rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Bug size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.openBugs}</p>
              <p className="text-gray-500 text-xs">Bugs abiertos</p>
            </div>
          </div>
        </div>
        <div className="bg-[#181825] rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.completedToday}</p>
              <p className="text-gray-500 text-xs">Completadas hoy</p>
            </div>
          </div>
        </div>
        <div className="bg-[#181825] rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Video size={20} className="text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.upcomingMeetings}</p>
              <p className="text-gray-500 text-xs">Reuniones próximas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-[#181825] rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock size={18} />
              Actividad Reciente
            </h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#1e1e2e] transition-colors cursor-pointer"
                  >
                    <div className={`p-2 rounded-lg ${
                      note.type === 'task' ? 'bg-yellow-500/20 text-yellow-400' :
                      note.type === 'bug' ? 'bg-red-500/20 text-red-400' :
                      note.type === 'feature' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {note.type === 'task' ? <CheckSquare size={18} /> :
                       note.type === 'bug' ? <Bug size={18} /> :
                       note.type === 'feature' ? <Sparkles size={18} /> :
                       <FileText size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{note.title}</p>
                      <p className="text-gray-500 text-sm">
                        Actualizado {format(parseISO(note.updated_at), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      note.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      note.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      note.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {note.status === 'completed' ? 'Completado' :
                       note.status === 'in_progress' ? 'En progreso' :
                       note.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>No hay actividad reciente</p>
                <p className="text-sm mt-1">Crea tu primera nota para empezar</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Tareas para mañana */}
          {tomorrowTasks.length > 0 && (
            <div className="bg-[#181825] rounded-xl border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <AlertCircle size={18} className="text-orange-400" />
                  Mañana tienes
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {tomorrowTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id}
                    onClick={() => navigate(`/notes/${task.id}`)}
                    className="flex items-center gap-2 p-2 rounded hover:bg-[#1e1e2e] cursor-pointer"
                  >
                    <CheckSquare size={14} className="text-orange-400" />
                    <span className="text-gray-300 text-sm truncate">{task.title}</span>
                  </div>
                ))}
                {tomorrowTasks.length > 3 && (
                  <p className="text-gray-500 text-xs text-center">
                    +{tomorrowTasks.length - 3} tareas más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="bg-[#181825] rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold text-white">Accesos Rápidos</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Nueva Tarea', path: '/notes/new?type=task', icon: CheckSquare, color: 'text-yellow-400' },
                { label: 'Reportar Bug', path: '/notes/new?type=bug', icon: Bug, color: 'text-red-400' },
                { label: 'Mis Notepads', path: '/notepad', icon: FileText, color: 'text-indigo-400' },
                { label: 'Calendario', path: '/calendar', icon: Calendar, color: 'text-blue-400' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#1e1e2e] transition-colors text-left"
                >
                  <item.icon size={18} className={item.color} />
                  <span className="text-gray-300">{item.label}</span>
                  <ArrowRight size={14} className="text-gray-600 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
