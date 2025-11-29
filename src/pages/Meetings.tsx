import { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  X,
  Trash2,
  UserPlus,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { useMeetingsStore } from '../store/meetingsStore';
import { useTeamStore } from '../store/teamStore';
import { useAuthStore } from '../store/authStore';
import { ConfirmModal } from '../components/ConfirmModal';
import { Meeting } from '../lib/supabase';
import { format, isPast, isToday, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

// Configuración de JaaS (Jitsi as a Service)
const JAAS_APP_ID = 'vpaas-magic-cookie-1ce7135e1c534d72904f14bcef702bc4';

export function Meetings() {
  const { user } = useAuthStore();
  const { meetings, isLoading, fetchMeetings, createMeeting, deleteMeeting, updateMeetingStatus } = useMeetingsStore();
  const { members, fetchMembers } = useTeamStore();

  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState<Meeting | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; meetingId: string | null }>({ isOpen: false, meetingId: null });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
  });

  useEffect(() => {
    fetchMeetings();
    fetchMembers();
  }, [fetchMeetings, fetchMembers]);

  // Separar reuniones por estado (sin redundancia)
  const todayMeetings = meetings.filter(m => 
    isToday(new Date(m.scheduled_at)) && m.status !== 'completed'
  );
  const upcomingMeetings = meetings.filter(m => 
    m.status === 'scheduled' && 
    !isPast(new Date(m.scheduled_at)) && 
    !isToday(new Date(m.scheduled_at)) // Excluir las de hoy para evitar duplicados
  );
  const pastMeetings = meetings.filter(m => 
    m.status === 'completed' || (m.status === 'scheduled' && isPast(addMinutes(new Date(m.scheduled_at), m.duration_minutes)))
  );

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.scheduled_at) return;

    await createMeeting({
      ...newMeeting,
      created_by: user?.id,
    }, selectedParticipants);

    setShowNewMeeting(false);
    setNewMeeting({ title: '', description: '', scheduled_at: '', duration_minutes: 60 });
    setSelectedParticipants([]);
    fetchMeetings();
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    setShowVideoCall(meeting);
    updateMeetingStatus(meeting.id, 'in_progress');
  };

  const handleLeaveMeeting = () => {
    if (showVideoCall) {
      updateMeetingStatus(showVideoCall.id, 'completed');
    }
    setShowVideoCall(null);
  };

  const handleDeleteMeeting = async () => {
    if (deleteModal.meetingId) {
      await deleteMeeting(deleteModal.meetingId);
      fetchMeetings();
    }
    setDeleteModal({ isOpen: false, meetingId: null });
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (meeting: Meeting) => {
    const scheduledTime = new Date(meeting.scheduled_at);
    const endTime = addMinutes(scheduledTime, meeting.duration_minutes);

    if (meeting.status === 'in_progress') {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">En curso</span>;
    }
    if (meeting.status === 'completed') {
      return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Finalizada</span>;
    }
    if (isPast(endTime)) {
      return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Expirada</span>;
    }
    if (isToday(scheduledTime)) {
      return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Hoy</span>;
    }
    return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Programada</span>;
  };

  // Si hay una videollamada activa, mostrar la sala
  if (showVideoCall) {
    return (
      <div className="h-full flex flex-col bg-[#11111b]">
        {/* Header de la llamada */}
        <div className="flex items-center justify-between p-4 bg-[#181825] border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">{showVideoCall.title}</span>
          </div>
          <button
            onClick={handleLeaveMeeting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <PhoneOff size={18} />
            Salir de la reunión
          </button>
        </div>

        {/* Iframe de Jitsi */}
        <div className="flex-1">
          <iframe
            src={`https://8x8.vc/${JAAS_APP_ID}/${showVideoCall.room_name}`}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Video size={28} />
            Reuniones
          </h1>
          <p className="text-gray-400 mt-1">Programa y gestiona videollamadas con tu equipo</p>
        </div>
        <button
          onClick={() => setShowNewMeeting(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nueva Reunión
        </button>
      </div>

      {/* Reuniones de hoy */}
      {todayMeetings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-400" />
            Hoy
          </h2>
          <div className="grid gap-4">
            {todayMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onJoin={() => handleJoinMeeting(meeting)}
                onDelete={() => setDeleteModal({ isOpen: true, meetingId: meeting.id })}
                statusBadge={getStatusBadge(meeting)}
                isCreator={meeting.created_by === user?.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Próximas reuniones */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={20} className="text-yellow-400" />
          Próximas Reuniones
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : upcomingMeetings.length === 0 ? (
          <div className="text-center py-12 bg-[#181825] rounded-xl border border-gray-700">
            <Video size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-500">No hay reuniones programadas</p>
            <button
              onClick={() => setShowNewMeeting(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Programar reunión
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {upcomingMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onJoin={() => handleJoinMeeting(meeting)}
                onDelete={() => setDeleteModal({ isOpen: true, meetingId: meeting.id })}
                statusBadge={getStatusBadge(meeting)}
                isCreator={meeting.created_by === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reuniones pasadas */}
      {pastMeetings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-gray-400">
            Reuniones anteriores
          </h2>
          <div className="grid gap-4 opacity-60">
            {pastMeetings.slice(0, 5).map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onJoin={() => {}}
                onDelete={() => setDeleteModal({ isOpen: true, meetingId: meeting.id })}
                statusBadge={getStatusBadge(meeting)}
                isCreator={meeting.created_by === user?.id}
                disabled
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal Nueva Reunión */}
      {showNewMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#181825] rounded-xl border border-gray-700 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Video size={20} />
                Nueva Reunión
              </h3>
              <button
                onClick={() => setShowNewMeeting(false)}
                className="p-1 hover:bg-[#1e1e2e] rounded-lg text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Título *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  placeholder="Ej: Daily Standup"
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Descripción</label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  placeholder="Detalles de la reunión..."
                  rows={2}
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Fecha y hora *</label>
                  <input
                    type="datetime-local"
                    value={newMeeting.scheduled_at}
                    onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_at: e.target.value })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duración (min)</label>
                  <select
                    value={newMeeting.duration_minutes}
                    onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) })}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1.5 horas</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <UserPlus size={16} />
                  Invitar participantes
                </label>
                <div className="flex flex-wrap gap-2">
                  {members.filter(m => m.id !== user?.id).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleParticipant(member.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedParticipants.includes(member.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#11111b] text-gray-400 hover:bg-[#1e1e2e] hover:text-white'
                      }`}
                    >
                      {member.full_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowNewMeeting(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={!newMeeting.title || !newMeeting.scheduled_at}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Crear Reunión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, meetingId: null })}
        onConfirm={handleDeleteMeeting}
        title="Eliminar reunión"
        message="¿Estás seguro de eliminar esta reunión? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

// Componente de tarjeta de reunión
function MeetingCard({ 
  meeting, 
  onJoin, 
  onDelete, 
  statusBadge, 
  isCreator,
  disabled = false 
}: { 
  meeting: Meeting; 
  onJoin: () => void; 
  onDelete: () => void;
  statusBadge: React.ReactNode;
  isCreator: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`bg-[#181825] rounded-xl border border-gray-700 p-4 ${disabled ? 'pointer-events-none' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-white font-medium">{meeting.title}</h3>
            {statusBadge}
          </div>
          {meeting.description && (
            <p className="text-gray-500 text-sm mb-3">{meeting.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {format(new Date(meeting.scheduled_at), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {format(new Date(meeting.scheduled_at), 'HH:mm', { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} />
              {meeting.duration_minutes} min
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!disabled && meeting.status !== 'completed' && (
            <button
              onClick={onJoin}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Phone size={16} />
              Unirse
            </button>
          )}
          {isCreator && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
