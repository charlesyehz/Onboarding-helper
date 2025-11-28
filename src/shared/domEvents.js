const DEFAULT_EVENTS = ["input", "change"];

export function applyValue(element, value, { triggerFocus = true } = {}) {
  if (!element) return;

  element.value = value;

  DEFAULT_EVENTS.forEach((type) => {
    const evt = new Event(type, { bubbles: true });
    element.dispatchEvent(evt);
  });

  if (triggerFocus) {
    element.focus?.();
    element.blur?.();
  }
}
