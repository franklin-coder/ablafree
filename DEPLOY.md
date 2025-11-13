# 🚀 Guía Rápida de Despliegue

## PASO 1: Subir a GitHub

```bash
git add .
git commit -m "Production ready"
git push origin master
```

## PASO 2: Railway (Socket.IO Server)

1. Ve a https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona tu repositorio
4. En **Settings**:
   - **Root Directory**: `socket-server`
   - **Custom Build Command**: (vacío o `npm install`)
   - **Custom Start Command**: `node server.js`
5. En **Settings** → **Networking** → **Generate Domain**
6. **COPIA LA URL** (ej: `https://tu-app.up.railway.app`)

## PASO 3: Vercel (Frontend)

1. Ve a https://vercel.com
2. **Add New** → **Project**
3. Importa tu repositorio
4. **Environment Variables** (usa los valores de tu `.env` local):
   - `DATABASE_URL`
   - `DEEPGRAM_API_KEY`
   - `GOOGLE_TRANSLATE_API_KEY`
   - `OPENAI_API_KEY`
   - `NEXTAUTH_URL` = `https://temp.vercel.app`
   - `NEXT_PUBLIC_SOCKET_URL` = URL de Railway del Paso 2
5. **Deploy**
6. Copia la URL de Vercel
7. **Settings** → **Environment Variables** → Edita `NEXTAUTH_URL` con tu URL real
8. **Redeploy**

## PASO 4: Probar

- Cajero: `https://tu-proyecto.vercel.app/cajero`
- Cliente: `https://tu-proyecto.vercel.app/cliente`

## 💰 Costos

- Vercel: GRATIS
- Railway: $5/mes gratis, luego ~$5-10/mes
