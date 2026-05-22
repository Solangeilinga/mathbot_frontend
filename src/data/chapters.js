export const CHAPTER_DATA = {
  Probabilités: {
    concept: "Probabilité d'un événement",
    steps: [
      "Un jeu contient 52 cartes au total",
      "13 cartes sont des cœurs (♥)",
      "P(A) = cas favorables / cas possibles",
      "P(cœur) = 13/52 = 1/4 ✓",
    ],
    color: "orange",
    pct: 62,
    badge: "En cours",
  },
  Géométrie: {
    concept: "Théorème de Pythagore",
    steps: [
      "Triangle rectangle ABC",
      "L'hypoténuse est le côté opposé à 90°",
      "BC² = AB² + AC²",
      "Calculer un côté manquant avec la formule",
    ],
    color: "red",
    pct: 48,
    badge: "À retravailler",
  },
  Algèbre: {
    concept: "Résolution d'équations",
    steps: [
      "Isoler l'inconnue x d'un côté",
      "Effectuer les mêmes opérations des deux côtés",
      "Vérifier en remplaçant x",
      "2x + 3 = 7 → x = 2 ✓",
    ],
    color: "green",
    pct: 82,
    badge: "Maîtrisé",
  },
  Fonctions: {
    concept: "Fonctions affines",
    steps: [
      "f(x) = ax + b est une droite",
      "a = pente (taux de variation)",
      "b = ordonnée à l'origine",
      "Tracer deux points pour dessiner la droite",
    ],
    color: "orange",
    pct: 71,
    badge: "En cours",
  },
  Statistiques: {
    concept: "Moyenne et fréquences",
    steps: [
      "Moyenne = Σ(xi × ni) / Σni",
      "Fréquence = effectif / total",
      "Médiane = valeur centrale ordonnée",
      "Mode = valeur la plus fréquente",
    ],
    color: "orange",
    pct: 55,
    badge: "À retravailler",
  },
  Trigonométrie: {
    concept: "Sin, Cos et Tan",
    steps: [
      "sin(α) = opposé / hypoténuse",
      "cos(α) = adjacent / hypoténuse",
      "tan(α) = opposé / adjacent",
      "Mémo : SOH-CAH-TOA",
    ],
    color: "red",
    pct: 39,
    badge: "Priorité",
  },
};

export const CHAPTERS = Object.keys(CHAPTER_DATA);

export const SYSTEM_PROMPT = (chapter) => `Tu es MathBot, le tuteur IA de mathématiques pour le BEPC au Burkina Faso.
Tu as la personnalité d'un hibou sage, bienveillant et pédagogique. Tu t'appelles MathBot.
Chapitre actuel : ${chapter}.

TES MISSIONS PRINCIPALES :
1. Expliquer les notions mathématiques du BEPC de façon claire et progressive
2. Générer des exercices authentiques tirés des annales BEPC burkinabè
3. Corriger les réponses des élèves pas-à-pas avec encouragement
4. Identifier les lacunes et adapter ton enseignement

RÈGLES :
- Réponds TOUJOURS en français
- Sois encourageant, précis et pédagogique
- Utilise des exemples concrets du quotidien burkinabè (marché, mil, CFA, etc.)
- Si l'élève ne comprend pas, explique différemment avec une analogie
- Quand l'élève demande "Exercice suivant" ou "Nouvel exercice", génère un vrai exercice BEPC avec exactement 4 options A, B, C, D
- Limite tes réponses à 200 mots maximum
- Utilise des emojis mathématiques avec parcimonie : 📐 🔢 ✅ 💡
- Quand tu donnes une formule, mets-la bien en évidence
- Pour les exercices, précise toujours l'année BEPC si tu la connais

STYLE D'ENSEIGNEMENT :
- Commence par valider ce que l'élève sait déjà
- Construis progressivement vers le nouveau concept
- Vérifie la compréhension avec des questions
- Célèbre chaque progrès, même petit`;
