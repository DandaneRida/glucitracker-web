# 🩺 GluciTracker - Suivi Glycémique

Application web moderne pour suivre la glycémie, l'insuline et les repas avec **export PDF professionnel**.

## ✨ Fonctionnalités

- 📊 Suivi glycémie (avant/après)
- 💉 Gestion insuline (standard + correction)
- 🍽️ Base alimentaire Ciqual (3484 aliments)
- 📥 Export PDF avec tableaux
- 📅 Historique 10 derniers jours
- 💾 Stockage local (localStorage)
- 📱 100% responsive

## 🚀 Démarrage Rapide

```bash
# Installation
git clone https://github.com/DandaneRida/glucitracker-web.git
cd glucitracker-web
npm install

# Développement
npm start
# http://localhost:3000

# Production
npm install -g vercel
vercel
```

## 📖 Utilisation

1. Remplissez **nom** et **dose basale**
2. Pour chaque repas :
   - Glycémie avant
   - Ajoutez aliments
   - Insuline + correction
   - Glycémie après
3. Cliquez **"Exporter Rapport"** → PDF téléchargé

## 📋 Tableaux PDF

| Repas | Glyc.Av | Glucides | Insul. | Corr. | Résuç. | Glyc.Ap |
|-------|---------|----------|--------|-------|--------|---------|
| Pdt Dej | mg/dL | g | u | u | g | mg/dL |

## 🛠️ Technologies

- Vanilla JavaScript (ES6+)
- Express.js
- jsPDF
- localStorage API
- CSS3 responsive

## 📦 Dépendances

```json
{
  "express": "^5.2.1",
  "cors": "^2.8.6"
}
```

## 🔒 Sécurité

- ✅ Pas de backend
- ✅ Données locales uniquement
- ✅ RGPD compliant
- ✅ Aucune authentification

## 📁 Structure

```
glucitracker-web/
├── index.html
├── js/app.js
├── css/style.css
├── data/ciqual-complete.json
├── package.json
└── vercel.json
```

## 📝 License

MIT License - Libre d'utilisation

## 👨‍💻 Auteur

**Danda Ridadandane**
- GitHub: [@DandaneRida](https://github.com/DandaneRida)
- Email: ridadandane@gmail.com

---

**Version** : 1.0.0  
**Status** : ✅ Production Ready


## 👨‍💻 Auteur & Support

**Danda Rida**
- Code Source: https://github.com/DandaneRida
- Contacter le développeur: ridadandane@gmail.com

## �📝 License

MIT
