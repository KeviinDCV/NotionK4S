import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  FileText, 
  CheckSquare, 
  Bug, 
  Sparkles, 
  StickyNote, 
  Video, 
  User,
  Command,
  ArrowRight,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { useNotesStore } from '../store/notesStore';
import { usePersonalNotesStore } from '../store/personalNotesStore';
import { useMeetingsStore } from '../store/meetingsStore';
import { useTeamStore } from '../store/teamStore';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'note' | 'task' | 'bug' | 'feature' | 'notepad' | 'meeting' | 'user';
  path: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { notes } = useNotesStore();
  const { notes: personalNotes } = usePersonalNotesStore();
  const { meetings } = useMeetingsStore();
  const { members } = useTeamStore();

  // Abrir/cerrar con Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Búsqueda
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const q = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Buscar en notas
    notes.forEach(note => {
      if (note.title.toLowerCase().includes(q) || note.content?.toLowerCase().includes(q)) {
        searchResults.push({
          id: note.id,
          title: note.title,
          subtitle: note.type === 'task' ? 'Tarea' : note.type === 'bug' ? 'Bug' : note.type === 'feature' ? 'Feature' : 'Nota',
          type: note.type as any,
          path: `/notes/${note.id}`,
        });
      }
    });

    // Buscar en notepads personales
    personalNotes.forEach(note => {
      if (note.title.toLowerCase().includes(q) || note.content?.toLowerCase().includes(q)) {
        searchResults.push({
          id: note.id,
          title: note.title,
          subtitle: 'Notepad Personal',
          type: 'notepad',
          path: '/notepad',
        });
      }
    });

    // Buscar en reuniones
    meetings.forEach(meeting => {
      if (meeting.title.toLowerCase().includes(q) || meeting.description?.toLowerCase().includes(q)) {
        searchResults.push({
          id: meeting.id,
          title: meeting.title,
          subtitle: `Reunión - ${meeting.status === 'scheduled' ? 'Programada' : meeting.status === 'in_progress' ? 'En curso' : 'Finalizada'}`,
          type: 'meeting',
          path: '/meetings',
        });
      }
    });

    // Buscar en miembros del equipo
    members.forEach(member => {
      if (member.full_name?.toLowerCase().includes(q) || member.email?.toLowerCase().includes(q)) {
        searchResults.push({
          id: member.id,
          title: member.full_name || member.email,
          subtitle: member.email,
          type: 'user',
          path: '/team',
        });
      }
    });

    setResults(searchResults.slice(0, 10)); // Limitar a 10 resultados
    setSelectedIndex(0);
    setIsSearching(false);
  }, [notes, personalNotes, meetings, members]);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].path);
      setIsOpen(false);
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return <CheckSquare size={18} className="text-yellow-400" />;
      case 'bug': return <Bug size={18} className="text-red-400" />;
      case 'feature': return <Sparkles size={18} className="text-purple-400" />;
      case 'notepad': return <StickyNote size={18} className="text-indigo-400" />;
      case 'meeting': return <Video size={18} className="text-teal-400" />;
      case 'user': return <User size={18} className="text-green-400" />;
      default: return <FileText size={18} className="text-blue-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#181825] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar notas, tareas, reuniones, personas..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
          />
          {isSearching && <Loader2 size={20} className="text-gray-400 animate-spin" />}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#11111b] rounded text-xs text-gray-500 border border-gray-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 && !isSearching ? (
            <div className="p-8 text-center text-gray-500">
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p>No se encontraron resultados para "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    navigate(result.path);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex ? 'bg-blue-500/20' : 'hover:bg-[#1e1e2e]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[#11111b]">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-gray-500 text-sm truncate">{result.subtitle}</p>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <ArrowRight size={16} className="text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          ) : !query ? (
            <div className="p-6">
              <p className="text-gray-500 text-sm mb-4">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Notas', path: '/notes', icon: FileText },
                  { label: 'Tareas', path: '/notes?type=task', icon: CheckSquare },
                  { label: 'Reuniones', path: '/meetings', icon: Video },
                  { label: 'Chat', path: '/chat', icon: MessageSquare },
                  { label: 'Notepad', path: '/notepad', icon: StickyNote },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#11111b] hover:bg-[#1e1e2e] transition-colors text-left"
                  >
                    <item.icon size={18} className="text-gray-400" />
                    <span className="text-gray-300">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#11111b] rounded border border-gray-700">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#11111b] rounded border border-gray-700">↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#11111b] rounded border border-gray-700">↵</kbd>
              abrir
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={12} />
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-[#11111b] rounded border border-gray-700">K</kbd>
            abrir búsqueda
          </span>
        </div>
      </div>
    </div>
  );
}
