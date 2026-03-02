export interface NormalizeNameOptions {
  titleCase?: boolean;
  trimWhitespace?: boolean;
  collapseWhitespace?: boolean;
  removeNoise?: boolean;
}

const DEFAULT_OPTIONS: NormalizeNameOptions = {
  titleCase: true,
  trimWhitespace: true,
  collapseWhitespace: true,
  removeNoise: true,
};

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function removeRepeatedPunctuation(text: string): string {
  return text.replace(/([.,!?;:])\1+/g, "$1");
}

function removeNoise(text: string): string {
  let result = text;
  result = result.replace(/[^\w\s'-]/g, " ");
  result = removeRepeatedPunctuation(result);
  result = result.replace(/\s*-\s*/g, "-");
  result = result.replace(/\s*'\s*/g, "'");
  return result;
}

export function normalizeName(
  text: string,
  options: NormalizeNameOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = text;

  if (opts.trimWhitespace) {
    result = result.trim();
  }

  if (opts.collapseWhitespace) {
    result = result.replace(/\s+/g, " ");
  }

  if (opts.removeNoise) {
    result = removeNoise(result);
    result = result.replace(/\s+/g, " ").trim();
  }

  if (opts.titleCase) {
    result = toTitleCase(result);
  }

  return result;
}

export function normalizeInterim(text: string): string {
  return normalizeName(text, {
    titleCase: false,
    trimWhitespace: true,
    collapseWhitespace: true,
    removeNoise: false,
  });
}

export function normalizeFinal(text: string): string {
  return normalizeName(text, {
    titleCase: true,
    trimWhitespace: true,
    collapseWhitespace: true,
    removeNoise: true,
  });
}
