# 🔗 Partager RACINES pour recueillir des avis

L'app est buildée dans `dist/`. Voici comment obtenir une **URL publique HTTPS** à partager, et comment recevoir les retours.

## ✅ Option 1 — Netlify Drop (le plus simple, gratuit, ~1 min)
1. Build (déjà fait) : `npm run build` → dossier `dist/`.
2. Va sur **https://app.netlify.com/drop**
3. **Glisse le dossier `dist`** dans la page.
4. Tu obtiens une **URL HTTPS** (`https://xxxx.netlify.app`) — partageable et **installable** (PWA).
   - Sans compte : déploiement temporaire. Avec un compte gratuit : URL conservée + renommable.

## ✅ Option 2 — Vercel
1. Pousse le dossier `racines/` sur GitHub.
2. vercel.com → New Project → importe le repo → framework **Vite** (build `npm run build`, output `dist`).
3. URL HTTPS permanente + redéploiement auto à chaque push.

## 📥 Recevoir les avis (bouton « Avis » intégré)
Un bouton **« Avis »** (en bas à gauche) ouvre une fenêtre : **note ★ + message**, envoyé par **WhatsApp**, **email** ou **copier-coller**.

👉 Pour recevoir directement les retours, ouvre [`src/components/Feedback.tsx`](src/components/Feedback.tsx) et renseigne :
```ts
const OWNER_WHATSAPP = '237690000000' // ton numéro WhatsApp (format international, sans +)
const OWNER_EMAIL = 'toi@email.com'    // ton email
```
puis rebuild (`npm run build`) avant de redéployer.
*(Sans numéro, WhatsApp ouvre le sélecteur de contact — le testeur t'enverra le message manuellement.)*

> Astuce : pour des retours structurés, tu peux aussi créer un **Google Form** et le lier (je peux ajouter le lien dans le bouton).

## 🧪 Message à envoyer aux testeurs (à copier)
> Salut 👋 Je teste **RACINES**, une appli pour reconstruire l'arbre de notre grande famille (vivants + mémoire des défunts), discuter, partager événements et souvenirs.
> 👉 Lien : `https://TON-URL.netlify.app`
> Connecte-toi avec **herve@famille.cm** · mot de passe **demo1234** (ou crée ton compte → on te guide pour déclarer tes parents/grands-parents).
> Balade-toi dans **l'Arbre**, **le Fil**, **les Messages**, puis clique **« Avis »** pour me dire ce que tu en penses (note + recommandations). Merci 🙏

## ⚠️ À savoir (sois transparent avec les testeurs)
- **Démo locale** : les données sont **propres à chaque appareil/navigateur** (chacun part de la famille de démonstration *Mballa*). C'est parfait pour recueillir des avis sur **le concept et l'expérience**, mais ce **n'est pas encore une base partagée** entre testeurs.
- Le **partage réel des données entre membres** (vraies familles communes, temps réel) viendra avec le **backend**.
- Sur mobile : Chrome → menu → **Ajouter à l'écran d'accueil** pour l'installer.
