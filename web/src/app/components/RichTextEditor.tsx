"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const apply = (cmd: string) => {
    document.execCommand(cmd);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // Sadece ilk yüklemede (ve dışarıdan value resetlenince) içeriği bas
  useEffect(() => {
    if (!editorRef.current) return;
    // Eğer editor boşsa veya value resetlendiyse güncelle
    if (value === "" && editorRef.current.innerHTML !== "") {
      editorRef.current.innerHTML = "";
    }
  }, [value]);

  const btnCls =
    "rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white hover:bg-white/10";

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex gap-2 rounded-md border border-white/20 bg-white/5 p-2">
        <button type="button" onClick={() => apply("bold")} className={btnCls}>
          <span className="font-bold">B</span>
        </button>

        <button type="button" onClick={() => apply("italic")} className={btnCls}>
          <span className="italic">I</span>
        </button>

        <button
          type="button"
          onClick={() => apply("insertUnorderedList")}
          className={btnCls}
        >
          • Liste
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        id="editor"
        contentEditable
        className="min-h-[120px] rounded-md border border-white/20 bg-white px-3 py-2 text-black"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}
