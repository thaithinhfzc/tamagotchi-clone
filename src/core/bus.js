// Core → UI notifications. The simulation never touches the DOM; it emits events and the UI decides
// how to present them (toast, sound, flash). captureEvents() collects instead of dispatching (offline catch-up).
const handlers = new Set();
let captured = null;

export function onEvent(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export function emit(type, arg) {
  if (captured) { captured.push([type, arg]); return; }
  for (const h of handlers) h(type, arg);
}

export function captureEvents(fn) {
  const prev = captured;
  captured = [];
  try { fn(); return captured; } finally { captured = prev; }
}
