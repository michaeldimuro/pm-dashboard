/**
 * ResponseTemplatesView — Grid of rejection response templates
 */

import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, Info } from 'lucide-react';
import { useRejectionTemplates } from '@/stores/appReviewStore';

export const ResponseTemplatesView: React.FC = () => {
  const templates = useRejectionTemplates();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const severityConfig: Record<string, { color: string; bgColor: string }> = {
    high: { color: 'text-red-400', bgColor: 'bg-red-500/10' },
    medium: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    low: { color: 'text-green-400', bgColor: 'bg-green-500/10' },
  };

  if (templates.length === 0) {
    return (
      <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-8 text-center">
        <p className="text-gray-500">No rejection templates found. Run the database migration to seed templates.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {templates.map((template) => {
        const severity = severityConfig[template.severity] || severityConfig.medium;
        const isCopied = copiedId === template.id;

        return (
          <div
            key={template.id}
            className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">
                    {template.guideline_code}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${severity.bgColor} ${severity.color}`}>
                    {template.severity}
                  </span>
                </div>
                <h3 className="text-sm text-gray-300">{template.guideline_title}</h3>
              </div>
              <button
                onClick={() => handleCopy(template.response_template, template.id)}
                className="p-2 rounded-lg hover:bg-[#1a1a3a] transition-colors"
                title="Copy template"
              >
                {isCopied ? (
                  <Check size={16} className="text-green-400" />
                ) : (
                  <Copy size={16} className="text-gray-500" />
                )}
              </button>
            </div>

            {/* Response Template */}
            <div className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {template.response_template}
              </p>
            </div>

            {/* Tips */}
            {template.tips && template.tips.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Info size={12} className="text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">Tips</span>
                </div>
                <ul className="space-y-1">
                  {template.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                      <span className="text-gray-600 mt-0.5">-</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
