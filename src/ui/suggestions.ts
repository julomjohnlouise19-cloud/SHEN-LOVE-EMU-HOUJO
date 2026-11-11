import { currentUser } from "../store";
import { cloudEnabled } from "../store/cloud";
import { decks, deckById } from "../data/catalog";
import {
  suggestionService,
  suggestionInbox,
  sendSuggestion,
  replySuggestion,
  loadSuggestionDraft,
  saveSuggestionDraft,
} from "../store/suggestions";
import type { Suggestion, SuggestionDraft } from "../core/suggestions";
import {
  h,
  button,
  input,
  field,
  modal,
  toast,
  setButtonDisabled,
  download,
} from "./dom";
import { mascot } from "./svg";
let mounted: { scope: string; node: HTMLElement } | undefined;
const labels = { new: "Received", reviewing: "Under review", done: "Resolved" };
export async function suggestionsPage(teacher = false) {
  const user = currentUser()!;
  if (teacher && user.role !== "admin")
    return h(
      "div",
      { class: "notice" },
      "Teacher access is needed to open the class inbox.",
    );
  const scope = `${user.id}:${teacher}:${location.hash.split("?")[1] ?? ""}`;
  if (mounted?.scope === scope) return mounted.node;
  const page = h("div", { class: "suggestions-page page-enter" });
  const history = h("div", { class: "suggestion-history" }),
    status = h("p", { role: "status", class: "suggestion-service" });
  let offset = 0,
    total = 0,
    filter = "all",
    available = false;
  const search = h(
    "select",
    { "aria-label": "Suggestion status" },
    ...Object.entries({ all: "All suggestions", ...labels }).map(([v, label]) =>
      h("option", { value: v }, label),
    ),
  );
  search.addEventListener("change", () => {
    filter = search.value;
    offset = 0;
    void load();
  });
  page.append(
    h(
      "div",
      { class: "suggestion-hero" },
      mascot(teacher ? "flask" : "cat"),
      h(
        "div",
        null,
        h(
          "p",
          { class: "eyebrow" },
          teacher
            ? "LISTEN. RESPOND. MAKE THE LAB BETTER."
            : "LITTLE IDEAS CAN GROW INTO BIG CHANGES",
        ),
        h(
          "h1",
          null,
          teacher
            ? "Your classroom suggestion inbox"
            : "A little box for bright ideas",
        ),
        h(
          "p",
          null,
          teacher
            ? "Review each idea, explain your decision and let its author see your reply."
            : "Suggest an improvement, ask about a card or tell us what felt confusing. Your message is private to you and your teachers.",
        ),
      ),
    ),
  );
  page.append(
    h(
      "p",
      { class: "notice" },
      cloudEnabled
        ? "Teachers can see your name, class and message. Please leave out passwords, private contact details and sensitive personal information."
        : "Practice inbox · Messages stay in this browser and can be reviewed by the local demo admin.",
    ),
    status,
  );
  let send: HTMLButtonElement | undefined;
  if (!teacher) {
    const draft = await loadSuggestionDraft();
    const params = new URLSearchParams(location.hash.split("?")[1]);
    const title = input(
      "suggestion-title",
      "A short, helpful title",
      draft?.title ?? "",
    );
    title.minLength = 3;
    title.maxLength = 80;
    const message = h(
      "textarea",
      {
        rows: 5,
        minlength: 10,
        maxlength: 1500,
        required: true,
        placeholder: "What happened, or what would you love to improve?",
      },
      draft?.message ?? "",
    );
    const category = h(
      "select",
      null,
      ...[
        ["idea", "A bright idea"],
        ["question", "A science question"],
        ["problem", "Something needs fixing"],
      ].map(([v, label]) =>
        h(
          "option",
          { value: v, selected: v === (draft?.category ?? "idea") },
          label,
        ),
      ),
    );
    const deck = h(
      "select",
      null,
      h("option", { value: "" }, "The whole website"),
      ...decks.map((d) =>
        h(
          "option",
          {
            value: d.id,
            selected: d.id === (params.get("deck") ?? draft?.deck),
          },
          d.name,
        ),
      ),
    );
    let question = params.get("question") ?? draft?.question ?? "";
    const count = h("small", { class: "suggestion-count", role: "status" });
    let request = draft?.requestId ?? crypto.randomUUID();
    const value = (): SuggestionDraft => ({
      requestId: request,
      category: category.value,
      title: title.value,
      message: message.value,
      deck: deck.value,
      question,
    });
    const error = h("p", { class: "form-error", role: "alert" });
    const update = () => {
      count.textContent = `${message.value.length} / 1500 characters`;
    };
    message.addEventListener("input", () => {
      request = crypto.randomUUID();
      update();
    });
    title.addEventListener("input", () => {
      request = crypto.randomUUID();
    });
    category.addEventListener("change", () => {
      request = crypto.randomUUID();
    });
    deck.addEventListener("change", () => {
      question = "";
      request = crypto.randomUUID();
    });
    update();
    send = button("Send to my teachers", () => undefined, "button primary", {
      type: "submit",
      disabled: true,
    });
    const form = h(
      "form",
      {
        class: "suggestion-form paper",
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          if (send!.disabled) return;
          setButtonDisabled(send!, true);
          send!.setAttribute("aria-busy", "true");
          error.textContent = "";
          try {
            await saveSuggestionDraft(value());
            await sendSuggestion(value(), request);
            if (currentUser()?.id !== user.id) return;
            await saveSuggestionDraft({
              category: "idea",
              title: "",
              message: "",
              deck: "",
              question: "",
            });
            title.value = "";
            message.value = "";
            question = "";
            request = crypto.randomUUID();
            update();
            toast(
              cloudEnabled
                ? "Your suggestion reached the teacher inbox."
                : "Your suggestion is saved in the practice inbox.",
            );
            await load();
          } catch (e) {
            error.textContent =
              e instanceof Error
                ? e.message
                : "Your message could not be sent. Save a draft and try again.";
          } finally {
            send!.removeAttribute("aria-busy");
            setButtonDisabled(send!, !available);
          }
        },
      },
      h("h2", null, "Plant your idea"),
      field("What would you like to share?", category),
      field("Suggestion title", title),
      field("About this science deck", deck),
      question
        ? h("p", { class: "source-identity" }, `About card ${question}`)
        : null,
      field("Your suggestion", message),
      count,
      error,
      h(
        "div",
        { class: "suggestion-actions" },
        send,
        button(
          "Save draft on this device",
          async () => {
            await saveSuggestionDraft(value());
            toast("Draft saved on this device. It has not been sent.");
          },
          "button outline",
        ),
      ),
    );
    page.append(form);
  }
  page.append(
    h(
      "div",
      { class: "suggestion-toolbar" },
      h(
        "h2",
        null,
        teacher ? "Class ideas & replies" : "Your ideas & teacher replies",
      ),
      search,
      button("Refresh suggestions", () => load(), "button outline"),
    ),
    history,
  );
  async function load() {
    history.replaceChildren(
      h("p", { role: "status" }, "Opening the idea box…"),
    );
    try {
      available = await suggestionService();
      if (!page.isConnected || currentUser()?.id !== user.id) return;
      if (send) setButtonDisabled(send, !available);
      if (!available) {
        status.textContent =
          cloudEnabled && user.id === "guest"
            ? "Sign in to share with classroom teachers. You can save a guest draft on this device."
            : "The class inbox is waiting for its service update. You can save a draft here; it has not been delivered. Ask the site owner to activate the inbox, then refresh.";
        history.replaceChildren();
        return;
      }
      status.textContent = "";
      const result = await suggestionInbox(teacher, filter, offset);
      if (currentUser()?.id !== user.id) return;
      total = result.total;
      history.replaceChildren(
        ...result.rows.map((row) =>
          h(
            "article",
            { class: "suggestion-note" },
            h(
              "div",
              { class: "suggestion-note-head" },
              h(
                "span",
                { class: `suggestion-tag ${row.status}` },
                labels[row.status],
              ),
              h(
                "small",
                null,
                new Date(row.created_at).toLocaleDateString("en-PH"),
              ),
            ),
            h("h3", null, row.title),
            teacher ? h("p", { class: "muted" }, row.display_name) : null,
            row.deck
              ? h(
                  "p",
                  { class: "source-identity" },
                  deckById(row.deck)?.name ?? row.deck,
                )
              : null,
            h("p", { class: "suggestion-message" }, row.message),
            row.reply
              ? h(
                  "div",
                  { class: "teacher-reply" },
                  h("strong", null, "A reply from your teacher"),
                  h("p", null, row.reply),
                )
              : h(
                  "p",
                  { class: "muted" },
                  "Your idea is waiting for a teacher reply.",
                ),
            teacher
              ? button("Review & reply", () => review(row), "button outline")
              : null,
          ),
        ),
      );
      if (!result.rows.length)
        history.append(
          h(
            "div",
            { class: "suggestion-empty" },
            mascot("sprout"),
            h("h3", null, "A little space for your next idea"),
            h("p", null, "Matching suggestions and replies will appear here."),
          ),
        );
      history.append(
        h(
          "nav",
          { "aria-label": "Suggestion pages", class: "suggestion-pagination" },
          button(
            "Previous suggestions",
            () => {
              offset = Math.max(0, offset - 20);
              return load();
            },
            "button outline",
            { disabled: offset === 0 },
          ),
          h(
            "span",
            null,
            `${total ? offset + 1 : 0}–${Math.min(offset + 20, total)} of ${total}`,
          ),
          button(
            "Next suggestions",
            () => {
              offset += 20;
              return load();
            },
            "button outline",
            { disabled: offset + 20 >= total },
          ),
        ),
      );
      if (teacher && result.rows.length)
        history.append(
          button(
            "Download this inbox page",
            () =>
              download(
                "cozy-suggestions.json",
                JSON.stringify(result.rows, null, 2),
              ),
            "text-button",
          ),
        );
    } catch (e) {
      history.replaceChildren(
        h(
          "p",
          { class: "form-error", role: "alert" },
          e instanceof Error
            ? e.message
            : "The inbox needs a moment. Refresh to try again.",
        ),
      );
    }
  }
  function review(row: Suggestion) {
    const state = h(
      "select",
      null,
      ...Object.entries(labels).map(([v, label]) =>
        h("option", { value: v, selected: v === row.status }, label),
      ),
    );
    const reply = h(
      "textarea",
      {
        rows: 5,
        maxlength: 600,
        placeholder: "Let the student know what happens next.",
      },
      row.reply,
    );
    const error = h("p", { class: "form-error", role: "alert" });
    const save = button(
      "Save suggestion reply",
      () => undefined,
      "button primary",
      { type: "submit" },
    );
    const { close } = modal(
      "A thoughtful reply",
      [
        h(
          "form",
          {
            onSubmit: async (e: SubmitEvent) => {
              e.preventDefault();
              if (save.disabled) return;
              setButtonDisabled(save, true);
              error.textContent = "";
              try {
                await replySuggestion(row, state.value, reply.value);
                close();
                toast("Your reply is saved for the student.");
                await load();
              } catch (value) {
                error.textContent =
                  value instanceof Error
                    ? value.message
                    : "Please refresh and try again.";
              } finally {
                setButtonDisabled(save, false);
              }
            },
          },
          h("h3", null, row.title),
          h("p", { class: "suggestion-message" }, row.message),
          field("Suggestion progress", state),
          field("Reply to the student", reply),
          h("div", { class: "teacher-edit-actions" }, error, save),
        ),
      ],
      true,
    );
  }
  setTimeout(() => {
    void load();
  }, 0);
  mounted = { scope, node: page };
  return page;
}
