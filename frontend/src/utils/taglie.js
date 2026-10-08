export const SCALA_NUMERICA = ["32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56"];
export const SCALA_LETTERALE = ["4XS", "3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];

export function generaRangeTaglie(tipo, da, a) {
  if (tipo === 'unica') return ["Taglia Unica"];
  const scala = tipo === 'numerica' ? SCALA_NUMERICA : SCALA_LETTERALE;
  const idxDa = scala.indexOf(String(da));
  const idxA = scala.indexOf(String(a));
  if (idxDa === -1 || idxA === -1) return scala;
  const minIdx = Math.min(idxDa, idxA);
  const maxIdx = Math.max(idxDa, idxA);
  return scala.slice(minIdx, maxIdx + 1);
}