import React from 'react';
import { X } from 'lucide-react';
import { Session } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onLoadSession: (session: Session) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, sessions, onLoadSession }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-[350px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out border-l border-gray-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-2xl tracking-tight">Archives</h2>
            <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300">
              <X size={24} strokeWidth={1} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
            {sessions.length === 0 ? (
              <div className="text-gray-400 font-serif italic text-center mt-20">No archives found.</div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="group cursor-pointer"
                  onClick={() => { onLoadSession(session); onClose(); }}
                >
                  <div className="flex justify-between items-baseline mb-2 border-b border-gray-100 pb-2">
                    <span className="font-sans text-xs font-medium uppercase text-gray-500">
                      {new Date(session.timestamp).toLocaleDateString()}
                    </span>
                    <span className="font-serif text-sm italic text-gray-400 group-hover:text-black transition-colors">
                      {session.outputs.length} Image{session.outputs.length !== 1 && 's'}
                    </span>
                  </div>

                  {/* Micro Grid Preview */}
                  <div className="grid grid-cols-3 gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {session.outputs.slice(0, 3).map((out, idx) => (
                      <div key={idx} className="aspect-[9/16] bg-gray-50 overflow-hidden">
                        <img src={out} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                    {session.inputs.stylingRef && (
                      <div className="aspect-[3/4] bg-gray-50 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                        <img src={session.inputs.stylingRef.previewUrl} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-400 font-sans">
                    {session.parameters.model.split('-').slice(-2).join(' ')} • {session.parameters.gender}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;
