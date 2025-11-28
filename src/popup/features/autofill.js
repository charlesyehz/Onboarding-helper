export async function injectPersonaFields(tabId, fields = []) {
  if (!tabId || !fields.length) return;

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["testlib.dom.umd.js"],
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: fillFields,
    args: [fields],
  });
}

function fillFields(fields) {
  const testingLibrary = window.TestingLibraryDom;
  if (!testingLibrary?.getByRole) {
    console.error("[Autofill] Testing Library DOM is unavailable.");
    return;
  }

  const { getByRole } = testingLibrary;

  fields.forEach(({ role, name, value }) => {
    try {
      const element = getByRole(document.body, role, { name });
      element.value = value;

      ["input", "change"].forEach((type) => {
        const event = new Event(type, { bubbles: true });
        element.dispatchEvent(event);
      });

      console.log(`[Autofill] Filled "${name}" with "${value}"`);
    } catch (error) {
      console.error(`[Autofill] Failed to fill "${name}"`, error);
    }
  });
}
