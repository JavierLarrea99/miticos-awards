# MOTY 2026 · Míticos Of The Year

Web: https://javierlarrea99.github.io/miticos-awards/

Web de votación del grupo: cada uno entra con su correo y vota su top 5 en cada categoría
(1º = 10 pts, 2º = 7, 3º = 5, 4º = 3, 5º = 1). Gana quien sume más puntos; si hay empate, el que tenga más primeros puestos.

## Puesta en marcha (una sola vez, unos 15 minutos)

### 1. Supabase (la base de datos)
1. Entra en https://supabase.com, crea una cuenta y un proyecto nuevo (región: Europa).
2. Ve a **SQL Editor**, pega todo `supabase.sql`, cambia los correos de ejemplo de la parte final por los vuestros
   (pon `true` solo en el tuyo, que es el admin) y pulsa **Run**.
3. Ve a **Project Settings → API** y copia la **Project URL** y la **anon public key** en `config.js`.

### 2. Correos (opcional: sin esto Supabase manda máximo 2 correos por hora, suficiente si no entráis todos a la vez; la sesión se queda guardada)
1. En tu Gmail activa la verificación en dos pasos y crea una **contraseña de aplicación** (https://myaccount.google.com/apppasswords).
2. En Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Host `smtp.gmail.com` · Port `465` · User: tu Gmail · Password: la contraseña de aplicación
   - Sender email: tu Gmail · Sender name: `Míticos Awards`
3. En **Authentication → Emails → Templates → Magic Link** añade el código al mensaje, por ejemplo:
   `<h2>Tu código: {{ .Token }}</h2><p>O entra directamente: <a href="{{ .ConfirmationURL }}">Entrar</a></p>`
4. En **Authentication → URL Configuration** pon como *Site URL* y *Redirect URL* la dirección de la web
   (p. ej. `https://javierlarrea99.github.io/miticos-awards/`).

### 3. GitHub Pages
Repositorio → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)`.

## Uso diario

- **Añadir o quitar categorías / nominados:** `nominados.js`. Una categoría con menos de 3 nominados no aparece.
  No cambies el `id` de una categoría o nominado una vez empiece la votación.
- **Clips:** súbelos a `clips/<categoria>/` en MP4 720p y ligeros (menos de 25 MB cada uno; GitHub no acepta archivos de más de 100 MB).
- **Quién puede votar:** con la *Inscripción abierta* (Admin) cualquiera que entre con su correo y confirme el enlace queda apuntado con el nombre que elija.
  Cuando estéis todos, ciérrala en Admin y solo podrá entrar la lista. Desde Admin también puedes añadir o quitar gente.
- **La gala:** en **Admin** cierra la votación y pulsa **Revelar** en cada categoría. Los demás lo ven en **Resultados** en unos segundos.

Si abres la web sin rellenar `config.js`, funciona en **modo prueba** (los votos solo se guardan en tu navegador).

## La gala en directo (YouTube)

1. En el PC que emite, abre `https://javierlarrea99.github.io/miticos-awards/gala.html` en Chrome (con tu sesión iniciada) y pulsa **F** (pantalla completa).
2. En OBS: *Captura de ventana* de ese Chrome (o *Fuente de navegador* 1920×1080 con esa dirección). Activa el audio de la ventana para que se oigan el redoble y los clips.
3. Manda con **→ / espacio** en ese PC o con **Siguiente ▶** en Admin desde el móvil. Cada premio: categoría → nominados → suspense → ¡ganador! → clasificación.
4. Al llegar a «¡Ganador!» la categoría se revela sola en la página de Resultados. Las teclas: ← atrás, M silencio, H ayuda.
5. En YouTube, emite como **Oculto** y pasa el enlace al grupo.
