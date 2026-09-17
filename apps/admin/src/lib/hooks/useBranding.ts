'use client';

import { useCallback, useState } from 'react';
import { useFetch } from './useFetch';
import { api } from '../api';
import { useStore } from './useStore';
import type { StoreBranding } from '../types';

export interface UseBrandingResult {
  /** Server-committed branding. `null` while loading or with no store yet. */
  branding: StoreBranding | null;
  loading: boolean;
  error: string | null;
  /**
   * Persists `partial` via `PUT /stores/:storeId/branding` (ADMIN-04).
   * Resolves `true` on success (and updates `branding` to the server's
   * response) or `false` on failure (leaving `branding` untouched so the
   * caller's own unsaved draft state is the only thing that changes).
   */
  save: (partial: StoreBranding) => Promise<boolean>;
  saving: boolean;
  saveError: string | null;
  /** Discards any local override and re-fetches from the server. */
  reload: () => void;
}

export function useBranding(): UseBrandingResult {
  const { storeId } = useStore();
  const { data, loading, error, refetch } = useFetch<StoreBranding>(
    storeId ? () => api.getBranding(storeId) : null,
    [storeId],
  );

  // Overrides `data` right after a successful save, so the UI reflects the
  // server's response without waiting for a second round-trip via refetch.
  const [override, setOverride] = useState<StoreBranding | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const branding = override ?? data;

  const save = useCallback(
    async (partial: StoreBranding): Promise<boolean> => {
      if (!storeId) {
        setSaveError('Sin tienda seleccionada');
        return false;
      }
      setSaving(true);
      setSaveError(null);
      try {
        const updated = await api.updateBranding(storeId, partial);
        setOverride(updated);
        return true;
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Error al guardar la marca');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [storeId],
  );

  const reload = useCallback(() => {
    setOverride(null);
    refetch();
  }, [refetch]);

  return { branding, loading, error, save, saving, saveError, reload };
}
