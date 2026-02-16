import React, { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { CalendarEvent, Business } from '@/types';

export function CalendarPage() {
  const { user, authReady } = useAuth();
  const { businesses, getBusinessColor } = useBusiness();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventBusiness, setEventBusiness] = useState<Business>('capture_health');
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    // Wait for authReady to prevent AbortError from race conditions
    if (user && authReady) {
      fetchEvents();
    }
  }, [user, authReady, currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Fetch ALL events across all businesses
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user?.id)
      .gte('start_time', monthStart.toISOString())
      .lte('start_time', monthEnd.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-gray-400 mt-1">{format(currentDate, 'MMMM yyyy')}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 hover:bg-[#1a1a3a] rounded-lg transition text-gray-400 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-4 py-2 text-sm font-medium hover:bg-[#1a1a3a] rounded-lg transition text-gray-400 hover:text-white"
        >
          Today
        </button>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 hover:bg-[#1a1a3a] rounded-lg transition text-gray-400 hover:text-white"
        >
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Add Event</span>
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayEvents = events.filter((event) =>
          isSameDay(parseISO(event.start_time), currentDay)
        );

        days.push(
          <div
            key={day.toISOString()}
            onClick={() => {
              setSelectedDate(currentDay);
              setIsModalOpen(true);
            }}
            className={`min-h-24 p-2 border border-[#1a1a3a] cursor-pointer hover:bg-[#1a1a3a]/50 transition ${
              !isSameMonth(day, monthStart) ? 'bg-[#0a0a1a]/50 text-gray-600' : 'bg-[#12122a]'
            } ${isSameDay(day, new Date()) ? 'bg-indigo-600/10 border-indigo-500/50' : ''}`}
          >
            <span
              className={`text-sm font-medium ${
                isSameDay(day, new Date())
                  ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                  : 'text-gray-300'
              }`}
            >
              {format(day, 'd')}
            </span>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="text-xs px-2 py-1 rounded truncate"
                  style={{
                    backgroundColor: (event.color || getBusinessColor(event.business as Business)) + '30',
                    color: event.color || getBusinessColor(event.business as Business),
                  }}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 px-2">+{dayEvents.length - 3} more</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toISOString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return <div className="glass rounded-xl overflow-hidden">{rows}</div>;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('calendar_events').insert({
      user_id: user?.id,
      business: eventBusiness,
      title: eventTitle,
      description: eventDescription || null,
      start_time: eventStart,
      end_time: eventEnd || eventStart,
      all_day: allDay,
      location: eventLocation || null,
      color: getBusinessColor(eventBusiness),
    });

    if (error) {
      console.error('Error creating event:', error);
    } else {
      fetchEvents();
      setIsModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventStart('');
    setEventEnd('');
    setEventLocation('');
    setEventBusiness('capture_health');
    setAllDay(false);
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderDays()}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        renderCells()
      )}

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                New Event
                {selectedDate && (
                  <span className="text-gray-500 text-sm ml-2">{format(selectedDate, 'MMM d, yyyy')}</span>
                )}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business</label>
                <select
                  value={eventBusiness}
                  onChange={(e) => setEventBusiness(e.target.value as Business)}
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-[#2a2a4a] bg-[#1a1a3a] text-indigo-500"
                />
                <label htmlFor="allDay" className="text-sm text-gray-300">All day event</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start *</label>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End</label>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add location"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:bg-[#1a1a3a] rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
