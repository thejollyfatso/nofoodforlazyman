import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/apiFetch";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function localDateStr(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

function todayStr() {
  return localDateStr(new Date());
}

function plusDaysStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export function useMealPlan({ contextType, contextId }, token) {
  const [bin, setBin] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const esRef = useRef(null);

  const basePath =
    contextType === "household"
      ? `/households/${contextId}/meal-plan`
      : "/meal-plan";

  const fetchBin = useCallback(async () => {
    if (!contextId) return;
    try {
      const data = await apiFetch(`${basePath}/bin`);
      setBin(data);
    } catch {}
  }, [basePath, contextId]);

  const fetchMeals = useCallback(
    async (start, end) => {
      if (!contextId) return;
      const s = start || todayStr();
      const e = end || plusDaysStr(60);
      try {
        const data = await apiFetch(`${basePath}?start=${s}&end=${e}`);
        setMeals(data);
      } catch {}
    },
    [basePath, contextId]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchBin(), fetchMeals()]);
      setLoading(false);
    }
    load();
  }, [fetchBin, fetchMeals]);

  // Re-fetch bin whenever shopping list changes
  useEffect(() => {
    if (!contextId || !token) return;

    const params =
      contextType === "household"
        ? `?token=${encodeURIComponent(token)}&household_id=${contextId}`
        : `?token=${encodeURIComponent(token)}`;

    const es = new EventSource(`${BASE_URL}/events${params}`);
    esRef.current = es;
    es.addEventListener("shopping_changed", fetchBin);
    es.onerror = () => {};

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [contextType, contextId, token, fetchBin]);

  async function createMeal(body) {
    const meal = await apiFetch(basePath, {
      method: "POST",
      body: JSON.stringify(body),
    });
    await Promise.all([fetchBin(), fetchMeals()]);
    return meal;
  }

  async function updateMeal(mealId, body) {
    const meal = await apiFetch(`${basePath}/${mealId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const refreshes = [fetchMeals()];
    if (body.recipe_ids !== undefined) refreshes.push(fetchBin());
    await Promise.all(refreshes);
    return meal;
  }

  async function deleteMeal(mealId) {
    await apiFetch(`${basePath}/${mealId}`, { method: "DELETE" });
    await fetchMeals();
  }

  return {
    bin,
    meals,
    loading,
    fetchBin,
    fetchMeals,
    createMeal,
    updateMeal,
    deleteMeal,
  };
}
