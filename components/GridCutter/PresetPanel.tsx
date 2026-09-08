import { useState } from 'react';
import type { Preset } from './types';

export default function PresetPanel({ presets, onLoad, onSave, onApply, onDelete }: { presets: Preset[]; onLoad: () => Promise<void>; onSave: (name: string) => Promise<void>; onApply: (preset: Preset) => void; onDelete: (id: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const save = async () => { if (!name.trim()) return; await onSave(name.trim()); setName(''); setEditing(false); };
  return <div className="mt-2">
    <div className="flex gap-2"><button className="flex-1 rounded-lg border border-ink/20 px-4 py-2.5 text-sm" onClick={() => setEditing(true)}>儲存預設</button><button className="flex-1 rounded-lg border border-ink/20 px-4 py-2.5 text-sm" onClick={async () => { await onLoad(); setOpen(true); }}>載入預設</button></div>
    {editing && <div className="mt-2 flex gap-2"><input className="flex-1 rounded-lg border border-ink/20 px-3 py-2 text-sm" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && save()} placeholder="預設名稱" autoFocus /><button className="rounded-lg bg-accent px-3 py-2 text-sm text-white" onClick={save}>儲存</button><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setEditing(false)}>取消</button></div>}
    {open && <div className="mt-2 rounded-xl border border-ink/10 bg-white py-1 shadow-sm">{presets.length === 0 ? <p className="px-4 py-3 text-center text-xs text-ink/45">尚無已儲存的預設集</p> : presets.map((preset) => <div key={preset.id} className="flex items-center hover:bg-ink/5"><button className="flex-1 px-4 py-2.5 text-left text-sm" onClick={() => { onApply(preset); setOpen(false); }}><span className="font-medium">{preset.name}</span><span className="ml-2 text-xs text-ink/45">{preset.rows} × {preset.cols}</span></button><button className="px-3 py-2.5 text-xs text-red-400" onClick={() => onDelete(preset.id)}>刪除</button></div>)}</div>}
  </div>;
}
