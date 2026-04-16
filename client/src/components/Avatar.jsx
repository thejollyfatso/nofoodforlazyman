export default function Avatar({ letter, color, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color || "var(--color-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "700",
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {(letter || "?").toUpperCase()}
    </div>
  );
}
