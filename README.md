# 🩺 GluciTracker - Suivi Glycémique & Calcul Insuline

Application web moderne pour suivre la glycémie, calculer les doses d'insuline automatiquement et gérer les repas avec **export PDF professionnel**.

## ✨ Fonctionnalités

- 📊 Suivi glycémie (avant/après) en g/L
- 💉 **Calcul automatique des doses d'insuline**
  - Dose pour manger = (glucides ÷ 10) × ratio repas
  - Dose de correction = (glycémie - 1.2) ÷ indice sensibilité
  - Dose totale avec ajustements selon glycémie
  - Correction 3h après (si glycémie > 1.4)
- 🍽️ Base alimentaire Ciqual (3484 aliments)
- 📥 Export PDF professionnel avec ratios et doses calculées
- 📅 Historique 10 derniers jours
- 💾 Stockage local (localStorage)
- 📱 100% responsive

## 🎯 Paramètres Patient

- **Indice de sensibilité** : facteur personnel (g/u)
- **Ratios insuline** : un pour chaque repas (u par 10g de glucides)
- **Dose basale** : insuline de base

## 🚀 Démarrage Rapide

```bash
# Installation
git clone https://github.com/DandaneRida/glucitracker-web.git
cd glucitracker-web
npm install

# Développement
node dev-server.js
# http://localhost:3000

# Production
npm install -g vercel
vercel
```

## 📖 Utilisation

1. **Configuration patient** (une seule fois) :
   - Nom du patient
   - Dose basale (u)
   - Indice de sensibilité à l'insuline (g/u)
   - Ratios insuline pour chaque repas

2. **Pour chaque repas** :
   - Entrez glycémie AVANT le repas (g/L)
   - Ajoutez les aliments avec leur poids
   - Optionnel : resucrage (g glucides)
   - Entrez glycémie APRÈS le repas (3-4h)
   - Cliquez **"Valider le repas"**

3. **Résultats** :
   - Les doses d'insuline se calculent automatiquement
   - Affichage direct : dose pour manger, dose correction, dose totale
   - Export PDF avec tous les calculs

## 📋 Formules de Calcul

- **Dose pour manger** = (total glucides ÷ 10) × ratio du repas
- **Dose de correction** = (glycémie - 1.2) ÷ indice sensibilité (si glyc. > 1.2 g/L)
- **Dose totale** = dose repas + dose correction
  - Si glycémie 0.7-1.0 g/L : dose - 1u
  - Si glycémie < 0.7 g/L : dose - 2u + alerte resucrage
- **Correction 3h après** = (glycémie - 1.4) ÷ indice sensibilité (si glyc. > 1.4 g/L)

## 📊 Export PDF

Le rapport inclut :
- ✅ Bloc infos patient avec ratios en gras
- ✅ Tableau résumé des repas avec doses calculées
- ✅ Détail des aliments
- ✅ Pages d'historique (10 derniers jours)

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
