"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

type ModuleItem = {
  id: string;
  title: string;
  createdAt: string;
};

type ContentType = "video" | "pdf" | "scorm" | "h5p";

type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
  createdAt: string;
};

type AccessSettings = {
  password?: string;
  openAt?: string; // ISO
  allowedGroups?: string[];
};

function nowTR() {
  return new Date().toLocaleString("tr-TR");
}

function randId(prefix: string) {
  const n = Math.floor(100 + Math.random() * 900);
  return `${prefix}${n}`;
}

function typeLabel(t: ContentType) {
  switch (t) {
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "scorm":
      return "SCORM";
    case "h5p":
      return "H5P";
  }
}

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...listeners}
          className="mt-1 select-none cursor-grab rounded-md border border-white/40 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 active:cursor-grabbing"
          aria-label="Sürükle"
          title="Sürükle"
        >
          ☰
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function ModuleDetailPage() {
  const params = useParams<{ id: string; moduleId: string }>();

  // params güvenli (undefined olabilir)
  const courseId = typeof params?.id === "string" ? params.id : undefined;
  const moduleId = typeof params?.moduleId === "string" ? params.moduleId : undefined;

  // ✅ HER HOOK HER RENDER ÇAĞRILACAK (return yok)

  // hydration gate
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // key'ler (param yoksa boş string)
  const modulesKey = useMemo(
    () => (courseId ? `course_modules_${courseId}` : ""),
    [courseId]
  );
  const itemsKey = useMemo(
    () => (courseId && moduleId ? `module_items_${courseId}_${moduleId}` : ""),
    [courseId, moduleId]
  );
  const accessKey = useMemo(
    () => (courseId ? `course_access_${courseId}` : ""),
    [courseId]
  );

  // page states
  const [moduleTitle, setModuleTitle] = useState<string>("");
  const [items, setItems] = useState<ContentItem[]>([]);

  // form state
  const [type, setType] = useState<ContentType>("pdf");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  // access state
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [access, setAccess] = useState<AccessSettings>({});
  const [userGroup, setUserGroup] = useState<string>("A");
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState("");

  // drag & drop (hook)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    if (!itemsKey) return; // param gelmeden kaydetmeye çalışma

    setItems((prev) => {
      const oldIndex = prev.findIndex((x) => x.id === String(active.id));
      const newIndex = prev.findIndex((x) => x.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;

      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(itemsKey, JSON.stringify(next));
      return next;
    });
  };

  // access load
  useEffect(() => {
    if (!mounted) return;
    if (!courseId) return;
    if (!accessKey) return;

    const ug = localStorage.getItem("user_group");
    if (ug) setUserGroup(ug);

    const rawAcc = localStorage.getItem(accessKey);
    const a: AccessSettings = rawAcc ? JSON.parse(rawAcc) : {};
    setAccess(a);

    const ok = localStorage.getItem(`course_access_ok_${courseId}`) === "1";
    setUnlocked(ok);

    setAccessLoaded(true);
  }, [mounted, courseId, accessKey]);

  // derive lock flags (safe)
  const openAtMs = access.openAt ? new Date(access.openAt).getTime() : null;
  const dateLocked = openAtMs !== null && Date.now() < openAtMs;

  const groupLocked =
    Array.isArray(access.allowedGroups) &&
    access.allowedGroups.length > 0 &&
    !access.allowedGroups.includes(userGroup);

  const passwordLocked = !!access.password && !unlocked;

  const isLocked = dateLocked || groupLocked || passwordLocked;

  // load module title + items
  useEffect(() => {
    if (!mounted) return;
    if (!courseId || !moduleId) return;
    if (!modulesKey) return;

    // module title
    const rawModules = localStorage.getItem(modulesKey);
    try {
      const parsed: ModuleItem[] = rawModules ? JSON.parse(rawModules) : [];
      const mod = parsed.find((m) => m.id === moduleId);
      setModuleTitle(mod?.title ?? "");
    } catch {
      setModuleTitle("");
    }

    // items
    if (isLocked) {
      setItems([]);
      return;
    }
    if (!itemsKey) return;

    const rawItems = localStorage.getItem(itemsKey);
    try {
      const parsed: ContentItem[] = rawItems ? JSON.parse(rawItems) : [];
      setItems(parsed);
    } catch {
      setItems([]);
    }
  }, [mounted, courseId, moduleId, modulesKey, itemsKey, isLocked]);

  const tryUnlock = () => {
    if (!courseId) return;
    if (!access.password) return;

    if (passwordInput === access.password) {
      localStorage.setItem(`course_access_ok_${courseId}`, "1");
      setUnlocked(true);
      setPasswordInput("");
    } else {
      alert("Şifre yanlış.");
    }
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemsKey) return;
    const t = title.trim();
    if (!t) return;

    const newItem: ContentItem = {
      id: randId("I"),
      type,
      title: t,
      url: url.trim() || undefined,
      createdAt: nowTR(),
    };

    setItems((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem(itemsKey, JSON.stringify(next));
      return next;
    });

    setTitle("");
    setUrl("");
    setType("pdf");
  };

  const removeItem = (itemId: string) => {
    if (!itemsKey) return;
    if (!confirm("Bu içeriği silmek istediğine emin misin?")) return;

    setItems((prev) => {
      const next = prev.filter((x) => x.id !== itemId);
      localStorage.setItem(itemsKey, JSON.stringify(next));
      return next;
    });
  };

  const renameModule = () => {
    if (!modulesKey) return;
    if (!moduleId) return;

    const newNameRaw = prompt("Modül adını güncelle:", moduleTitle);
    if (newNameRaw === null) return;

    const newName = newNameRaw.trim();
    if (!newName) return;

    const rawModules = localStorage.getItem(modulesKey);
    const parsed: ModuleItem[] = rawModules ? JSON.parse(rawModules) : [];
    const updated = parsed.map((m) =>
      m.id === moduleId ? { ...m, title: newName } : m
    );

    localStorage.setItem(modulesKey, JSON.stringify(updated));
    setModuleTitle(newName);
  };

  // ✅ ARTIK RETURN'LAR EN SONA (hook sırası sabit)

  if (!mounted) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Yükleniyor...
      </div>
    );
  }

  if (!courseId || !moduleId) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        URL parametreleri eksik görünüyor. Lütfen ders/modül sayfasından tekrar gir.
      </div>
    );
  }

  if (!accessLoaded) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Yükleniyor...
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="space-y-4 max-w-xl">
        <Link
          href={`/courses/${courseId}/modules`}
          className="text-sm text-gray-300 hover:underline"
        >
          ← Modüllere dön
        </Link>

        <div className="rounded-lg border border-white/20 p-4">
          <h1 className="text-xl font-semibold text-white">Ders / Modül Kilitli</h1>

          <div className="mt-2 text-gray-300">
            <span className="text-gray-400">Modül:</span>{" "}
            <span className="text-white">{moduleTitle || moduleId}</span>
          </div>

          {dateLocked && access.openAt && (
            <p className="mt-2 text-gray-300">
              Ders şu tarihte açılacak:{" "}
              <span className="text-white">
                {new Date(access.openAt).toLocaleString("tr-TR")}
              </span>
            </p>
          )}

          {groupLocked && (
            <p className="mt-2 text-gray-300">
              Bu ders sadece şu gruplara açık:{" "}
              <span className="text-white">
                {(access.allowedGroups || []).join(", ")}
              </span>
              . Senin grubun: <span className="text-white">{userGroup}</span>
            </p>
          )}

          {passwordLocked && (
            <div className="mt-4 space-y-2">
              <label className="block text-sm text-white">Şifre</label>
              <div className="flex gap-2">
                <input
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black outline-none"
                  placeholder="Ders şifresini gir"
                />
                <button
                  onClick={tryUnlock}
                  className="shrink-0 rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
                >
                  Aç
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/courses/${courseId}/modules`}
            className="text-sm text-gray-300 hover:underline"
          >
            ← Modüllere dön
          </Link>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            Modül: {moduleId}
          </h1>

          <div className="text-gray-300">
            <span className="text-gray-400">Başlık:</span>{" "}
            <span className="text-white">{moduleTitle || "(bulunamadı)"}</span>
          </div>

          <p className="mt-1 text-sm text-gray-300">
            Bu modüle içerik ekle (Video / PDF / SCORM / H5P).
          </p>
        </div>

        <button
          onClick={renameModule}
          className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10 transition"
        >
          Modül Adını Düzenle
        </button>
      </div>

      {/* İçerik ekleme */}
      <form onSubmit={addItem} className="rounded-lg border border-white/20 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm text-white mb-1">İçerik Türü</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContentType)}
              className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none"
            >
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="scorm">SCORM</option>
              <option value="h5p">H5P</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-white mb-1">Başlık</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: 1. Ders Notları"
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white mb-1">Link (opsiyonel - mock)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Örn: https://..."
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
        >
          İçerik Ekle
        </button>
      </form>

      {/* İçerik listesi */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-white/20 p-4 text-gray-300">
            Henüz içerik yok. Yukarıdan ekleyebilirsin.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((it) => (
                  <SortableItem key={it.id} id={it.id}>
                    <div className="rounded-lg border border-white/20 p-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs text-gray-400">
                          {it.id} • {typeLabel(it.type)} • {it.createdAt}
                        </div>

                        <div className="text-lg font-medium text-white">{it.title}</div>

                        {it.url && (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-gray-200 underline break-all"
                          >
                            {it.url}
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => removeItem(it.id)}
                        className="shrink-0 rounded-md border border-red-400 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition"
                      >
                        Sil
                      </button>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
