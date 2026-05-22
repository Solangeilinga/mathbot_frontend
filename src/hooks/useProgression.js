// src/hooks/useProgression.js — Données réelles depuis la BDD
import { useState, useEffect, useCallback } from "react";
import { progressionAPI } from "../utils/api";

const CHAPTER_META = {
  Probabilités:  { sub: "Événements, tirage" },
  Géométrie:     { sub: "Triangles, cercles" },
  Algèbre:       { sub: "Équations, systèmes" },
  Fonctions:     { sub: "Affines, représentation" },
  Statistiques:  { sub: "Moyenne, médiane" },
  Trigonométrie: { sub: "Sin, Cos, Tan" },
};

function getBadge(score) {
  if (score >= 75) return { badge: "Maîtrisé",       badgeClass: "mastered", color: "green"  };
  if (score >= 55) return { badge: "En cours",        badgeClass: "ongoing",  color: "orange" };
  if (score >= 30) return { badge: "À retravailler",  badgeClass: "priority", color: "orange" };
  return              { badge: "Priorité",         badgeClass: "priority", color: "red"    };
}

export function useProgression() {
  const [progression, setProgression] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await progressionAPI.get();
      setProgression(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Enrichit les chapitres avec meta + badge — avec vérification que c'est bien un tableau
  const chapitresRaw = progression?.chapitres;
  const chapitres = Array.isArray(chapitresRaw) 
    ? chapitresRaw.map((ch) => {
        const meta = CHAPTER_META[ch.chapitre] || { sub: "" };
        const { badge, badgeClass, color } = getBadge(ch.score);
        return { ...ch, name: ch.chapitre, ...meta, badge, badgeClass, color };
      })
    : [];

  // Stats calculées depuis les vraies données
  const totalSessions  = chapitres.reduce((acc, c) => acc + (c.sessions || 0), 0);
  const totalExercices = chapitres.reduce((acc, c) => acc + (c.exercices || 0), 0);
  const totalReussites = chapitres.reduce((acc, c) => acc + (c.reussites || 0), 0);
  const scoreGlobal    = totalExercices > 0 ? Math.round(totalReussites * 100 / totalExercices) : 0;
  const chapitresOK    = chapitres.filter((c) => c.score >= 75).length;
  const chapitresKO    = chapitres.filter((c) => c.score < 55).length;

  const stats = [
    { num: String(totalSessions),          label: "Sessions"       },
    { num: `${scoreGlobal}%`,              label: "Score moyen"    },
    { num: String(chapitresOK),            label: "Chapitres OK"   },
    { num: String(chapitresKO),            label: "À retravailler" },
  ];

  return {
    progression,
    chapitres,
    stats,
    xp:     progression?.xp     ?? 0,
    niveau: progression?.niveau ?? 1,
    loading,
    error,
    refetch: fetch,
  };
}