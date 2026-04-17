const IRREGULARS = {
  leaves: "leaf",
  knives: "knife",
  loaves: "loaf",
  halves: "half",
  shelves: "shelf",
  wolves: "wolf",
  tomatoes: "tomato",
  potatoes: "potato",
  avocados: "avocado",
  mangoes: "mango",
  heroes: "hero",
  echoes: "echo",
};

function singularize(word) {
  if (IRREGULARS[word]) return IRREGULARS[word];
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3) + "f";
  if (word.endsWith("oes") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3)
    return word.slice(0, -1);
  return word;
}

export function normalizeIngredientName(name) {
  if (!name) return "";
  let s = name.toLowerCase().trim();
  s = s.replace(/[^\w\s-]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^(a|an|the)\s+/i, "");
  const words = s.split(" ");
  words[words.length - 1] = singularize(words[words.length - 1]);
  return words.join(" ");
}
