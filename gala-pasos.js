// Orden de la gala (lo usan la pantalla de la gala y el mando de Admin)
// Las categorías normales primero, luego Juego del año y al final la categoría principal (Clip del año)
window.MOTY_PASOS = function () {
  const min = (window.CONFIG && window.CONFIG.MIN_NOMINADOS) || 3;
  const cats = ((window.MITICOS && window.MITICOS.categorias) || []).filter((c) => !c.oculta && (c.nominados || []).length >= min);
  const orden = cats.filter((c) => !c.principal && c.id !== "juego-del-ano")
    .concat(cats.filter((c) => !c.principal && c.id === "juego-del-ano"), cats.filter((c) => c.principal));
  const pasos = [{ t: "intro" }];
  orden.forEach((c, i) => ["titulo", "nominados", "suspense", "ganador", "tabla"].forEach((t) => pasos.push({ t, cat: c.id, n: i + 1, total: orden.length })));
  pasos.push({ t: "final" });
  return pasos;
};
window.MOTY_PASO_NOMBRE = { intro: "Portada", titulo: "Presentar categoría", nominados: "Nominados", suspense: "Suspense", ganador: "¡Ganador!", tabla: "Clasificación", final: "Despedida" };
