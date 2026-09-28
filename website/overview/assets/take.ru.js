await recordTake({ output: "captures/board.ru.webm", theme: "midnight",
  prepare: (page) => page.goto(app) }, async (take) => {
  await take.withFocus(page.locator("#task"), async () => {
    await take.type(page.locator("#task"), "Снять ролик к релизу");
    await take.press(page.locator("#task"), "Enter");
  });
  await take.mark("added", card);
  await take.click(card.getByRole("button", { name: "Готово" }));
  await take.mark("done", doneCard);
});
