import type { LabOrder } from "../core/platform";
import { pickupLocation, pickupReminder } from "../core/classroom";
import { getLabSnapshot } from "../store/platform";
import { button, h, modal, toast } from "./dom";
import { icon } from "./svg";
export function reservationDetails(order: LabOrder) {
  const location = pickupLocation(getLabSnapshot()?.rules);
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
      "section",
      {
        class: "pickup-instructions",
        "aria-label": "Reservation pickup instructions",
      },
      h(
        "h3",
        null,
        order.status === "reserved" ? "Your next stop" : "Reservation update",
      ),
      h(
        "p",
        null,
        order.status === "reserved"
          ? pickupReminder(order.item_name, location)
          : order.status === "collected"
            ? "Your teacher recorded this item as collected."
            : "This reservation was cancelled and its credits returned.",
      ),
      order.status === "reserved"
        ? h(
            "p",
            { class: "pickup-location" },
            icon("island", 18),
            h("strong", null, location),
          )
        : null,
      order.status === "reserved"
        ? h(
            "small",
            null,
            "Please wait for the teacher to verify your code and hand over the item. Ask your teacher if you need help with collection.",
          )
        : null,
    ),
    button(
      "Copy claim code",
      async () => {
        try {
          if (!navigator.clipboard?.writeText)
            throw new Error("Clipboard unavailable");
          await navigator.clipboard.writeText(order.code);
          toast("Claim code copied.");
        } catch {
          toast(
            `Your claim code is ${order.code}. You can also select it from the ticket.`,
          );
        }
      },
      "button outline full",
    ),
  ]);
}
