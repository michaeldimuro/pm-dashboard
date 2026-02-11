import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Grid, List, Edit2, Trash2, Link as LinkIcon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { Note, NoteLink } from '@/types';

const NOTE_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
];

export function NotesPage() {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
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
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [noteTags, setNoteTags] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchLinks();
    }
  }, [user, currentBusiness]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user?.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('note_links')
      .select('*');

    if (error) {
      console.error('Error fetching links:', error);
    } else {
      setLinks(data || []);
    }
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
      business: currentBusiness,
      title: noteTitle,
      content: noteContent,
      color: noteColor,
      tags: noteTags ? noteTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };

    if (editingNote) {
      const { error } = await supabase
        .from('notes')
        .update(noteData)
        .eq('id', editingNote.id);

      if (error) {
        console.error('Error updating note:', error);
      }
    } else {
      const { error } = await supabase.from('notes').insert(noteData);

      if (error) {
        console.error('Error creating note:', error);
      }
    }

    fetchNotes();
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    const { error } = await supabase.from('notes').delete().eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
    } else {
      fetchNotes();
    }
  };

  const handleLinkNotes = async (targetNote: Note) => {
    if (!linkingNote || linkingNote.id === targetNote.id) return;

    const { error } = await supabase.from('note_links').insert({
      source_note_id: linkingNote.id,
      target_note_id: targetNote.id,
    });

    if (error) {
      console.error('Error linking notes:', error);
    } else {
      fetchLinks();
    }
    setLinkingNote(null);
  };

  const resetForm = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteColor(NOTE_COLORS[0]);
    setNoteTags('');
    setEditingNote(null);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColor(note.color || NOTE_COLORS[0]);
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
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-gray-500 mt-1">Create, link, and organize your notes</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent outline-none text-sm w-40"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Note</span>
          </button>
        </div>
      </div>

      {/* Link mode indicator */}
      {linkingNote && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-blue-700">
            Select a note to link with "{linkingNote.title}"
          </span>
          <button
            onClick={() => setLinkingNote(null)}
            className="text-blue-600 hover:text-blue-800"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Notes */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
          <p className="text-gray-500 mb-4">Create your first note to get started</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Create Note
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          {filteredNotes.map((note) => {
            const linkedNotes = getLinkedNotes(note.id);
            return (
              <div
                key={note.id}
                onClick={() => {
                  if (linkingNote) {
                    handleLinkNotes(note);
                  }
                }}
                className={`rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer ${
                  linkingNote && linkingNote.id !== note.id ? 'ring-2 ring-blue-300' : ''
                }`}
                style={{ backgroundColor: note.color || NOTE_COLORS[0] }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 line-clamp-1">{note.title}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinkingNote(note);
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                      title="Link to another note"
                    >
                      <LinkIcon size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(note);
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="p-1 hover:bg-black/10 rounded text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 line-clamp-4 mb-3">{note.content}</p>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-black/10 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Linked notes */}
                {linkedNotes.length > 0 && (
                  <div className="text-xs text-gray-600 flex items-center gap-1">
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
            </div>
            <form onSubmit={handleCreateNote} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Note title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Write your note..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNoteColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        noteColor === color ? 'border-indigo-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="idea, meeting, important (comma separated)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
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
