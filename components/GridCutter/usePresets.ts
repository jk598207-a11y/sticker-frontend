import { useState } from 'react';
import { getToken, isLoggedIn } from '@/lib/auth';
import type { Preset } from './types';

type GridSnapshot = Omit<Preset, 'id' | 'name'>;

export function usePresets({ getGrid, onApply, onMessage }: { getGrid: () => GridSnapshot; onApply: (preset: Preset) => void; onMessage: (message: string, isError?: boolean) => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
  const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
  const load = async () => {
    if (!isLoggedIn()) return onMessage('請先登入才能讀取預設集。', true);
    try { const response = await fetch(`${apiBase}/presets`, { headers: authHeaders() }); if (!response.ok) throw new Error(); const data: unknown = await response.json(); setPresets(Array.isArray(data) ? data as Preset[] : []); }
    catch { onMessage('讀取預設集失敗。', true); }
  };
  const save = async (name: string) => {
    if (!isLoggedIn()) return onMessage('請先登入才能儲存預設集。', true);
    try { const response = await fetch(`${apiBase}/presets`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name, ...getGrid() }) }); if (!response.ok) throw new Error(); onMessage(`已儲存「${name}」。`); }
    catch { onMessage('儲存預設集失敗。', true); }
  };
  const remove = async (id: string) => {
    try { const response = await fetch(`${apiBase}/presets/${id}`, { method: 'DELETE', headers: authHeaders() }); if (!response.ok) throw new Error(); setPresets((items) => items.filter((item) => item.id !== id)); }
    catch { onMessage('刪除預設集失敗。', true); }
  };
  const apply = (preset: Preset) => { onApply(preset); onMessage(`已套用「${preset.name}」。`); };
  return { presets, load, save, remove, apply };
}
