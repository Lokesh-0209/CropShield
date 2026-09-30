/**
 * Curated Disease Treatment Advice Database
 * Formulated by agricultural extension specialists for Karnataka crops.
 * All treatments include organic/cultural practices and certified chemical options.
 */

export const DISEASE_TREATMENTS = {
  'Tomato Early Blight': {
    disease: 'Tomato Early Blight',
    pathogen: 'Alternaria solani',
    plainSummary: 'A common fungal infection causing dark brown concentric rings (target spots) on older lower leaves. Spreads quickly after rain.',
    immediateAction: 'Strip and destroy severely infected lower leaves. Avoid overhead watering to prevent water splashing spores onto upper canopy.',
    culturalPractices: [
      'Remove bottom 12 inches of foliage to improve canopy airflow.',
      'Apply 2–3 inches of straw mulch around stem bases to prevent soil splash.',
      'Rotate crops away from solanaceous plants (potatoes, eggplants, peppers) for at least 2 seasons.',
    ],
    recommendedSpray: [
      {
        type: 'Organic / Bio-control',
        name: 'Trichoderma viride / Pseudomonas fluorescens',
        dosage: '5g to 10g per liter of water',
        notes: 'Spray thoroughly in early morning or evening for preventive protection.',
      },
      {
        type: 'Chemical (Curative)',
        name: 'Mancozeb 75% WP or Chlorothalonil 75% WP',
        dosage: '2.0g to 2.5g per liter of water',
        notes: 'Spray at first sign of target spots. Repeat after 10–12 days if damp conditions persist.',
      },
      {
        type: 'Severe Outbreak',
        name: 'Azoxystrobin 18.2% + Difenoconazole 11.4% SC',
        dosage: '1.0 ml per liter of water',
        notes: 'Translaminar systemic protection. Observe standard 7-day pre-harvest interval.',
      },
    ],
  },
  'Tomato Late Blight': {
    disease: 'Tomato Late Blight',
    pathogen: 'Phytophthora infestans',
    plainSummary: 'A fast-moving water mold causing dark water-soaked patches on leaves, white fungal fuzz under damp leaves, and brown fruit rot.',
    immediateAction: 'High urgency! Spores travel miles on wind. Immediately spray contact or systemic fungicide across the entire block.',
    culturalPractices: [
      'Stop overhead sprinkler irrigation immediately; shift to drip lines.',
      'Ensure wide row spacing to allow foliage to dry rapidly after dawn.',
      'Promptly bag and bury rotten fruits; do not compost blighted vines.',
    ],
    recommendedSpray: [
      {
        type: 'Contact Protection',
        name: 'Copper Oxychloride 50% WP',
        dosage: '2.5g to 3.0g per liter of water',
        notes: 'Forms a protective copper barrier against spore germination.',
      },
      {
        type: 'Curative Systemic',
        name: 'Cymoxanil 8% + Mancozeb 64% WP',
        dosage: '2.0g per liter of water',
        notes: 'Apply within 48 hours of infection. Spray both upper and lower leaf surfaces.',
      },
      {
        type: 'Emergency Knockdown',
        name: 'Dimethomorph 50% WP or Metalaxyl-M 4% + Mancozeb 64%',
        dosage: '1.5g to 2.0g per liter of water',
        notes: 'Alternate with different chemical groups to prevent resistance.',
      },
    ],
  },
  'Potato Late Blight': {
    disease: 'Potato Late Blight',
    pathogen: 'Phytophthora infestans',
    plainSummary: 'Aggressive foliar and tuber disease that can wipe out fields within days during cool, humid weather.',
    immediateAction: 'Inspect low-lying areas of the field. Apply high-volume preventive fungicide before canopy closure.',
    culturalPractices: [
      'Hill up soil well around potato rows (ridge farming) to prevent spores washing into underground tubers.',
      'Destroy volunteer potato plants and cull piles near fields.',
      'Harvest tubers only when vine foliage is completely dead and dry.',
    ],
    recommendedSpray: [
      {
        type: 'Preventive',
        name: 'Mancozeb 75% WP',
        dosage: '2.5g per liter of water',
        notes: 'Spray at 7-day intervals when night temperatures are 10–20°C with morning fog.',
      },
      {
        type: 'Curative Treatment',
        name: 'Fenamidone 10% + Mancozeb 50% WG',
        dosage: '2.0g per liter of water',
        notes: 'Rainfast within 2 hours. Provides strong anti-sporulant action.',
      },
    ],
  },
  'Corn Southern Rust': {
    disease: 'Corn Southern Rust',
    pathogen: 'Puccinia polysora',
    plainSummary: 'Small circular golden-orange to cinnamon pustules scattered on upper leaf surfaces, reducing grain filling and stalk strength.',
    immediateAction: 'Assess disease severity and crop stage. Spraying is most beneficial between tassel emergence (VT) and milk stage (R3).',
    culturalPractices: [
      'Plant certified rust-resistant hybrid varieties suited for Karnataka plains.',
      'Avoid high density planting that traps moisture inside the corn canopy.',
      'Maintain balanced potassium (K) fertilizer to strengthen stalk walls.',
    ],
    recommendedSpray: [
      {
        type: 'Curative Fungicide',
        name: 'Azoxystrobin 18.2% + Cyproconazole 7.3% SC',
        dosage: '1.0 ml per liter of water',
        notes: 'Provides both preventive and systemic curative control during grain fill.',
      },
      {
        type: 'Broad Spectrum',
        name: 'Propiconazole 25% EC',
        dosage: '1.0 ml per liter of water',
        notes: 'Apply when orange pustules cover > 5% of ear-leaf area.',
      },
    ],
  },
  'Foliar Blight': {
    disease: 'Foliar Leaf Blight',
    pathogen: 'Alternaria / Cercospora Complex',
    plainSummary: 'General leaf spotting and drying caused by warm, damp weather and plant stress.',
    immediateAction: 'Prune dead foliage and ensure plants are receiving balanced nitrogen and micronutrients.',
    culturalPractices: [
      'Water at root zone using drip irrigation rather than wetting foliage.',
      'Remove weed hosts along field bunds that harbor fungal spores.',
    ],
    recommendedSpray: [
      {
        type: 'Protective Spray',
        name: 'Copper Hydroxide 53.8% DF',
        dosage: '1.5g per liter of water',
        notes: 'Broad-spectrum bactericide and fungicide.',
      },
      {
        type: 'Bio-Fungicide',
        name: 'Neem Oil (Azadirachtin 10,000 ppm)',
        dosage: '3.0 ml to 5.0 ml per liter of water with mild soap',
        notes: 'Safe for pollinators; repels secondary insect vectors.',
      },
    ],
  },
};

/**
 * Get treatment advice for a given disease name, with a safe fallback
 */
export function getTreatmentAdvice(diseaseName) {
  if (!diseaseName) return DISEASE_TREATMENTS['Foliar Blight'];

  // Check exact match
  if (DISEASE_TREATMENTS[diseaseName]) {
    return DISEASE_TREATMENTS[diseaseName];
  }

  // Check partial key match
  const lower = diseaseName.toLowerCase();
  for (const [key, value] of Object.entries(DISEASE_TREATMENTS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  if (lower.includes('tomato') && lower.includes('late')) return DISEASE_TREATMENTS['Tomato Late Blight'];
  if (lower.includes('tomato')) return DISEASE_TREATMENTS['Tomato Early Blight'];
  if (lower.includes('potato')) return DISEASE_TREATMENTS['Potato Late Blight'];
  if (lower.includes('rust') || lower.includes('corn') || lower.includes('maize')) return DISEASE_TREATMENTS['Corn Southern Rust'];

  return DISEASE_TREATMENTS['Foliar Blight'];
}
