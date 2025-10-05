// Function to sort class names logically (e.g., VII-A, VII-B, VIII-A)
export const sortKelas = (a: string, b: string): number => {
  const romanMap: { [key: string]: number } = {
    I: 1, V: 5, X: 10,
  };

  const romanToInt = (s: string): number => {
    let result = 0;
    for (let i = 0; i < s.length; i++) {
      const current = romanMap[s[i]];
      const next = romanMap[s[i + 1]];
      if (next && current < next) {
        result -= current;
      } else {
        result += current;
      }
    }
    return result;
  };

  const parseKelas = (kelas: string): { level: number, name: string } => {
    const match = kelas.match(/^([IVX]+|[0-9]+)[\s-]*([A-Z0-9]+)/i);
    if (!match) return { level: 99, name: kelas }; // Fallback for unmatched formats

    const levelStr = match[1];
    const name = match[2].toUpperCase();

    let level: number;
    if (isNaN(Number(levelStr))) {
      // It's a Roman numeral
      level = romanToInt(levelStr.toUpperCase());
    } else {
      // It's a regular number
      level = parseInt(levelStr, 10);
    }

    return { level, name };
  };

  const classA = parseKelas(a);
  const classB = parseKelas(b);

  if (classA.level !== classB.level) {
    return classA.level - classB.level;
  }

  return classA.name.localeCompare(classB.name);
};
