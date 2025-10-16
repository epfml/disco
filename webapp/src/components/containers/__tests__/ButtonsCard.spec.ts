import { mount } from "@vue/test-utils";
import { List } from "immutable";
import { expect, it, vi } from "vitest";
import ButtonsCard from "../ButtonsCard.vue";

it("shows buttons", () => {
  const wrapper = mount(ButtonsCard, {
    props: {
      buttons: List.of(
        ["first", () => {}] as const,
        ["second", () => {}] as const,
        ["third", () => {}] as const,
      ),
    },
  });

  expect(wrapper.findAll("button")).toHaveLength(3);
});

it("triggers action on click", async () => {
  const button = ["click", vi.fn(() => {})] as const;

  const wrapper = mount(ButtonsCard, {
    props: { buttons: List.of(button) },
  });

  await wrapper.get("button").trigger("click");

  expect(button[1]).toHaveBeenCalled();
});
