// =============================================================
//  CATEGORÍAS Y NOMINADOS
//  - Para quitar una categoría: bórrala o pon  oculta: true
//  - Para añadir: copia un bloque { ... } y cambia id, nombre y nominados
//  - Los "id" no se pueden repetir y NO se cambian una vez empiece la votación
//  - Una categoría con menos de MIN_NOMINADOS (config.js) se oculta sola
//
//  Nominado de tipo clip:
//    { id: "c1", titulo: "Me ha mordido", video: "clips/clip-del-ano/c1.mp4",
//      poster: "clips/clip-del-ano/c1.jpg", juego: "Lethal Company", mes: "Marzo" }
//  Nominado de tipo juego:
//    { id: "lethal", titulo: "Lethal Company", imagen: "img/juegos/lethal-company.png" }
// =============================================================
window.MITICOS = {
  categorias: [
    {
      id: "clip-del-ano",
      nombre: "Clip del año",
      descripcion: "El momento que lo resume todo. La categoría reina.",
      principal: true,
      tipo: "clip",
      nominados: [
        // EJEMPLOS sacados de tu vídeo de prueba: cámbialos por los nominados de verdad
        { id: "ej1", titulo: "¡Que me ha mordido!", video: "clips/ejemplo/clip1.mp4", poster: "clips/ejemplo/clip1.jpg", juego: "Lethal Company", mes: "Ejemplo" },
        { id: "ej2", titulo: "El caracol", video: "clips/ejemplo/clip2.mp4", poster: "clips/ejemplo/clip2.jpg", juego: "Lethal Company", mes: "Ejemplo" },
        { id: "ej3", titulo: "La salida de emergencia", video: "clips/ejemplo/clip3.mp4", poster: "clips/ejemplo/clip3.jpg", juego: "Lethal Company", mes: "Ejemplo" },
        { id: "ej4", titulo: "¿Qué era eso?", video: "clips/ejemplo/clip4.mp4", poster: "clips/ejemplo/clip4.jpg", juego: "Lethal Company", mes: "Ejemplo" },
      ],
    },
    {
      id: "juego-del-ano",
      nombre: "Juego del año",
      descripcion: "De todo lo que hemos jugado en 2026, ¿cuál ha sido el mejor?",
      tipo: "juego",
      nominados: [
        { id: "lethal-company", titulo: "Lethal Company", imagen: "img/juegos/lethal-company.png" },
        { id: "farming-simulator-22", titulo: "Farming Simulator 22", imagen: "img/juegos/farming-simulator-22.png" },
        { id: "modo-escolta", titulo: "Modo Escolta", imagen: "img/juegos/modo-escolta.png" },
        { id: "repo", titulo: "R.E.P.O.", imagen: "img/juegos/repo.png" },
        { id: "left-4-dead-2", titulo: "Left 4 Dead 2", imagen: "img/juegos/left-4-dead-2.png" },
        { id: "minecraft", titulo: "Minecraft", imagen: "img/juegos/minecraft.png" },
        { id: "sea-of-thieves", titulo: "Sea of Thieves", imagen: "img/juegos/sea-of-thieves.png" },
        { id: "slapshot-rebound", titulo: "Slapshot: Rebound", imagen: "img/juegos/slapshot-rebound.png" },
        { id: "sons-of-the-forest", titulo: "Sons of the Forest", imagen: "img/juegos/sons-of-the-forest.png" },
        { id: "strikers-club", titulo: "Strikers Club", imagen: "img/juegos/strikers-club.png" },
        { id: "rocket-league", titulo: "Rocket League", imagen: "img/juegos/rocket-league.png" },
        { id: "final-paradox", titulo: "Final Paradox", imagen: "img/juegos/final-paradox.png" },
      ],
    },
    { id: "fail-0-iq", nombre: "Mayor troleada / Fail 0 IQ", descripcion: "Cuando el cerebro se queda en el lobby.", tipo: "clip", nominados: [] },
    { id: "mejor-timing", nombre: "Mejor timing", descripcion: "En el momento justo. Ni un segundo antes ni uno después.", tipo: "clip", nominados: [] },
    { id: "clip-mas-epico", nombre: "Clip más épico", descripcion: "Música de película y piel de gallina.", tipo: "clip", nominados: [] },
    { id: "mejor-jugada", nombre: "Mejor jugada del año", descripcion: "Habilidad pura (o suerte bien disimulada).", tipo: "clip", nominados: [] },
    { id: "mayor-susto", nombre: "Mayor susto", descripcion: "El grito que aún resuena en Discord.", tipo: "clip", nominados: [] },
    { id: "mayor-tilteo", nombre: "Mayor tilteo", descripcion: "Cuando alguien perdió la paciencia (y el teclado).", tipo: "clip", nominados: [] },
    { id: "fuera-de-contexto", nombre: "Mejor clip fuera de contexto", descripcion: "Mejor no preguntar.", tipo: "clip", nominados: [] },
    { id: "frase-meme", nombre: "Mejor frase meme del año", descripcion: "La frase que hemos repetido mil veces.", tipo: "clip", nominados: [] },
  ],
};
