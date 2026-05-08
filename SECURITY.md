# Security / Seguretat

## CA

Si detectes una vulnerabilitat, no publiques l'exploit en obert.

Contacte responsable:

- Obrir issue privat (si està disponible)
- O contactar directament amb l'equip mantenidor d'Espai42

### Bones pràctiques

- No commitejar credencials (`IG_ACCESS_TOKEN`, claus SSH, etc.).
- Usar variables d'entorn per secrets.
- Rotar tokens si hi ha sospita de filtració.
- Revisar dependències periòdicament:

```bash
npm audit
```

---

## ES

Si detectas una vulnerabilidad, no publiques el exploit en abierto.

Contacto responsable:

- Abrir issue privado (si está disponible)
- O contactar directamente con el equipo mantenedor de Espai42

### Buenas prácticas

- No commitear credenciales (`IG_ACCESS_TOKEN`, claves SSH, etc.).
- Usar variables de entorno para secretos.
- Rotar tokens si hay sospecha de filtración.
- Revisar dependencias periódicamente:

```bash
npm audit
```
