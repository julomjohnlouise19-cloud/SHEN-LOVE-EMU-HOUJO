import { APP_NAME, schoolLogo } from "./branding";
export type Child = Node | string | number | false | null | undefined;
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> | null = null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith("on") && typeof value === "function")
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    else if (key === "class") node.className = String(value);
    else if (key === "style" && value && typeof value === "object") {
      for (const [name, styleValue] of Object.entries(value)) {
        if (name.startsWith("--"))
          node.style.setProperty(name, String(styleValue));
        else Object.assign(node.style, { [name]: styleValue });
      }
    } else if (key === "checked" && node instanceof HTMLInputElement)
      node.checked = Boolean(value);
    else if (
      key === "value" &&
      (node instanceof HTMLInputElement ||
        node instanceof HTMLSelectElement ||
        node instanceof HTMLTextAreaElement)
    )
      node.value = String(value);
    else if (key === "disabled" && "disabled" in node)
      (node as HTMLButtonElement).disabled = Boolean(value);
    else if (key.startsWith("aria-") && value !== undefined && value !== null)
      node.setAttribute(key, String(value));
    else if (value !== false && value !== undefined && value !== null)
      node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity) as Child[])
    if (child !== false && child !== null && child !== undefined)
      node.append(
        child instanceof Node ? child : document.createTextNode(String(child)),
      );
  return node;
}
export const text = (value: string) => document.createTextNode(value);
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    link = h("a", { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function button(
  label: Child,
  onClick: () => unknown | Promise<unknown>,
  className = "button",
  props: Record<string, unknown> = {},
) {
  const el = h("button", { type: "button", class: className, ...props }, label);
  let busy = false;
  el.addEventListener("click", () => {
    if (busy) return;
    try {
      const result = onClick();
      if (result instanceof Promise) {
        busy = true;
        const wasDisabled = el.disabled;
        el.disabled = true;
        el.setAttribute("aria-busy", "true");
        void result
          .catch((e) =>
            toast(e instanceof Error ? e.message : "Please try again."),
          )
          .finally(() => {
            busy = false;
            el.removeAttribute("aria-busy");
            if (el.isConnected)
              el.disabled =
                el.dataset.desiredDisabled === undefined
                  ? wasDisabled
                  : el.dataset.desiredDisabled === "true";
          });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Please try again.");
    }
  });
  return el;
}
export function setButtonDisabled(
  button: HTMLButtonElement,
  disabled: boolean,
) {
  button.dataset.desiredDisabled = String(disabled);
  button.disabled = disabled || button.hasAttribute("aria-busy");
}
let toastHost: HTMLElement | null = null;
function releaseToasts(dialog: HTMLDialogElement) {
  const host = toastHost ?? document.querySelector<HTMLElement>("#toasts");
  if (host && dialog.contains(host)) {
    document.body.append(host);
    host.classList.remove("inside-dialog");
  }
}
export function toast(
  message: string,
  action?: { text: string; run: () => void },
) {
  const el = h(
    "div",
    { class: "toast" },
    h("span", null, message),
    action ? button(action.text, action.run, "text-button") : null,
  );
  toastHost ??= document.querySelector<HTMLElement>("#toasts");
  if (!toastHost) return;
  const activeDialog = [
    ...document.querySelectorAll<HTMLDialogElement>("dialog[open]"),
  ].at(-1);
  if (activeDialog) {
    activeDialog.append(toastHost);
    toastHost.classList.add("inside-dialog");
  } else {
    document.body.append(toastHost);
    toastHost.classList.remove("inside-dialog");
  }
  toastHost.append(el);
  if (activeDialog) el.scrollIntoView({ block: "nearest" });
  setTimeout(() => el.remove(), 7000);
}
export function modal(title: string, content: Child[], wide = false) {
  const dialog = h("dialog", {
    class: `modal ${wide ? "wide" : ""}`,
    "aria-label": title,
  });
  const close = () => {
    releaseToasts(dialog);
    dialog.close();
    dialog.remove();
  };
  dialog.append(
    h(
      "div",
      { class: "modal-chrome" },
      h(
        "div",
        { class: "modal-heading" },
        h(
          "div",
          { class: "modal-identity" },
          schoolLogo(),
          h(
            "div",
            null,
            h("p", { class: "modal-brand-name" }, APP_NAME),
            h("h2", null, title),
          ),
        ),
        button("Close ×", close, "icon-button close", {
          "aria-label": "Close dialog",
        }),
      ),
      button("← Close and return", close, "dialog-back", {
        "aria-label": "Close and return to page",
      }),
    ),
    ...content.filter(
      (c): c is Node | string => c instanceof Node || typeof c === "string",
    ),
  );
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    releaseToasts(dialog);
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close };
}
export const field = (label: string, input: HTMLElement, help?: string) => {
  if (
    input.matches("input,select,textarea") &&
    !input.hasAttribute("aria-label")
  )
    input.setAttribute("aria-label", label);
  return h(
    "label",
    { class: "field" },
    h("span", null, label),
    input,
    help ? h("small", null, help) : null,
  );
};
export const input = (
  name: string,
  placeholder = "",
  value = "",
  type = "text",
) =>
  h("input", {
    name,
    type,
    placeholder,
    value,
    required: true,
    autocomplete: type === "password" ? "current-password" : "off",
  });
export function progress(value: number, label: string, className = "") {
  return h(
    "div",
    {
      class: `progress ${className}`,
      role: "progressbar",
      "aria-label": label,
      "aria-valuenow": Math.min(100, Math.round(value)),
      "aria-valuemin": 0,
      "aria-valuemax": 100,
    },
    h("span", { style: { width: `${Math.min(100, Math.max(0, value))}%` } }),
  );
}
