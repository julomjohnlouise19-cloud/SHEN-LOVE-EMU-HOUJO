import { currentUser } from "../store";
import { refreshLab, reserveItem } from "../store/platform";
import type { LabItem, LabOrder } from "../core/platform";
import { button, h, modal, toast } from "./dom";
import { icon, supply } from "./svg";
import { empty, pageHeading } from "./shell";
import { go } from "./actions";

export async function classShopPage() {
  const user = currentUser()!,
    lab = await refreshLab(true);
  let category = "All supplies";
  const grid = h("div", { class: "shop-grid" });
  const page = h(
    "div",
    { class: "page-enter class-shop" },
    pageHeading(
      "LITTLE DISCOVERIES. USEFUL REWARDS.",
      "Your class supply shelf",
      "Earn class credits through saved discoveries, then reserve a little reward.",
      button(
        `My reservations (${lab.orders.length})`,
        () => orders(lab.orders),
        "button outline",
      ),
    ),
    h(
      "section",
      { class: "class-shop-banner" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "A LITTLE EFFORT. A LITTLE TREAT."),
        h("h2", null, "For your next bright idea."),
        h(
          "p",
          null,
          "Your teacher keeps this shelf up to date. Show your claim code at school when collecting a reserved item.",
        ),
      ),
      h(
        "div",
        { class: "class-credit-total" },
        icon("coin", 28),
        h("strong", null, lab.credits),
        h("span", null, "class credits"),
      ),
    ),
    h(
      "div",
      { class: "filter-tabs", "aria-label": "Class supply categories" },
      ...[
        "All supplies",
        ...new Set(lab.items.map((item) => item.category)),
      ].map((value) =>
        button(
          value,
          () => {
            category = value;
            draw();
          },
          "filter-tab",
          { "data-supply-category": value },
        ),
      ),
    ),
    h(
      "div",
      { class: "records-actions" },
      button("Refresh shelf", () => go("/shop"), "button outline"),
    ),
    grid,
    h(
      "p",
      { class: "fine-print" },
      "A reservation saves one item from the class stock. Collection still needs a teacher’s check. Ask a teacher to cancel a reservation if your plans change.",
    ),
  );
  function draw() {
    page
      .querySelectorAll<HTMLElement>("[data-supply-category]")
      .forEach((button) => {
        button.classList.toggle(
          "selected",
          button.dataset.supplyCategory === category,
        );
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.supplyCategory === category),
        );
      });
    const items = lab.items.filter(
      (item) => category === "All supplies" || item.category === category,
    );
    grid.replaceChildren(
      ...items.map((item) =>
        h(
          "article",
          { class: "shop-item paper" },
          h(
            "div",
            { class: `shop-item-art ${item.color}` },
            supply(item.icon),
            h(
              "span",
              { class: "stock-label" },
              item.stock ? `${item.stock} available` : "Restocking soon",
            ),
          ),
          h(
            "div",
            { class: "shop-item-body" },
            h("p", { class: "eyebrow" }, item.category),
            h("h2", null, item.name),
            h("p", { class: "muted" }, item.description),
            h(
              "div",
              { class: "shop-item-footer" },
              h(
                "span",
                { class: "item-price" },
                icon("coin", 18),
                h("strong", null, item.price),
                " credits",
              ),
              button(
                item.stock ? "Reserve" : "Out of stock",
                () => reserve(item),
                "button outline",
                {
                  disabled: !item.stock || !navigator.onLine,
                  "aria-label": `Reserve ${item.name} for ${item.price} credits`,
                },
              ),
            ),
          ),
        ),
      ),
    );
    if (!items.length)
      grid.append(
        empty(
          "cat",
          "Your shelf is getting ready",
          "Your teacher will add class supplies here.",
        ),
      );
  }
  function reserve(item: LabItem) {
    const error = h("p", { class: "form-error", role: "alert" }),
      id = crypto.randomUUID();
    const { close } = modal("A little reward for your effort", [
      h("div", { class: `purchase-preview ${item.color}` }, supply(item.icon)),
      h("h3", { class: "center" }, item.name),
      h(
        "p",
        { class: "center muted" },
        `${item.price} class credits · You have ${lab.credits}`,
      ),
      h(
        "p",
        { class: "notice" },
        "Reserve one item, then show your claim code to your teacher at school. Your class balance and stock update together.",
      ),
      error,
      button(
        `Reserve for ${item.price} credits`,
        async () => {
          error.textContent = "";
          try {
            const order = await reserveItem(item, id);
            if (currentUser()?.id !== user.id) return;
            close();
            orderDetails(order);
            toast("Your reservation is saved.");
          } catch (value) {
            error.textContent =
              value instanceof Error ? value.message : "Please try again.";
          }
        },
        "button primary full",
        { disabled: lab.credits < item.price || !navigator.onLine },
      ),
      lab.credits < item.price
        ? h(
            "p",
            { class: "fine-print" },
            `You need ${item.price - lab.credits} more class credits.`,
          )
        : null,
      button(
        "Review the latest shelf",
        () => {
          close();
          go("/shop");
        },
        "text-button full",
      ),
    ]);
  }
  draw();
  return page;
}
function orders(rows: LabOrder[]) {
  const { close } = modal("Your class reservations", [
    rows.length
      ? h(
          "div",
          { class: "supply-list" },
          ...rows.map((order) =>
            button(
              h(
                "span",
                { class: "supply-row" },
                icon(order.status === "collected" ? "check" : "box", 20),
                h(
                  "span",
                  null,
                  h("strong", null, order.item_name),
                  h("small", null, order.code),
                ),
                h(
                  "span",
                  { class: `status-tag ${order.status}` },
                  order.status,
                ),
              ),
              () => {
                close();
                orderDetails(order);
              },
              "supply-row-button",
            ),
          ),
        )
      : h(
          "p",
          { class: "muted" },
          "Your first little reward is waiting on the shelf.",
        ),
  ]);
}
function orderDetails(order: LabOrder) {
  modal("Your little reward, reserved", [
    h(
      "div",
      { class: "ticket" },
      icon("shop", 30),
      h("h3", null, order.item_name),
      h("strong", { class: "claim-code" }, order.code),
      h("span", { class: `status-tag ${order.status}` }, order.status),
    ),
    h(
      "p",
      { class: "notice" },
      order.status === "reserved"
        ? "Show this code to your teacher at school. They will verify your reservation and record collection."
        : order.status === "collected"
          ? "Your teacher recorded this item as collected."
          : "This reservation was cancelled and its credits returned.",
    ),
    button(
      "Copy claim code",
      async () => {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(order.code);
          toast("Claim code copied.");
        } else toast(`Your code is ${order.code}.`);
      },
      "button outline full",
    ),
  ]);
}
