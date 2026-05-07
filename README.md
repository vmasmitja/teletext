# Teletext Espai42

Web interactiva amb estètica teletext:
- pantalla pública: `/tv`
- comandament mòbil: `/comandament`

## Desenvolupament local

```bash
npm install
npm run dev
```

## Producció (Node + Nginx + PM2)

Variables:
- `PORT` (default `5173`)
- `PUBLIC_BASE_URL` (ex. `https://teletext.espai42.org`)
- `IG_USER_ID` (opcional, per carrusel Instagram a pàg. 402)
- `IG_ACCESS_TOKEN` (opcional, token Graph API lectura)

## Contingut separable de codi

- Diccionari del joc Paraulògic: `paraulogic-words.json`
- Es carrega via API (`/api/games/paraulogic-dictionary`) i es pot editar sense tocar codi.

### Passos al VPS

```bash
cd /var/www/teletext
npm ci
npm run build
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

### Nginx

Fitxer plantilla: `deploy/nginx-teletext.conf`

```bash
cp deploy/nginx-teletext.conf /etc/nginx/sites-available/teletext
ln -s /etc/nginx/sites-available/teletext /etc/nginx/sites-enabled/teletext
nginx -t && systemctl reload nginx
```

### Let's Encrypt

```bash
apt update && apt install -y certbot python3-certbot-nginx
certbot --nginx -d teletext.espai42.org
```
