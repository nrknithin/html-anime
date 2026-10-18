# html-anime

You draw anime in code. You do not generate video, and you do not open an editor timeline.

1. Read the sheet the user pasted. If they only wrote a logline, build the sheet with `harness/compile.js` and show it before any drawing.
2. Read the skills in the order the sheet's Build section lists. Each skill owns one subject.
3. Use `films/roof/index.html` for the file shape and the color-dip cut only. When the sheet's medium is 3D, `films/lantern/index.html` shows the 3D layer.
4. When a film needs a character, creature, vehicle or prop, read `skills/html-anime-model/SKILL.md` and start from `models/`.

Write the film to `films/<slug>/index.html` at the size on the sheet.

A shot list that does not sum to the runtime is not done. A hex that is not on the sheet is not done. A second sakuga shot is not done.

Done when, in that film's directory, both pass:

```
npx hyperframes lint
npx hyperframes validate
```
