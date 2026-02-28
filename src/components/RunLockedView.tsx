"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimerState = {
  mode?: "countdown" | "countup" | "longrange";
  total: number;
  remaining: number;
  running: boolean;
  locked: boolean;
  alertUntil?: number;
  startedAt?: number;
  firstStartedAt?: number;
  endedAt?: number;
  elapsed?: number;
};

type InteractionState = {
  stepCompletion: Record<string, boolean>;
  components: Record<string, boolean>;
  componentAmounts: Record<string, string>;
  entryFields: Record<string, string>;
  timers: Record<string, TimerState>;
};

type Props = {
  runBody: string;
  initialInteractionState: string;
  onChange?: (next: InteractionState) => void;
  readOnly?: boolean;
};

const EMPTY_STATE: InteractionState = {
  stepCompletion: {},
  components: {},
  componentAmounts: {},
  entryFields: {},
  timers: {},
};

function parseState(raw: string): InteractionState {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      stepCompletion: parsed.stepCompletion ?? {},
      components: parsed.components ?? {},
      componentAmounts: parsed.componentAmounts ?? {},
      entryFields: parsed.entryFields ?? {},
      timers: parsed.timers ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function formatDuration(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const absolute = Math.abs(totalSeconds);
  const minutes = Math.floor(absolute / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (absolute % 60).toString().padStart(2, "0");
  return `${sign}${minutes}:${seconds}`;
}

function inputWidth(value: string) {
  return `${Math.max(10, Math.min(64, value.length + 4))}ch`;
}

export default function RunLockedView({ runBody, initialInteractionState, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fieldInputsRef = useRef<Record<string, HTMLInputElement>>({});
  const componentAmountInputsRef = useRef<Record<string, HTMLInputElement>>({});
  const stepInputsRef = useRef<Record<string, HTMLInputElement>>({});
  const componentInputsRef = useRef<Record<string, HTMLInputElement>>({});
  const timerControlsRef = useRef<
    Record<
      string,
      {
        container: HTMLElement;
        value: HTMLSpanElement;
        elapsed: HTMLSpanElement;
        stamps: HTMLSpanElement;
        startPause: HTMLButtonElement;
        reset: HTMLButtonElement;
        lock: HTMLButtonElement;
      }
    >
  >({});
  const timerDefaultsRef = useRef<Record<string, number>>({});
  const timerModesRef = useRef<Record<string, "countdown" | "countup" | "longrange">>({});
  const stepTimersRef = useRef<Record<string, string[]>>({});
  const stepComponentsRef = useRef<Record<string, string[]>>({});

  const [interaction, setInteraction] = useState<InteractionState>(() => parseState(initialInteractionState));

  useEffect(() => {
    setInteraction(parseState(initialInteractionState));
  }, [initialInteractionState]);

  useEffect(() => {
    if (!readOnly) {
      onChange?.(interaction);
    }
  }, [interaction, onChange, readOnly]);

  const applyInteractionToDom = useCallback((state: InteractionState) => {
    const active = document.activeElement;

    for (const [componentKey, input] of Object.entries(componentInputsRef.current)) {
      input.checked = Boolean(state.components[componentKey]);
    }

    for (const [componentKey, input] of Object.entries(componentAmountInputsRef.current)) {
      const current = state.componentAmounts[componentKey] ?? "";
      if (active !== input) {
        input.value = current;
      }
      input.style.width = inputWidth(current);
    }

    for (const [fieldKey, input] of Object.entries(fieldInputsRef.current)) {
      const current = state.entryFields[fieldKey] ?? "";
      if (active !== input) {
        input.value = current;
      }
      input.style.width = inputWidth(current);
    }

    for (const [stepKey, input] of Object.entries(stepInputsRef.current)) {
      const componentKeys = stepComponentsRef.current[stepKey] ?? [];
      const autoStep = componentKeys.length > 0 ? componentKeys.every((key) => Boolean(state.components[key])) : Boolean(state.stepCompletion[stepKey]);
      input.checked = autoStep;
      input.disabled = readOnly || componentKeys.length > 0;
    }

    for (const [timerKey, controls] of Object.entries(timerControlsRef.current)) {
      const defaultSeconds = timerDefaultsRef.current[timerKey] ?? 60;
      const defaultMode = timerModesRef.current[timerKey] ?? "countdown";
      const timer = state.timers[timerKey] ?? {
        mode: defaultMode,
        total: defaultSeconds,
        remaining: defaultMode === "countdown" ? defaultSeconds : 0,
        running: false,
        locked: false,
        elapsed: 0,
      };
      const mode = timer.mode ?? "countdown";

      controls.value.textContent = formatDuration(timer.remaining);
      if (timer.remaining < 0) {
        controls.container.className =
          "entry-timer inline-flex min-w-[14ch] flex-col gap-1 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-900";
      } else {
        controls.container.className =
          "entry-timer inline-flex min-w-[14ch] flex-col gap-1 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-900";
      }
      controls.startPause.textContent = mode === "longrange" ? (timer.running ? "End" : "Begin") : timer.running ? "Pause" : "Start";
      controls.startPause.disabled = readOnly || (timer.locked && !(mode === "longrange" && timer.running));
      controls.reset.disabled = readOnly || timer.locked;
      controls.lock.textContent = timer.locked ? "Unlock" : "Lock";
      controls.lock.disabled = readOnly;

      if (mode === "countup") {
        controls.elapsed.textContent = "";
      } else {
        controls.elapsed.textContent = `Elapsed: ${formatDuration(timer.elapsed ?? 0)}`;
      }

      if (timer.firstStartedAt) {
        const firstText = new Date(timer.firstStartedAt).toLocaleTimeString();
        if (mode === "longrange" && timer.startedAt) {
          const startText = new Date(timer.startedAt).toLocaleTimeString();
          const endText = timer.endedAt ? new Date(timer.endedAt).toLocaleTimeString() : "";
          controls.stamps.textContent = endText ? `First: ${firstText} | ${startText} - ${endText}` : `First: ${firstText} | Started: ${startText}`;
        } else {
          controls.stamps.textContent = `First start: ${firstText}`;
        }
      } else {
        controls.stamps.textContent = "";
      }
    }
  }, [readOnly]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const startingState = parseState(initialInteractionState);

    componentInputsRef.current = {};
    componentAmountInputsRef.current = {};
    fieldInputsRef.current = {};
    stepInputsRef.current = {};
    timerControlsRef.current = {};
    timerDefaultsRef.current = {};
    timerModesRef.current = {};
    stepTimersRef.current = {};
    stepComponentsRef.current = {};

    container.innerHTML = runBody || "<p></p>";

    container.querySelectorAll<HTMLElement>("[contenteditable]").forEach((node) => {
      node.setAttribute("contenteditable", "false");
    });

    container.querySelectorAll<HTMLElement>("ul[data-type='taskList'], ol[data-type='taskList']").forEach((list) => {
      list.classList.add("step-list");
    });

    const stepElements = Array.from(container.querySelectorAll<HTMLElement>("li[data-type='taskItem']"));
    const stepElementToKey = new Map<HTMLElement, string>();

    stepElements.forEach((stepEl, stepIndex) => {
      stepEl.classList.add("step-item");
      const stepKey = `step-${stepIndex}`;
      stepElementToKey.set(stepEl, stepKey);
      stepTimersRef.current[stepKey] = [];
      stepComponentsRef.current[stepKey] = [];

      const checkbox = stepEl.querySelector<HTMLInputElement>("input[type='checkbox']");
      if (!checkbox) return;
      stepInputsRef.current[stepKey] = checkbox;
      checkbox.disabled = readOnly;
      if (!readOnly) {
        checkbox.addEventListener("change", (event) => {
          const checked = (event.target as HTMLInputElement).checked;
          const componentKeys = stepComponentsRef.current[stepKey] ?? [];
          if (componentKeys.length > 0) {
            setInteraction((prev) => ({
              ...prev,
              stepCompletion: {
                ...prev.stepCompletion,
                [stepKey]: componentKeys.every((key) => Boolean(prev.components[key])),
              },
            }));
            return;
          }
          setInteraction((prev) => {
            const next: InteractionState = {
              ...prev,
              stepCompletion: {
                ...prev.stepCompletion,
                [stepKey]: checked,
              },
              timers: { ...prev.timers },
            };

            if (checked) {
              for (const timerKey of stepTimersRef.current[stepKey] ?? []) {
                const existing = next.timers[timerKey] ?? {
                  mode: "countdown",
                  total: timerDefaultsRef.current[timerKey] ?? 60,
                  remaining: timerDefaultsRef.current[timerKey] ?? 60,
                  running: false,
                  locked: false,
                  elapsed: 0,
                };
                next.timers[timerKey] = {
                  ...existing,
                  running: false,
                  locked: true,
                  alertUntil: undefined,
                  endedAt: existing.endedAt,
                };
              }
            }

            return next;
          });
        });
      }
    });

    container.querySelectorAll<HTMLElement>("span[data-entry-node='component']").forEach((node, index) => {
      const componentKey = `component-${index}`;
      const label = node.getAttribute("label") || "Component";
      const unit = node.getAttribute("unit") || "";
      const attrValue = node.getAttribute("value") || "";

      const parentStep = node.closest<HTMLElement>("li[data-type='taskItem']");
      let stepKey: string | undefined;
      if (parentStep) {
        stepKey = stepElementToKey.get(parentStep);
        if (stepKey) {
          stepComponentsRef.current[stepKey] = [...(stepComponentsRef.current[stepKey] || []), componentKey];
        }
      }

      node.className =
        "entry-component inline-flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900";
      node.textContent = "";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(startingState.components[componentKey]);
      checkbox.disabled = readOnly;
      checkbox.className = "h-3.5 w-3.5";

      if (!readOnly) {
        checkbox.addEventListener("change", (event) => {
          const checked = (event.target as HTMLInputElement).checked;
          setInteraction((prev) => {
            const nextComponents = {
              ...prev.components,
              [componentKey]: checked,
            };

            const nextStepCompletion = { ...prev.stepCompletion };
            if (stepKey) {
              const stepComponentKeys = stepComponentsRef.current[stepKey] ?? [];
              nextStepCompletion[stepKey] = stepComponentKeys.every((key) => Boolean(nextComponents[key]));
            }

            return {
              ...prev,
              components: nextComponents,
              stepCompletion: nextStepCompletion,
            };
          });
        });
      }

      const labelSpan = document.createElement("span");
      labelSpan.className = "font-medium";
      labelSpan.textContent = label;

      const amountInput = document.createElement("input");
      amountInput.value = startingState.componentAmounts[componentKey] ?? attrValue;
      amountInput.placeholder = "value";
      amountInput.className = "min-w-[10ch] rounded border border-emerald-200 bg-white px-2.5 py-1 text-xs text-zinc-900";
      amountInput.readOnly = readOnly;
      amountInput.disabled = readOnly;
      amountInput.style.width = inputWidth(amountInput.value);

      if (!readOnly) {
        amountInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === "Tab") event.preventDefault();
        });

        amountInput.addEventListener("paste", (event) => {
          event.preventDefault();
          const pasted = (event.clipboardData?.getData("text") || "").replace(/[\n\r\t]/g, "");
          const selectionStart = amountInput.selectionStart ?? amountInput.value.length;
          const selectionEnd = amountInput.selectionEnd ?? amountInput.value.length;
          const nextValue = `${amountInput.value.slice(0, selectionStart)}${pasted}${amountInput.value.slice(selectionEnd)}`;
          amountInput.value = nextValue;
          amountInput.style.width = inputWidth(nextValue);
          setInteraction((prev) => ({
            ...prev,
            componentAmounts: {
              ...prev.componentAmounts,
              [componentKey]: nextValue,
            },
          }));
        });

        amountInput.addEventListener("input", (event) => {
          const nextValue = (event.target as HTMLInputElement).value.replace(/[\n\r\t]/g, "");
          amountInput.value = nextValue;
          amountInput.style.width = inputWidth(nextValue);
          setInteraction((prev) => ({
            ...prev,
            componentAmounts: {
              ...prev.componentAmounts,
              [componentKey]: nextValue,
            },
          }));
        });
      }

      componentInputsRef.current[componentKey] = checkbox;
      componentAmountInputsRef.current[componentKey] = amountInput;
      node.appendChild(checkbox);
      node.appendChild(labelSpan);
      node.appendChild(amountInput);
      if (unit) {
        const unitSpan = document.createElement("span");
        unitSpan.textContent = unit;
        node.appendChild(unitSpan);
      }
    });

    if (!readOnly) {
      setInteraction((prev) => {
        const nextStepCompletion = { ...prev.stepCompletion };
        for (const [stepKey, componentKeys] of Object.entries(stepComponentsRef.current)) {
          if (componentKeys.length === 0) continue;
          nextStepCompletion[stepKey] = componentKeys.every((key) => Boolean(prev.components[key]));
        }
        return {
          ...prev,
          stepCompletion: nextStepCompletion,
        };
      });
    }

    container.querySelectorAll<HTMLElement>("span[data-entry-node='measurement']").forEach((node, index) => {
      const fieldKey = `field-${index}`;
      const label = node.getAttribute("label") || "Undefined";
      const unit = node.getAttribute("unit") || "";
      const attrValue = node.getAttribute("value") || "";

      node.className =
        "entry-measurement inline-flex items-center gap-2 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-900";
      node.textContent = "";

      const labelSpan = document.createElement("span");
      labelSpan.className = "font-medium";
      labelSpan.textContent = label;

      const input = document.createElement("input");
      input.value = startingState.entryFields[fieldKey] ?? attrValue;
      input.placeholder = "value";
      input.className = "min-w-[10ch] rounded border border-blue-200 bg-white px-2.5 py-1 text-xs text-zinc-900";
      input.readOnly = readOnly;
      input.disabled = readOnly;
      input.style.width = inputWidth(input.value);

      if (!readOnly) {
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === "Tab") event.preventDefault();
        });

        input.addEventListener("paste", (event) => {
          event.preventDefault();
          const pasted = (event.clipboardData?.getData("text") || "").replace(/[\n\r\t]/g, "");
          const selectionStart = input.selectionStart ?? input.value.length;
          const selectionEnd = input.selectionEnd ?? input.value.length;
          const nextValue = `${input.value.slice(0, selectionStart)}${pasted}${input.value.slice(selectionEnd)}`;
          input.value = nextValue;
          input.style.width = inputWidth(nextValue);
          setInteraction((prev) => ({
            ...prev,
            entryFields: {
              ...prev.entryFields,
              [fieldKey]: nextValue,
            },
          }));
        });

        input.addEventListener("input", (event) => {
          const nextValue = (event.target as HTMLInputElement).value.replace(/[\n\r\t]/g, "");
          input.value = nextValue;
          input.style.width = inputWidth(nextValue);
          setInteraction((prev) => ({
            ...prev,
            entryFields: {
              ...prev.entryFields,
              [fieldKey]: nextValue,
            },
          }));
        });
      }

      fieldInputsRef.current[fieldKey] = input;

      node.appendChild(labelSpan);
      node.appendChild(input);
      if (unit) {
        const unitSpan = document.createElement("span");
        unitSpan.textContent = unit;
        node.appendChild(unitSpan);
      }
    });

    container.querySelectorAll<HTMLElement>("span[data-entry-node='timer']").forEach((node, index) => {
      const timerKey = `timer-${index}`;
      const label = node.getAttribute("label") || "Timer";
      const defaultSeconds = Number(node.getAttribute("seconds") || "60");
      const mode = (node.getAttribute("mode") || "countdown") as "countdown" | "countup" | "longrange";
      timerDefaultsRef.current[timerKey] = defaultSeconds;
      timerModesRef.current[timerKey] = mode;

      const parentStep = node.closest<HTMLElement>("li[data-type='taskItem']");
      if (parentStep) {
        const stepKey = stepElementToKey.get(parentStep);
        if (stepKey) {
          stepTimersRef.current[stepKey] = [...(stepTimersRef.current[stepKey] || []), timerKey];
        }
      }

      node.className =
        "entry-timer inline-flex min-w-[14ch] flex-col gap-1 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-900";
      node.textContent = "";

      const topRow = document.createElement("div");
      topRow.className = "flex items-center gap-2";

      const labelSpan = document.createElement("span");
      labelSpan.className = "font-medium";
      labelSpan.textContent = label;

      const valueSpan = document.createElement("span");
      valueSpan.className = "font-mono";
      valueSpan.textContent = formatDuration(mode === "countup" || mode === "longrange" ? 0 : defaultSeconds);

      const elapsedSpan = document.createElement("span");
      elapsedSpan.className = "text-[11px] opacity-80";

      const stampsSpan = document.createElement("span");
      stampsSpan.className = "text-[11px] opacity-80";

      const buttonRow = document.createElement("div");
      buttonRow.className = "flex items-center gap-1";

      const startPause = document.createElement("button");
      startPause.className = "rounded border border-sky-400 px-2 py-0.5 text-[11px]";
      startPause.textContent = mode === "longrange" ? "Begin" : "Start";
      startPause.disabled = readOnly;
      if (!readOnly) {
        startPause.addEventListener("click", () => {
          setInteraction((prev) => {
            const now = Date.now();
            const existing = prev.timers[timerKey] ?? {
              mode,
              total: defaultSeconds,
              remaining: mode === "countup" || mode === "longrange" ? 0 : defaultSeconds,
              running: false,
              locked: false,
              elapsed: 0,
            };
            if (mode === "longrange" && existing.locked && existing.endedAt) return prev;

            if (mode === "longrange") {
              if (!existing.running) {
                return {
                  ...prev,
                  timers: {
                    ...prev.timers,
                    [timerKey]: {
                      ...existing,
                      mode,
                      running: true,
                      locked: true,
                      startedAt: now,
                      firstStartedAt: existing.firstStartedAt ?? now,
                      endedAt: undefined,
                      remaining: 0,
                      elapsed: 0,
                      alertUntil: undefined,
                    },
                  },
                };
              }

              return {
                ...prev,
                timers: {
                  ...prev.timers,
                    [timerKey]: {
                      ...existing,
                      running: false,
                      locked: true,
                      endedAt: now,
                      elapsed: existing.remaining,
                    },
                },
              };
            }

            return {
              ...prev,
              timers: {
                ...prev.timers,
                [timerKey]: {
                  ...existing,
                  mode,
                  alertUntil: undefined,
                  running: !existing.running,
                  locked: existing.running ? existing.locked : true,
                  startedAt: existing.startedAt ?? now,
                  firstStartedAt: existing.firstStartedAt ?? now,
                },
              },
            };
          });
        });
      }

      const reset = document.createElement("button");
      reset.className = "rounded border border-sky-400 px-2 py-0.5 text-[11px]";
      reset.textContent = "Reset";
      reset.disabled = readOnly;
      if (!readOnly) {
        reset.addEventListener("click", () => {
          const confirmed = window.confirm("Reset timer? Use reset only for accidental clicks.");
          if (!confirmed) return;
          setInteraction((prev) => {
            const existing = prev.timers[timerKey] ?? {
              mode,
              total: defaultSeconds,
              remaining: mode === "countup" || mode === "longrange" ? 0 : defaultSeconds,
              running: false,
              locked: false,
              elapsed: 0,
            };
            if (existing.locked) return prev;
            return {
              ...prev,
              timers: {
                ...prev.timers,
                [timerKey]: {
                  ...existing,
                  mode,
                  remaining: mode === "countup" || mode === "longrange" ? 0 : existing.total,
                  running: false,
                  alertUntil: undefined,
                  startedAt: undefined,
                  firstStartedAt: undefined,
                  endedAt: undefined,
                  elapsed: 0,
                },
              },
            };
          });
        });
      }

      const lock = document.createElement("button");
      lock.className = "rounded border border-sky-400 px-2 py-0.5 text-[11px]";
      lock.textContent = "Lock";
      lock.disabled = readOnly;
      if (!readOnly) {
        lock.addEventListener("click", () => {
          setInteraction((prev) => {
            const existing = prev.timers[timerKey] ?? {
              mode,
              total: defaultSeconds,
              remaining: mode === "countup" || mode === "longrange" ? 0 : defaultSeconds,
              running: false,
              locked: false,
              elapsed: 0,
            };
            return {
              ...prev,
              timers: {
                ...prev.timers,
                [timerKey]: {
                  ...existing,
                  locked: !existing.locked,
                  alertUntil: existing.locked ? existing.alertUntil : undefined,
                },
              },
            };
          });
        });
      }

      timerControlsRef.current[timerKey] = {
        container: node,
        value: valueSpan,
        elapsed: elapsedSpan,
        stamps: stampsSpan,
        startPause,
        reset,
        lock,
      };

      topRow.appendChild(labelSpan);
      topRow.appendChild(valueSpan);
      node.appendChild(topRow);
      node.appendChild(elapsedSpan);
      node.appendChild(stampsSpan);
      buttonRow.appendChild(startPause);
      buttonRow.appendChild(reset);
      buttonRow.appendChild(lock);
      node.appendChild(buttonRow);
    });

  }, [applyInteractionToDom, runBody, initialInteractionState, readOnly]);

  useEffect(() => {
    applyInteractionToDom(interaction);
  }, [interaction, applyInteractionToDom]);

  useEffect(() => {
    if (!Object.values(interaction.timers).some((timer) => timer.running)) return;
    const id = window.setInterval(() => {
      setInteraction((prev) => {
        let changed = false;
        const nextTimers: Record<string, TimerState> = { ...prev.timers };

        for (const [key, timer] of Object.entries(prev.timers)) {
          if (!timer.running) continue;
          const mode = timer.mode ?? "countdown";
          let remaining = timer.remaining;
          let elapsed = timer.elapsed ?? 0;
          let alertUntil = timer.alertUntil;

          if (mode === "countup") {
            remaining = timer.remaining + 1;
          } else if (mode === "longrange") {
            remaining = timer.remaining + 1;
            elapsed = remaining;
          } else {
            remaining = timer.remaining - 1;
            const reachedZero = timer.remaining > 0 && remaining <= 0;
            alertUntil = reachedZero ? Date.now() + 15000 : timer.alertUntil;
            if (remaining < 0) remaining = 0;
            elapsed = timer.total - remaining;
          }

          nextTimers[key] = {
            ...timer,
            mode,
            remaining,
            elapsed,
            alertUntil,
            running: mode === "countdown" && remaining <= 0 ? false : timer.running,
            locked: mode === "countdown" && remaining <= 0 ? true : timer.locked,
            endedAt: mode === "countdown" && remaining <= 0 && !timer.endedAt ? Date.now() : timer.endedAt,
          };
          changed = true;
        }

        return changed ? { ...prev, timers: nextTimers } : prev;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [interaction.timers]);

  useEffect(() => {
    if (readOnly) return;

    const beep = () => {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const context = new AudioCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      window.setTimeout(() => context.close().catch(() => undefined), 250);
    };

    const id = window.setInterval(() => {
      const now = Date.now();
      const activeAlert = Object.values(interaction.timers).some((timer) => Boolean(timer.alertUntil && timer.alertUntil > now));
      if (activeAlert) beep();
    }, 1000);

    return () => window.clearInterval(id);
  }, [interaction.timers, readOnly]);

  const contentClass = useMemo(
    () => "run-protocol-content prose max-w-none rounded border border-zinc-200 bg-white p-4 text-zinc-900",
    []
  );

  return <div ref={containerRef} className={contentClass} />;
}
