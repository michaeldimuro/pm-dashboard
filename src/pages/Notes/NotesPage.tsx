import React, { useState, useEffect } from 'react';
import { Plus, Search, Grid, List, Edit2, Trash2, Link as LinkIcon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { Note, NoteLink, Business } from '@/types';

const NOTE_COLORS = [
  { bg: '#1a1a3a', text: '#e2e8f0' }, // Default dark
  { bg: '#1e3a3a', text: '#5eead4' }, // Teal
  { bg: '#3a1a3a', text: '#f0abfc' }, // Purple
  { bg: '#3a2a1a', text: '#fcd34d' }, // Amber
  { bg: '#1a2a3a', text: '#7dd3fc' }, // Blue
  { bg: '#3a1a1a', text: '#fca5a5' }, // Red
];

export function NotesPage() {
  const { user } = useAuth();
  const { businesses, getBusinessName } = useBusiness();
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [linkingNote, setLinkingNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteBusiness, setNoteBusiness] = useState<Business>('capture_health');
  const [noteColorIdx, setNoteColorIdx] = useState(0);
  const [noteTags, setNoteTags] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchLinks();
    }
  }, [user]);

  const fetchNotes = async () => {
    setLoading(true);
    // Fetch ALL notes across all businesses
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user?.id)
      .order('updated_at', { ascending: false });

    if (error) console.error('Error fetching notes:', error);
    else setNotes(data || []);
    setLoading(false);
  };

  const fetchLinks = async () => {
    const { data, error } = await supabase.from('note_links').select('*');
    if (error) console.error('Error fetching links:', error);
    else setLinks(data || []);
  };

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const noteData = {
      user_id: user?.id,
      business: noteBusiness,
      title: noteTitle,
      content: noteContent,
      color: NOTE_COLORS[noteColorIdx].bg,
      tags: noteTags ? noteTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };

    if (editingNote) {
      const { error } = await supabase.from('notes').update(noteData).eq('id', editingNote.id);
      if (error) console.error('Error updating note:', error);
    } else {
      const { error } = await supabase.from('notes').insert(noteData);
      if (error) console.error('Error creating note:', error);
    }

    fetchNotes();
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) console.error('Error deleting note:', error);
    else fetchNotes();
  };

  const handleLinkNotes = async (targetNote: Note) => {
    if (!linkingNote || linkingNote.id === targetNote.id) return;
    const { error } = await supabase.from('note_links').insert({
      source_note_id: linkingNote.id,
      target_note_id: targetNote.id,
    });
    if (error) console.error('Error linking notes:', error);
    else fetchLinks();
    setLinkingNote(null);
  };

  const resetForm = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteBusiness('capture_health');
    setNoteColorIdx(0);
    setNoteTags('');
    setEditingNote(null);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteBusiness(note.business || 'capture_health');
    const colorIdx = NOTE_COLORS.findIndex(c => c.bg === note.color);
    setNoteColorIdx(colorIdx >= 0 ? colorIdx : 0);
    setNoteTags(note.tags?.join(', ') || '');
    setIsModalOpen(true);
  };

  const getLinkedNotes = (noteId: string) => {
    const linkedIds = links
      .filter((l) => l.source_note_id === noteId || l.target_note_id === noteId)
      .map((l) => (l.source_note_id === noteId ? l.target_note_id : l.source_note_id));
    return notes.filter((n) => linkedIds.includes(n.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          <p className="text-gray-400 mt-1">Create, link, and organize your notes</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg px-3 py-2">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent outline-none text-sm w-40 text-white placeholder-gray-500"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[#12122a] border border-[#2a2a4a] rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#1a1a3a] text-white' : 'text-gray-500'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#1a1a3a] text-white' : 'text-gray-500'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Note</span>
          </button>
        </div>
      </div>

      {/* Link mode indicator */}
      {linkingNote && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-blue-400">Select a note to link with "{linkingNote.title}"</span>
          <button onClick={() => setLinkingNote(null)} className="text-blue-400 hover:text-blue-300">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Notes */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <h3 className="text-lg font-medium text-white mb-2">No notes yet</h3>
          <p className="text-gray-400 mb-4">Create your first note to get started</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Create Note
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
          {filteredNotes.map((note) => {
            const linkedNotes = getLinkedNotes(note.id);
            const colorConfig = NOTE_COLORS.find(c => c.bg === note.color) || NOTE_COLORS[0];
            return (
              <div
                key={note.id}
                onClick={() => { if (linkingNote) handleLinkNotes(note); }}
                className={`rounded-xl p-4 border border-[#2a2a4a] hover:border-indigo-500/50 transition cursor-pointer card-glow ${
                  linkingNote && linkingNote.id !== note.id ? 'ring-2 ring-blue-500/50' : ''
                }`}
                style={{ backgroundColor: colorConfig.bg }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium line-clamp-1" style={{ color: colorConfig.text }}>{note.title}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLinkingNote(note); }}
                      className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                      title="Link to another note"
                    >
                      <LinkIcon size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(note); }}
                      className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                      className="p-1 hover:bg-white/10 rounded text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-400 line-clamp-4 mb-3">{note.content}</p>

                {/* Business badge */}
                {note.business && (
                  <div className="mb-2">
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-gray-300">
                      {getBusinessName(note.business)}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Linked notes */}
                {linkedNotes.length > 0 && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <LinkIcon size={12} />
                    {linkedNotes.length} linked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingNote ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Note title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Write your note..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business</label>
                <select
                  value={noteBusiness}
                  onChange={(e) => setNoteBusiness(e.target.value as Business)}
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((color, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNoteColorIdx(idx)}
                      className={`w-8 h-8 rounded-lg border-2 ${noteColorIdx === idx ? 'border-indigo-500' : 'border-transparent'}`}
                      style={{ backgroundColor: color.bg }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                <input
                  type="text"
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="idea, meeting, important (comma separated)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-gray-400 hover:bg-[#1a1a3a] rounded-lg transition"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition">
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
