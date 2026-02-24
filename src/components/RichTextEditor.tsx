"use client";

import React, { useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

type Props = {
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
};

export default function RichTextEditor({ initialContent = "", onChange, editable = true }: Props) {
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showTableModal, setShowTableModal] = useState(false);

  const handleUpdate = useCallback(
    ({ editor }: any) => {
      onChange?.(editor.getHTML());
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6, 7, 8] },
        codeBlock: { languageClassPrefix: "language-" },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-6 space-y-1",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-6 space-y-1",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "leading-relaxed",
          },
        },
      }),
      Image.configure({ allowBase64: true }),
      Table.configure({ 
        resizable: false,
        HTMLAttributes: {
          class: "border-collapse border border-blue-900 w-full table-fixed",
        },
      }),
      TableRow.extend({
        renderHTML() {
          return ["tr", { class: "border border-blue-900" }, 0];
        },
      }),
      TableCell.extend({
        renderHTML() {
          return ["td", { class: "border border-blue-900 p-2" }, 0];
        },
      }),
      TableHeader.extend({
        renderHTML() {
          return ["th", { class: "border border-blue-900 p-2 bg-blue-50" }, 0];
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "space-y-1",
        },
      }),
      TaskItem.configure({ 
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: initialContent || "<p></p>",
    editable,
    onUpdate: handleUpdate,
  });

  if (!editor) return <div className="text-gray-400">Loading editor...</div>;

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ 
        rows: parseInt(tableRows.toString()),
        cols: parseInt(tableCols.toString()), 
        withHeaderRow: true 
      })
      .run();
    setShowTableModal(false);
  };

  return (
    <div className="w-full rounded border border-gray-300 overflow-hidden">
      {editable && (
        <div className="border-b border-gray-200 bg-gray-50 p-3 space-y-2">
          {/* Row 1: Style & Text Formatting */}
          <div className="flex flex-wrap gap-1">
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === "p") {
                  editor.chain().focus().setParagraph().run();
                } else if (value.startsWith("h")) {
                  const level = parseInt(value[1]) as any;
                  editor.chain().focus().setHeading({ level }).run();
                }
              }}
              className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
            >
              <option value="p">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Subheader 1</option>
              <option value="h5">Subheader 2</option>
              <option value="h6">Subheader 3</option>
              <option value="h7">Subheader 4</option>
              <option value="h8">Subheader 5</option>
            </select>

            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("bold")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("italic")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>

            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("underline")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </button>

            <div className="w-px bg-gray-300" />

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("bulletList")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Bullet List"
            >
              • List
            </button>

            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("orderedList")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Numbered List"
            >
              1. List
            </button>

            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("taskList")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Task List"
            >
              ☑ Task
            </button>

            <div className="w-px bg-gray-300" />

            <button
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
              disabled={!editor.can().chain().focus().sinkListItem("listItem").run()}
              className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              title="Indent (Tab)"
            >
              →
            </button>

            <button
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
              disabled={!editor.can().chain().focus().liftListItem("listItem").run()}
              className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              title="Outdent (Shift+Tab)"
            >
              ←
            </button>
          </div>

          {/* Row 2: Advanced */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`px-2 py-1 text-sm rounded transition ${
                editor.isActive("codeBlock")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Code Block"
            >
              {"<>"} Code
            </button>

            <button
              onClick={() => addImage()}
              className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              title="Insert Image"
            >
              🖼 Image
            </button>

            <button
              onClick={() => setShowTableModal(true)}
              className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              title="Insert Table"
            >
              ⊞ Table
            </button>

            <div className="w-px bg-gray-300" />

            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              title="Undo"
            >
              ↶ Undo
            </button>

            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              title="Redo"
            >
              ↷ Redo
            </button>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insert Table</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={insertTable}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white text-gray-900 min-h-64 p-4 focus-within:ring-1 focus-within:ring-blue-500">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
