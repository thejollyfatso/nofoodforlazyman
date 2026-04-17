import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { useToast, Toast } from "../components/Toast";

const s = {
  page: {
    minHeight: "100dvh",
    background: "var(--color-bg)",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "56px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px 0",
    gap: "8px",
  },
  backBtn: {
    background: "none",
    border: "none",
    padding: "4px 8px 4px 0",
    fontSize: "28px",
    lineHeight: 1,
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  body: {
    padding: "0 20px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "8px",
  },
  card: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },
  row: (danger) => ({
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "15px 16px",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "inherit",
    background: "none",
    border: "none",
    borderTop: "1px solid var(--color-border)",
    textAlign: "left",
    cursor: "pointer",
    color: danger ? "var(--color-danger)" : "#111827",
  }),
  rowFirst: (danger) => ({
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "15px 16px",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "inherit",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    color: danger ? "var(--color-danger)" : "#111827",
  }),
};

export default function SettingsView({ onBack, onLogout }) {
  const [recipes, setRecipes] = useState([]);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    apiFetch("/recipes")
      .then(setRecipes)
      .catch(() => {});
  }, []);

  function handleExport() {
    if (recipes.length === 0) {
      showToast("No recipes to export");
      return;
    }
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "nf4lm",
      recipes: recipes.map((r) => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        ingredients: r.ingredients,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `nf4lm-v1-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClearRecipes() {
    if (recipes.length === 0) {
      showToast("No recipes to clear");
      return;
    }
    if (
      !window.confirm(
        `Delete all ${recipes.length} recipe${recipes.length === 1 ? "" : "s"}? This cannot be undone.`
      )
    )
      return;
    setClearing(true);
    let failed = 0;
    for (const r of recipes) {
      try {
        await apiFetch(`/recipes/${r.id}`, { method: "DELETE" });
      } catch {
        failed++;
      }
    }
    if (failed === 0) {
      setRecipes([]);
      showToast("All recipes cleared");
    } else {
      const removed = recipes.length - failed;
      setRecipes((prev) => prev.slice(removed));
      showToast(`Cleared ${removed}, ${failed} failed`);
    }
    setClearing(false);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      showToast("Invalid JSON file");
      return;
    }

    if (!Array.isArray(data.recipes)) {
      showToast("Invalid backup file");
      return;
    }

    const issues = [];
    if (!data.version) issues.push("Missing version field");
    else if (data.version !== 1)
      issues.push(`Unknown version: ${data.version}`);

    if (!data.app || data.app !== "nf4lm")
      issues.push(
        `Unrecognized app: "${data.app || "(missing)"}" — format may not be compatible`
      );

    const existingTitles = new Set(
      recipes.map((r) => r.title.trim().toLowerCase())
    );
    const toImport = [];
    let skipped = 0;

    for (const r of data.recipes) {
      if (!r.title?.trim()) {
        skipped++;
        issues.push(`Skipping recipe with no title`);
        continue;
      }
      const key = r.title.trim().toLowerCase();
      if (existingTitles.has(key)) {
        skipped++;
        issues.push(`Duplicate title skipped: "${r.title.trim()}"`);
        continue;
      }
      toImport.push(r);
      existingTitles.add(key);
    }

    if (toImport.length === 0) {
      showToast(
        skipped > 0
          ? `Nothing to import (${skipped} skipped)`
          : "Nothing to import"
      );
      return;
    }

    if (issues.length > 0) {
      const msg =
        `Issues found:\n${issues.slice(0, 5).join("\n")}` +
        (issues.length > 5 ? `\n…and ${issues.length - 5} more` : "") +
        `\n\nImport ${toImport.length} recipe(s)?`;
      if (!window.confirm(msg)) return;
    }

    setImporting(true);
    let imported = 0;
    let failed = 0;
    const added = [];

    for (const r of toImport) {
      try {
        const ingredients = (r.ingredients || []).map((ing) => ({
          ...ing,
          secret: ing.secret ?? false,
          substitutions: (ing.substitutions || []).map((sub) =>
            typeof sub === "string" ? { qty: "", unit: "", name: sub } : sub
          ),
        }));
        const created = await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
            title: r.title.trim(),
            notes: r.notes || "",
            ingredients,
            created_at: r.createdAt || undefined,
          }),
        });
        added.push(created);
        imported++;
      } catch {
        failed++;
      }
    }

    setRecipes((prev) => {
      const updated = [...prev, ...added];
      updated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return updated;
    });

    setImporting(false);
    const parts = [`Imported ${imported}`];
    if (skipped > 0) parts.push(`${skipped} skipped`);
    if (failed > 0) parts.push(`${failed} failed`);
    showToast(parts.join(", "));
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <p style={s.title}>Settings</p>
      </div>

      <div style={s.body}>
        <div>
          <p style={s.sectionLabel}>Data</p>
          <div style={s.card}>
            <button
              style={s.rowFirst(false)}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Importing…" : "Import recipes"}
            </button>
            <button style={s.row(false)} onClick={handleExport}>
              Export recipes
            </button>
            <button
              style={s.row(true)}
              onClick={handleClearRecipes}
              disabled={clearing}
            >
              {clearing ? "Clearing…" : "Clear all recipes"}
            </button>
          </div>
        </div>

        <div>
          <p style={s.sectionLabel}>Account</p>
          <div style={s.card}>
            <button style={s.rowFirst(true)} onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      <Toast message={toast} />
    </div>
  );
}
