# Contributing / Contribució

## CA

Gràcies per voler contribuir a `Teletext Espai42`.

### Flux recomanat

1. Crea una branca nova des de `main`.
2. Fes canvis petits i enfocats.
3. Executa validació local abans d'enviar:

```bash
npm install
npm run build
```

4. Revisa que no puges secrets ni tokens.
5. Obri PR amb resum curt i clar.

### Criteris de codi

- Mantindre estètica i to teletext.
- Evitar refactors no relacionats amb el canvi.
- Prioritzar accessibilitat i llegibilitat.
- Si toques UI, adjuntar captura.

### Zones sensibles

- `server/index.js` (API, WS, fallback Instagram)
- `src/pages/DisplayPage.*` (layout principal en pantalla pública)
- `src/pages/RemotePage.*` (comandament mòbil)
- `server/editorStore.js` i `server/data/*` (editor i contingut)

---

## ES

Gracias por contribuir a `Teletext Espai42`.

### Flujo recomendado

1. Crea una rama nueva desde `main`.
2. Haz cambios pequeños y enfocados.
3. Ejecuta validación local antes de enviar:

```bash
npm install
npm run build
```

4. Revisa que no subes secretos ni tokens.
5. Abre PR con resumen breve y claro.

### Criterios de código

- Mantener estética y tono teletext.
- Evitar refactors no relacionados con el cambio.
- Priorizar accesibilidad y legibilidad.
- Si tocas UI, adjuntar captura.

### Zonas sensibles

- `server/index.js` (API, WS, fallback Instagram)
- `src/pages/DisplayPage.*` (layout principal en pantalla pública)
- `src/pages/RemotePage.*` (mando móvil)
- `server/editorStore.js` y `server/data/*` (editor y contenido)
