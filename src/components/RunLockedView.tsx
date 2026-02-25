"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type TimerState = {
  total: number;
  remaining: number;
  running: boolean;
};

type InteractionState = {
  stepCompletion: Record<string, boolean>;
  entryFields: Record<string, string>;
  timers: Record<string, TimerState>;
};

type Props = {
  runBody: string;
  initialInteractionState: string;
  onChange?: (next: InteractionState) => void;
};

const EMPTY_STATE: InteractionState = {
  stepCompletion: {},
  entryFields: {},
  timers: {},
};

function parseState(raw: string): InteractionState {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      stepCompletion: parsed.stepCompletion ?? {},
      entryFields: parsed.entryFields ?? {},
      timers: parsed.timers ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function RunLockedView({ runBody, initialInteractionState, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>(() => parseState(initialInteractionState));

  useEffect(() => {
    setInteraction(parseState(initialInteractionState));
  }, [initialInteractionState]);

  useEffect(() => {
    if (!Object.values(interaction.timers).some((timer) => timer.running)) return;
    const id = window.setInterval(() => {
      setInteraction((prev) => {
        const nextTimers: Record<string, TimerState> = {};
        let changed = false;

        for (const [key, timer] of Object.entries(prev.timers)) {
          if (!timer.running) {
            nextTimers[key] = timer;
            continue;
          }

          const nextRemaining = Math.max(0, timer.remaining - 1);
          nextTimers[key] = {
            ...timer,
            remaining: nextRemaining,
            running: nextRemaining > 0,
          };

          if (nextRemaining !== timer.remaining || nextTimers[key].running !== timer.running) {
            changed = true;
          }
        }

        if (!changed) return prev;
        return { ...prev, timers: nextTimers };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [interaction.timers]);

  useEffect(() => {
    onChange?.(interaction);
  }, [interaction, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = runBody || "<p></p>";

    const editableNodes = container.querySelectorAll<HTMLElement>("[contenteditable]");
    editableNodes.forEach((node) => {
      node.setAttribute("contenteditable", "false");
    });

    const fieldNodes = container.querySelectorAll<HTMLElement>("span[data-entry-node='measurement']");
    fieldNodes.forEach((node, index) => {
      const fieldKey = `field-${index}`;
      const label = node.getAttribute("label") || "Undefined";
      const unit = node.getAttribute("unit") || "";
      const attrValue = node.getAttribute("value") || "";
      const currentValue = interaction.entryFields[fieldKey] ?? attrValue;

      node.className = "entry-measurement inline-flex items-center gap-2 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-900";
      node.textContent = "";

      const labelSpan = document.createElement("span");
      labelSpan.className = "font-medium";
      labelSpan.textContent = label;

      const input = document.createElement("input");
      input.value = currentValue;
      input.placeholder = "value";
      input.className = "min-w-[8ch] rounded border border-blue-200 bg-white px-2 py-1 text-xs text-zinc-900";
      input.style.width = `${Math.max(8, Math.min(48, currentValue.length + 2))}ch`;
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === "Tab") event.preventDefault();
      });
      input.addEventListener("input", (event) => {
        const nextValue = (event.target as HTMLInputElement).value.replace(/[\n\r\t]/g, "");
        (event.target as HTMLInputElement).value = nextValue;
        (event.target as HTMLInputElement).style.width = `${Math.max(8, Math.min(48, nextValue.length + 2))}ch`;
        setInteraction((prev) => ({
          ...prev,
          entryFields: {
            ...prev.entryFields,
            [fieldKey]: nextValue,
          },
        }));
      });

      node.appendChild(labelSpan);
      node.appendChild(input);
      if (unit) {
        const unitSpan = document.createElement("span");
        unitSpan.textContent = unit;
        node.appendChild(unitSpan);
      }
    });

    const stepInputs = container.querySelectorAll<HTMLInputElement>("li[data-type='taskItem'] input[type='checkbox']");
    stepInputs.forEach((input, index) => {
      const stepKey = `step-${index}`;
      const checked = interaction.stepCompletion[stepKey] ?? input.checked;
      input.checked = checked;
      input.disabled = false;
      input.addEventListener("change", (event) => {
        const nextChecked = (event.target as HTMLInputElement).checked;
        setInteraction((prev) => ({
          ...prev,
          stepCompletion: {
            ...prev.stepCompletion,
            [stepKey]: nextChecked,
          },
        }));
      });
    });

    const timerNodes = container.querySelectorAll<HTMLElement>("span[data-entry-node='timer']");
    timerNodes.forEach((node, index) => {
      const timerKey = `timer-${index}`;
      const label = node.getAttribute("label") || "Timer";
      const attrSeconds = Number(node.getAttribute("seconds") || "60");
      const currentTimer = interaction.timers[timerKey] ?? {
        total: attrSeconds,
        remaining: attrSeconds,
        running: false,
      };

      node.className = "entry-timer inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900";
      node.textContent = "";

      const labelSpan = document.createElement("span");
      labelSpan.className = "font-medium";
      labelSpan.textContent = label;

      const valueSpan = document.createElement("span");
      valueSpan.className = "font-mono";
      valueSpan.textContent = formatDuration(currentTimer.remaining);

      const startPause = document.createElement("button");
      startPause.className = "rounded border border-amber-400 px-2 py-0.5 text-[11px]";
      startPause.textContent = currentTimer.running ? "Pause" : "Start";
      startPause.addEventListener("click", () => {
        setInteraction((prev) => {
          const existing = prev.timers[timerKey] ?? currentTimer;
          return {
            ...prev,
            timers: {
              ...prev.timers,
              [timerKey]: {
                ...existing,
                running: !existing.running,
              },
            },
          };
        });
      });

      const reset = document.createElement("button");
      reset.className = "rounded border border-amber-400 px-2 py-0.5 text-[11px]";
      reset.textContent = "Reset";
      reset.addEventListener("click", () => {
        setInteraction((prev) => ({
          ...prev,
          timers: {
            ...prev.timers,
            [timerKey]: {
              ...currentTimer,
              remaining: currentTimer.total,
              running: false,
            },
          },
        }));
      });

      node.appendChild(labelSpan);
      node.appendChild(valueSpan);
      node.appendChild(startPause);
      node.appendChild(reset);
    });
  }, [runBody, interaction.entryFields, interaction.stepCompletion, interaction.timers]);

  const contentClass = useMemo(
    () => "prose max-w-none rounded border border-zinc-200 bg-white p-4 text-zinc-900",
    []
  );

  return <div ref={containerRef} className={contentClass} />;
}
