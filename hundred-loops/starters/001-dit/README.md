# Dit

Morse code, two letters a day. The starter app for pattern 001 of Hundred Loops, the streak lesson.

## Run it

In the `starters` folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/001-dit/`.

## Two switches in the address

- `?day=2026-03-04` makes the app believe it is that day, so you can see tomorrow, a missed day, or a long break without waiting.
- `?fresh=1` starts with empty storage.

## What to read first

`app.js`, top to bottom. The regions `streak` and `lesson` are the ones the chapter quotes. `finishDay` never looks at the clock, which is why it can be tested.

## Change these five things before you ship

1. The subject: replace `CODE` and `LESSONS`.
2. The name and the mark.
3. The palette, the type and the drawing.
4. One rule (for example three lessons a week instead of daily).
5. One screen (a course map, a certificate).

Licence: see ../LICENSE.md
