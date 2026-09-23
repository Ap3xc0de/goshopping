'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/hooks/useStore';
import { api, ApiError } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types';

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  categories.forEach((c) => byId.set(c.id, { ...c, children: [] }));

  const roots: CategoryNode[] = [];
  categories.forEach((c) => {
    const node = byId.get(c.id)!;
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}

type CategoryFormState = {
  name: string;
  parent_id: string;
  sort_order: number;
};

const EMPTY_FORM: CategoryFormState = { name: '', parent_id: '', sort_order: 0 };

export default function CategoriesPage() {
  const { storeId } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await api.listCategories(storeId);
      setCategories(res.categories);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'No pudimos cargar las categorías',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      parent_id: category.parent_id ?? '',
      sort_order: category.sort_order,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!storeId) return;
    setSaving(true);
    try {
      if (editing) {
        const payload: UpdateCategoryRequest = {
          name: form.name,
          parent_id: form.parent_id || null,
          sort_order: form.sort_order,
        };
        const updated = await api.updateCategory(storeId, editing.id, payload);
        setCategories((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
        setToast({ message: 'Categoría actualizada', type: 'success' });
      } else {
        const payload: CreateCategoryRequest = {
          name: form.name,
          parent_id: form.parent_id || null,
          sort_order: form.sort_order,
        };
        const created = await api.createCategory(storeId, payload);
        setCategories((cs) => [...cs, created]);
        setToast({ message: 'Categoría creada', type: 'success' });
      }
      setModalOpen(false);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'No pudimos guardar la categoría',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !storeId) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.deleteCategory(storeId, target.id);
      setCategories((cs) => cs.filter((c) => c.id !== target.id));
      setToast({ message: 'Categoría eliminada', type: 'success' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setToast({
          message: 'No se puede eliminar: la categoría tiene subcategorías',
          type: 'error',
        });
      } else {
        setToast({
          message: err instanceof Error ? err.message : 'No pudimos eliminar la categoría',
          type: 'error',
        });
      }
    }
  }

  if (loading) return <PageLoader />;

  const tree = buildTree(categories);
  // A category cannot become its own parent (or a descendant's parent) — exclude
  // itself from the parent options when editing.
  const parentOptions = categories.filter((c) => c.id !== editing?.id);

  function renderNode(node: CategoryNode, depth = 0) {
    return (
      <div key={node.id}>
        <div
          className="flex items-center justify-between py-2 border-b border-gray-50"
          style={{ paddingLeft: `${depth * 1.5}rem` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FolderTree className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{node.name}</span>
            <span className="text-xs text-gray-400 truncate">/{node.slug}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label={`Editar ${node.name}`}
              onClick={() => openEdit(node)}
              className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${node.name}`}
              onClick={() => setDeleteTarget(node)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organiza tu catálogo en árbol</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        {tree.length === 0 ? (
          <EmptyState title="Sin categorías" description="Crea tu primera categoría para organizar el catálogo." />
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="category-name" className="block text-xs font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              id="category-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label htmlFor="category-parent" className="block text-xs font-medium text-gray-700 mb-1">
              Categoría padre
            </label>
            <select
              id="category-parent"
              value={form.parent_id}
              onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Ninguna (categoría raíz)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category-sort" className="block text-xs font-medium text-gray-700 mb-1">
              Orden
            </label>
            <input
              id="category-sort"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar categoría"
        message={
          deleteTarget
            ? `¿Eliminar la categoría "${deleteTarget.name}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
