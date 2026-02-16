import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Copy, Eye, EyeOff, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { WebhookSubscription, WebhookEventType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const EVENT_TYPES: { value: WebhookEventType; label: string; description: string }[] = [
  { value: 'task_created', label: 'Task Created', description: 'When a new task is created' },
  { value: 'task_updated', label: 'Task Updated', description: 'When a task is modified' },
  { value: 'task_deleted', label: 'Task Deleted', description: 'When a task is deleted' },
  { value: 'calendar_event', label: 'Calendar Event', description: 'When a calendar event is created/updated' },
  { value: 'lead_updated', label: 'Lead Updated', description: 'When a lead status changes' },
  { value: 'note_created', label: 'Note Created', description: 'When a new note is created' },
];

export function WebhooksPage() {
  const { user, authReady } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([]);

  useEffect(() => {
    // Wait for authReady to prevent AbortError from race conditions
    if (user && authReady) fetchWebhooks();
  }, [user, authReady]);

  const fetchWebhooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching webhooks:', error);
    else setWebhooks(data || []);
    setLoading(false);
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEvents.length === 0) {
      alert('Please select at least one event type');
      return;
    }

    const secret = uuidv4();
    const { error } = await supabase.from('webhook_subscriptions').insert({
      user_id: user?.id,
      url: webhookUrl,
      events: selectedEvents,
      secret: secret,
      active: true,
    });

    if (error) console.error('Error creating webhook:', error);
    else {
      fetchWebhooks();
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleToggleActive = async (webhook: WebhookSubscription) => {
    const { error } = await supabase
      .from('webhook_subscriptions')
      .update({ active: !webhook.active })
      .eq('id', webhook.id);

    if (error) console.error('Error toggling webhook:', error);
    else fetchWebhooks();
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Delete this webhook subscription?')) return;
    const { error } = await supabase.from('webhook_subscriptions').delete().eq('id', webhookId);
    if (error) console.error('Error deleting webhook:', error);
    else fetchWebhooks();
  };

  const handleTestWebhook = async (webhook: WebhookSubscription) => {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId: webhook.id }),
      });

      if (response.ok) alert('Test webhook sent successfully!');
      else alert('Failed to send test webhook');
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Error sending test webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const resetForm = () => {
    setWebhookUrl('');
    setSelectedEvents([]);
  };

  const toggleEventSelection = (event: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-400 mt-1">Receive real-time notifications when events occur</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
        >
          <Plus size={20} />
          Add Webhook
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="font-medium text-blue-400 mb-2">How Webhooks Work</h3>
        <p className="text-sm text-blue-300/80">
          When subscribed events occur, we'll send a POST request to your URL with the event data.
          Each request includes a signature header (X-Webhook-Signature) for verification using your secret key.
        </p>
      </div>

      {/* Webhooks list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <h3 className="text-lg font-medium text-white mb-2">No webhooks configured</h3>
          <p className="text-gray-400 mb-4">Add a webhook to receive event notifications</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Add Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {webhook.active ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle size={16} />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 text-sm">
                        <AlertCircle size={16} />
                        Inactive
                      </span>
                    )}
                    {webhook.failure_count > 0 && (
                      <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                        {webhook.failure_count} failures
                      </span>
                    )}
                  </div>

                  <p className="font-mono text-sm text-white truncate mb-3">{webhook.url}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {webhook.events.map((event) => (
                      <span key={event} className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded">
                        {event.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Secret:</span>
                    <code className="font-mono bg-[#1a1a3a] text-gray-300 px-2 py-1 rounded">
                      {showSecrets[webhook.id] ? webhook.secret : '••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => setShowSecrets((prev) => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                      className="p-1 hover:bg-[#1a1a3a] rounded text-gray-400"
                    >
                      {showSecrets[webhook.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => copyToClipboard(webhook.secret)} className="p-1 hover:bg-[#1a1a3a] rounded text-gray-400">
                      <Copy size={16} />
                    </button>
                  </div>

                  {webhook.last_triggered && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last triggered: {format(new Date(webhook.last_triggered), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleTestWebhook(webhook)} className="p-2 hover:bg-[#1a1a3a] rounded-lg" title="Test webhook">
                    <RefreshCw size={18} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(webhook)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      webhook.active
                        ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {webhook.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDeleteWebhook(webhook.id)} className="p-2 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">New Webhook</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateWebhook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Endpoint URL *</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://your-server.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Events to Subscribe *</label>
                <div className="space-y-2">
                  {EVENT_TYPES.map((event) => (
                    <label
                      key={event.value}
                      className="flex items-start gap-3 p-3 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg cursor-pointer hover:border-indigo-500/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.value)}
                        onChange={() => toggleEventSelection(event.value)}
                        className="mt-0.5 rounded border-[#2a2a4a] bg-[#12122a] text-indigo-500 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="font-medium text-white">{event.label}</p>
                        <p className="text-sm text-gray-500">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
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
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
