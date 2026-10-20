// ============================================================================
// SCALE BASE
// ============================================================================
export const TAGLIA_UNICA = ["Taglia Unica"];
export const TAGLIE_SHORTS_UNISEX = ["4XS", "3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];

// T-shirt unisex: da 4XS a 3XL (condivisa tra Nuoto e Pallanuoto)
export const TAGLIE_TSHIRT_UNISEX_JUNIOR = ["XS", "S", "M", "L", "XL"];
export const TAGLIE_TSHIRT_UNISEX = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
export const TAGLIE_TSHIRT_UNISEX_COMPLETO = [
  ...TAGLIE_TSHIRT_UNISEX_JUNIOR.map(t => `Junior ${t}`),
  ...TAGLIE_TSHIRT_UNISEX.map(t => `${t}`)
];

// Settore Pallanuoto
export const TAGLIE_PN_COSTUME_UOMO = ["36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56"];
export const TAGLIE_PN_COSTUME_DONNA_JUNIOR = ["36", "38"];
export const TAGLIE_PN_COSTUME_DONNA = ["40", "42", "44", "46", "48", "50", "52", "54"];
export const TAGLIE_PN_COSTUME_DONNA_COMPLETO = [
  ...TAGLIE_PN_COSTUME_DONNA_JUNIOR.map(t => `Junior ${t}`),
  ...TAGLIE_PN_COSTUME_DONNA.map(t => `${t}`)
];

// Settore Nuoto
export const TAGLIE_NUOTO_COSTUME_UOMO = ["34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54"];
export const TAGLIE_NUOTO_COSTUME_DONNA_JUNIOR = ["34", "36", "38"];
export const TAGLIE_NUOTO_COSTUME_DONNA = ["38", "40", "42", "44", "46", "48"];
export const TAGLIE_NUOTO_COSTUME_DONNA_COMPLETO = [
  ...TAGLIE_NUOTO_COSTUME_DONNA_JUNIOR.map(t => `Junior ${t}`),
  ...TAGLIE_NUOTO_COSTUME_DONNA.map(t => `${t}`)
];

// ============================================================================
// REGISTRO DEGLI ARTICOLI (UN SOLO ELEMENTO PER ARTICOLO)
// ============================================================================

export const OPZIONI_SCALE_PALLANUOTO = [
  {
    id: "pn_calotta_maschile",
    label: "Calotta Maschile (Taglia Unica)",
    sezioni: { "Unica": TAGLIA_UNICA },
    taglie: TAGLIA_UNICA
  },
  {
    id: "pn_calotta_femminile",
    label: "Calotta Femminile (Taglia Unica)",
    sezioni: { "Unica": TAGLIA_UNICA },
    taglie: TAGLIA_UNICA
  },
  {
    id: "pn_zaino",
    label: "Zaino (Taglia Unica)",
    sezioni: { "Unica": TAGLIA_UNICA },
    taglie: TAGLIA_UNICA
  },
  {
    id: "pn_costume_uomo",
    label: "Costume Uomo (36 — 56)",
    sezioni: { "Uomo": TAGLIE_PN_COSTUME_UOMO },
    taglie: TAGLIE_PN_COSTUME_UOMO
  },
  {
    id: "pn_costume_donna",
    label: "Costume Donna (Junior 36-38 + 40-54)",
    sezioni: {
      "Junior": TAGLIE_PN_COSTUME_DONNA_JUNIOR,
      "Donna": TAGLIE_PN_COSTUME_DONNA
    },
    taglie: TAGLIE_PN_COSTUME_DONNA_COMPLETO
  },
  {
    id: "pn_tshirt",
    label: "Tshirt (Junior XS-XL + XS—3XL)",
    sezioni: {
      "Junior": TAGLIE_TSHIRT_UNISEX_JUNIOR,
      "Senior": TAGLIE_TSHIRT_UNISEX
    },
    taglie: TAGLIE_TSHIRT_UNISEX_COMPLETO
  },
  {
    id: "pn_shorts",
    label: "Shorts (4XS — 3XL)",
    sezioni: { "Shorts": TAGLIE_SHORTS_UNISEX },
    taglie: TAGLIE_SHORTS_UNISEX
  }
];

export const OPZIONI_SCALE_NUOTO = [
  {
    id: "nuoto_zaino",
    label: "Zaino (Taglia Unica)",
    sezioni: { "Unica": TAGLIA_UNICA },
    taglie: TAGLIA_UNICA
  },
  {
    id: "nuoto_costume_uomo",
    label: "Costume Uomo (34 — 54)",
    sezioni: { "Uomo": TAGLIE_NUOTO_COSTUME_UOMO },
    taglie: TAGLIE_NUOTO_COSTUME_UOMO
  },
  {
    id: "nuoto_costume_donna",
    label: "Costume Donna (Junior 34-38 + 38-48)",
    sezioni: {
      "Junior": TAGLIE_NUOTO_COSTUME_DONNA_JUNIOR,
      "Donna": TAGLIE_NUOTO_COSTUME_DONNA
    },
    taglie: TAGLIE_NUOTO_COSTUME_DONNA_COMPLETO
  },
  {
    id: "nuoto_tshirt",
    label: "Tshirt (Junior XS-XL + XS—3XL)",
    sezioni: {
      "Junior": TAGLIE_TSHIRT_UNISEX_JUNIOR,
      "Senior": TAGLIE_TSHIRT_UNISEX
    },
    taglie: TAGLIE_TSHIRT_UNISEX_COMPLETO
  },
  {
    id: "nuoto_shorts",
    label: "Shorts (4XS — 3XL)",
    sezioni: { "Shorts": TAGLIE_SHORTS_UNISEX },
    taglie: TAGLIE_SHORTS_UNISEX
  }
];

export const TUTTE_LE_SCALE = [
  ...OPZIONI_SCALE_PALLANUOTO,
  ...OPZIONI_SCALE_NUOTO.filter(n => !OPZIONI_SCALE_PALLANUOTO.some(p => p.id === n.id))
];

export function getOpzioniScaleSettore(settore = 'pallanuoto') {
  return (settore || '').toLowerCase() === 'nuoto' 
    ? OPZIONI_SCALE_NUOTO 
    : OPZIONI_SCALE_PALLANUOTO;
}

export function getInfoScalaById(scalaId) {
  return TUTTE_LE_SCALE.find(item => item.id === scalaId) || OPZIONI_SCALE_PALLANUOTO[0];
}

export function getTaglieByScalaId(scalaId) {
  const opzione = TUTTE_LE_SCALE.find(item => item.id === scalaId);
  return opzione ? [...opzione.taglie] : [...TAGLIA_UNICA];
}