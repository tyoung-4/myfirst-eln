"use client";

import React, { useCallback, useMemo, useState } from "react";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
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

type EntryTypeOption = {
  label: string;
  defaultUnit: string;
};

const ENTRY_TYPE_OPTIONS: EntryTypeOption[] = [
  { label: "Undefined", defaultUnit: "" },
  { label: "Mass", defaultUnit: "g" },
  { label: "Volume", defaultUnit: "mL" },
  { label: "Concentration", defaultUnit: "mM" },
  { label: "Cell Count", defaultUnit: "cells" },
  { label: "Temperature", defaultUnit: "deg C" },
  { label: "pH", defaultUnit: "pH" },
  { label: "Time", defaultUnit: "min" },
];

const UNIT_OPTIONS = ["g", "mg", "ug", "mL", "uL", "L", "mM", "uM", "nM", "cells", "%", "min", "hr", "deg C", "pH"];

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function MeasurementFieldView({ node, updateAttributes, editor }: NodeViewProps) {
  const label = String(node.attrs.label ?? "Undefined");
  const unit = String(node.attrs.unit ?? "");
  const value = String(node.attrs.value ?? "");
  const inputWidth = `${Math.max(10, Math.min(64, value.length + 4))}ch`;

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle">
      <span className="inline-flex items-center gap-2 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-900" contentEditable={false}>
        <span className="font-medium">{label}</span>
        <input
          value={value}
          onChange={(e) => updateAttributes({ value: e.target.value.replace(/[\n\r\t]/g, "") })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") e.preventDefault();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/[\n\r\t]/g, "");
            updateAttributes({ value: `${value}${pasted}` });
          }}
          disabled={!editor.isEditable}
          placeholder="value"
          style={{ width: inputWidth }}
          className="min-w-[10ch] rounded border border-blue-200 bg-white px-2.5 py-1 text-xs text-zinc-900"
        />
        {unit ? <span>{unit}</span> : null}
      </span>
    </NodeViewWrapper>
  );
}

function TimerFieldView({ node }: NodeViewProps) {
  const label = String(node.attrs.label ?? "Timer");
  const seconds = Number(node.attrs.seconds ?? 60);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  React.useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
  }, [seconds]);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [running]);

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle">
      <span className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900" contentEditable={false}>
        <span className="font-medium">{label}</span>
        <span className="font-mono">{formatDuration(remaining)}</span>
        <button
          onClick={() => setRunning((v) => !v)}
          className="rounded border border-amber-400 px-2 py-0.5 text-[11px]"
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(seconds);
          }}
          className="rounded border border-amber-400 px-2 py-0.5 text-[11px]"
        >
          Reset
        </button>
      </span>
    </NodeViewWrapper>
  );
}

const MeasurementFieldNode = Node.create({
  name: "measurementField",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      label: { default: "Undefined" },
      unit: { default: "" },
      value: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-entry-node='measurement']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const label = String(HTMLAttributes.label ?? "Undefined");
    const value = String(HTMLAttributes.value ?? "");
    const unit = String(HTMLAttributes.unit ?? "");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-entry-node": "measurement",
        class: "entry-measurement",
      }),
      `${label}: ${value || "__"}${unit ? ` ${unit}` : ""}`,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MeasurementFieldView);
  },
});

const TimerFieldNode = Node.create({
  name: "timerField",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      label: { default: "Timer" },
      seconds: { default: 60 },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-entry-node='timer']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const label = String(HTMLAttributes.label ?? "Timer");
    const seconds = Number(HTMLAttributes.seconds ?? 60);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-entry-node": "timer",
        class: "entry-timer",
      }),
      `${label} (${formatDuration(seconds)})`,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TimerFieldView);
  },
});

export default function RichTextEditor({ initialContent = "", onChange, editable = true }: Props) {
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showEntryFieldModal, setShowEntryFieldModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [entryType, setEntryType] = useState(ENTRY_TYPE_OPTIONS[0].label);
  const [entryUnit, setEntryUnit] = useState(ENTRY_TYPE_OPTIONS[0].defaultUnit);
  const [customLabel, setCustomLabel] = useState("");
  const [timerLabel, setTimerLabel] = useState("Step Timer");
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const handleUpdate = useCallback(
    ({ editor }: { editor: { getHTML: () => string } }) => {
      onChange?.(editor.getHTML());
    },
    [onChange]
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
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
          class: "step-list",
        },
      }),
      TaskItem.configure({
        nested: false,
        HTMLAttributes: {
          class: "step-item",
        },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      MeasurementFieldNode,
      TimerFieldNode,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: initialContent || "<p></p>",
    editable,
    editorProps: {
      attributes: {
        class: "ProseMirror prose max-w-none min-h-[22rem] p-1 focus:outline-none",
      },
    },
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
        withHeaderRow: true,
      })
      .run();
    setShowTableModal(false);
  };

  const insertMeasurementField = () => {
    const selectedOption = ENTRY_TYPE_OPTIONS.find((option) => option.label === entryType);
    const label = customLabel.trim() || entryType;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "measurementField",
        attrs: {
          label,
          unit: entryUnit || selectedOption?.defaultUnit || "",
          value: "",
        },
      })
      .insertContent(" ")
      .run();
    setShowEntryFieldModal(false);
  };

  const insertTimerField = () => {
    const safeMinutes = Math.max(0, timerMinutes || 0);
    const safeSeconds = Math.min(59, Math.max(0, timerSeconds || 0));
    const totalSeconds = safeMinutes * 60 + safeSeconds;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "timerField",
        attrs: {
          label: timerLabel.trim() || "Step Timer",
          seconds: Math.max(1, totalSeconds),
        },
      })
      .insertContent(" ")
      .run();
    setShowTimerModal(false);
  };

  return (
    <div className="w-full overflow-hidden rounded border border-gray-300">
      {editable && (
        <div className="space-y-2 border-b border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-wrap gap-1">
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === "p") {
                  editor.chain().focus().setParagraph().run();
                } else if (value.startsWith("h")) {
                  const level = parseInt(value[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
                  editor.chain().focus().setHeading({ level }).run();
                }
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              <option value="p">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Subheader 1</option>
              <option value="h5">Subheader 2</option>
              <option value="h6">Subheader 3</option>
            </select>

            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`rounded px-2 py-1 text-sm transition ${
                editor.isActive("bold")
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`rounded px-2 py-1 text-sm transition ${
                editor.isActive("italic")
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>

            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`rounded px-2 py-1 text-sm transition ${
                editor.isActive("underline")
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </button>

            <div className="w-px bg-gray-300" />

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`rounded px-2 py-1 text-sm transition ${
                editor.isActive("bulletList")
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Bullet List"
            >
              • List
            </button>

            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`rounded px-2 py-1 text-sm transition ${
                editor.isActive("taskList")
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Step List"
            >
              Step
            </button>

            <div className="w-px bg-gray-300" />

            <button
              onClick={() => setShowEntryFieldModal(true)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              title="Insert Entry Field"
            >
              + Entry Field
            </button>
            <button
              onClick={() => setShowTimerModal(true)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              title="Insert Timer"
            >
              + Timer
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`rounded px-2 py-1 text-sm transition ${
                editor.isActive("codeBlock")
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Code Block"
            >
              {"<>"} Code
            </button>

            <button
              onClick={() => addImage()}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              title="Insert Image"
            >
              Image
            </button>

            <button
              onClick={() => setShowTableModal(true)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              title="Insert Table"
            >
              Table
            </button>

            <div className="w-px bg-gray-300" />

            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Undo"
            >
              Undo
            </button>

            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Redo"
            >
              Redo
            </button>
          </div>
        </div>
      )}

      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Insert Table</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rows</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Columns</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowTableModal(false)}
                className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={insertTable} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {showEntryFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Insert Entry Field</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Field Type</label>
                <select
                  value={entryType}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEntryType(value);
                    const option = ENTRY_TYPE_OPTIONS.find((o) => o.label === value);
                    if (option) setEntryUnit(option.defaultUnit);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                >
                  {ENTRY_TYPE_OPTIONS.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Custom Label (optional)</label>
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g., Bead slurry volume"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
                <select
                  value={entryUnit}
                  onChange={(e) => setEntryUnit(e.target.value)}
                  disabled={entryType === "Undefined"}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                >
                  <option value="">No unit</option>
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEntryFieldModal(false)}
                className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={insertMeasurementField}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Insert Timer</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Timer Label</label>
                <input
                  value={timerLabel}
                  onChange={(e) => setTimerLabel(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowTimerModal(false)}
                className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={insertTimerField} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="min-h-64 bg-white p-4 text-gray-900 focus-within:ring-1 focus-within:ring-blue-500"
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest(".ProseMirror")) return;
          editor.chain().focus().run();
        }}
      >
        <EditorContent editor={editor} className="tiptap-root min-h-[22rem]" />
      </div>
    </div>
  );
}
