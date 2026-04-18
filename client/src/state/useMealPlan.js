import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function useMealPlan({ contextType, contextId }) {
  const [bin, setBin] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);

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
