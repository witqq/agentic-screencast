# Pronunciation without changing the screen text

Prepare speech for the chosen language and engine while keeping exact identifiers,
file paths and API names in visible code and captions. A technical term that sounds
wrong or ambiguous needs a domain dictionary entry; a sentence needing a different
spoken construction needs a complete explicit spoken variant. Do this during scenario
writing, before paid synthesis. Agree the voice once; routine term corrections do not
need individual approval.

## Choose the preparation

Use a `say` dictionary for repeated terms. Put it in the film's `pronounce` header,
as an inline object or a JSON file relative to the scenario:

```markdown
pronounce: {"say":{"CanvasStage":"канвас стейдж","advance":"эдванс","getSlideRenderId":"гет слайд рендер ай ди"}}
```

These spellings are illustrative author choices. Select pronunciation for the actual
audience and engine. Prefer whole identifiers to mechanical CamelCase splitting or
letter transliteration: a generic `ru-latin` table cannot know the intended reading of
an API name. `ru-abbr` handles common abbreviations without transliterating all Latin
words. Domain terms belong to the scenario's rules, not to the tool's generic sets.
`schema pronounce` describes `say`, `translit`, `drop`, `cleanup`, `script`, `order`
and `caseSensitive`. Dictionary matching respects Unicode letter/digit boundaries
and tries longer keys first. Case matching is insensitive unless requested otherwise.

Use a `~` line inside the same paragraph for a complete spoken variant:

```markdown
CanvasStage вызывает advance и затем getSlideRenderId.
~ Канвас стейдж вызывает эдванс, затем получает идентификатор отрисовки слайда.
```

A blank line ends the beat. The variant replaces the whole spoken paragraph, not
just the preceding word; it bypasses every dictionary for that beat. Keep its claim
and operation order equivalent to the original. Explain the operation in ordinary
Russian when repeating an English name adds no understanding, while leaving the exact
name visible beside the actual code.

## Preview before synthesis

```sh
agentic-screencast script --source story.md --speech --json
agentic-screencast schema pronounce
```

The preview returns `scenes[].id` and `beats[]` with `anchor`, original `text`, prepared
`speech`, `preparation` and `spokenCharacters`. It neither invokes an engine nor writes
an audio cache. `--voice-json` replaces the scenario's voice just as it does for build;
use the same override when checking voice-specific rules. Plain `script` keeps printing
the authored scenario. Previewing is an available tool, not an additional approval gate.

Precedence is explicit beat `speech`, then rules named by `voice.rules`, then the film's
`pronounce`. Voice rules replace film rules rather than merging them. Without rules the
original text goes to synthesis. Missing dictionary files fail; paths are resolved from
the scenario directory, independent of the command's working directory.

## Keep meaning, timing and cache identity

Prepared speech does not create or remove beats. `b2` and `b2.end` still address the same
second paragraph. Final starts and ends come from the measured duration of its prepared
audio; captions and exported SRT use the original `text`. Anchor a visible operation to
the beat that actually describes it, and to its start/end or a purposeful offset. A
pronunciation change can change duration; fixed seconds must be reconsidered.

The audio cache key uses the effective synthesis string, voice data and a non-empty
engine fingerprint. A changed dictionary entry invalidates affected beats when their
speech changes. An unused addition to the header dictionary preserves their audio
keys. Do not move the entire dictionary into voice data merely to configure it:
changes to `voice.rules` also change voice identity. Transport pauses and retries belong
in the environment. Reuse the same cache; never delete paid audio for a pronunciation
check. `build --keys-only` still synthesizes missing audio, so use explicit `stub` for
free implementation checks.

`frames`, lint and the recording length guide use estimated timing, not measured audio;
a preview's character count does not promise a duration. Karaoke distributes a beat's
measured duration across the written words by length, without word-level recognition.
When the spoken expansion has different words or counts, prefer `subtitle` to a karaoke
highlight claiming exact alignment. Screen annotations should explain the operation
without sound and remain shorter than a verbatim transcript.

## Negative examples

Replacing `CanvasStage` with phonetic Russian in a code fence changes the displayed
identifier and makes the code harder to locate. Keep the original code and use `say`
or a same-paragraph `~` variant for speech.

Writing only `~ эдванс` under a full paragraph makes the engine speak only that word.
Write the complete variant or use the dictionary for the single term.

Assigning a code focus to `b2` because it is the second beat can accent the wrong method.
Choose the actual operation's beat; pronunciation preparation preserves that identity,
it does not infer semantic synchronization.

The preparation and cache contracts are implemented in `src/speech.ts`,
`src/speech-plan.ts`, `src/build.ts` and `src/voice/index.ts`.
