/** Original practice sentences (same set the synthetic typists use in ml/keydna/synth.py). */
export const SENTENCES = [
  "the river bends past the old mill before it reaches the quiet town",
  "she packed a map, two apples and a torch for the long night walk",
  "every system should assume the session it trusts might change hands",
  "a careful engineer writes the test before arguing about the result",
  "clouds gathered over the valley while the farmers finished their work",
  "keep the window open so the evening breeze can cool the room",
  "the library closes early on friday but opens again on sunday morning",
  "he tuned the guitar slowly, listening for the moment the strings agreed",
  "small habits repeated every day become the shape of a whole life",
  "the train was late, so we shared stories on the cold platform",
  "measure twice and cut once is still good advice for most projects",
  "bright lanterns lined the street during the festival of lights",
  "the kettle whistled just as the rain began to tap on the roof",
  "learning a new language starts with listening more than speaking",
  "a password proves who logged in, not who is typing right now",
  "the market sold fresh bamboo shoots, ginger and wild honey",
  "our team met at noon to review the plan and assign the tasks",
  "the mountain road was narrow, steep and full of sharp turns",
  "he wrote the letter by hand because it felt more honest that way",
  "data without context can tell a convincing story that is false",
  "the children raced their paper boats along the flooded lane",
  "please save your work often when the power keeps flickering",
  "a quiet morning and a hot cup of tea make any deadline easier",
  "the museum guide explained how the ancient bridge was built",
  "trust is earned slowly and lost in a single careless moment",
  "she practised the song until her fingers knew it without thought",
  "the forest smelled of pine needles and fresh rain after the storm",
  "good security is layered, like the walls of an old fortress",
];

export function makePrompt(sentences = 5, seed = Math.random()): string {
  const pool = [...SENTENCES];
  let s = Math.floor(seed * 1e9) || 1;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: string[] = [];
  for (let i = 0; i < sentences && pool.length; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  return out.join(" ");
}
