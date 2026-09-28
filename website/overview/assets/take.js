await recordTake({ output: "captures/board.webm", theme: "midnight",
  prepare: (page) => page.goto(app) }, async (take) => {
  await take.withFocus(page.locator("#task"), async () => {
    await take.type(page.locator("#task"), "Record the release film");
    await take.press(page.locator("#task"), "Enter");
  });
  await take.mark("added", card);
  await take.click(card.getByRole("button", { name: "Done" }));
  await take.mark("done", doneCard);
});
