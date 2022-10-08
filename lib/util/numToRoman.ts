// https://joshtronic.com/2020/02/17/converting-integers-to-roman-numerals-with-typescript/

export const numToRoman = (original: number): string => {
  if (original < 1 || original > 3999) {
    throw new Error('Input integer limited to 1 through 3,999');
  }

  const numerals = [
    ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'], // 1-9
    ['X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'], // 10-90
    ['C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'], // 100-900
    ['M', 'MM', 'MMM'], // 1000-3000
  ];

  const digits = Math.round(original).toString().split('');
  let position = digits.length - 1;

  return digits.reduce((roman, digit) => {
    if (digit !== '0') roman += numerals[position][+digit - 1];

    position -= 1;

    return roman;
  }, '');
};
