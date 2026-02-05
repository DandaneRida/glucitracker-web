class GluciApp {
  constructor() {
    this.alimentsLoaded = false;
    this.aliments = [];
    this.searchTimeout = null;
    this.currentMeal = null;
    this.currentFood = null;

    this.showLoadingIndicator();
    this.loadData();
    this.loadAlimentsFromJSON();
    this.attachEvents();
    this.render();
  }

  showLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) indicator.style.display = 'block';
  }

  hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) indicator.style.display = 'none';
  }

  loadData() {
    // Vérifier que les éléments DOM existent
    const missingElements = [];
    if (!document.getElementById('loading-indicator')) missingElements.push('loading-indicator');
    if (!document.getElementById('alerts-container')) missingElements.push('alerts-container');
    if (!document.getElementById('meals-container')) missingElements.push('meals-container');
    if (!document.getElementById('patient-name')) missingElements.push('patient-name');
    if (!document.getElementById('patient-basale')) missingElements.push('patient-basale');
    if (!document.getElementById('btn-export')) missingElements.push('btn-export');
    if (!document.getElementById('btn-clear-all')) missingElements.push('btn-clear-all');
    
    if (missingElements.length > 0) {
      console.error('❌ Éléments manquants:', missingElements);
      return;
    }

    // Charger données patient
    const patientData = localStorage.getItem('patient_data');
    this.patientData = patientData ? JSON.parse(patientData) : {
      nom: '',
      basale: 0
    };

    // Repas intégrés
    const mealsData = localStorage.getItem('meals_data');
    this.mealsData = mealsData ? JSON.parse(mealsData) : {
      'petit_dejeuner': {
        aliments: [],
        insuline: 0,
        insuline_correction: 0,
        glycemie_avant: null,
        glycemie_apres: null,
        resucrage: 0,
        date: new Date().toISOString().split('T')[0]
      },
      'dejeuner': {
        aliments: [],
        insuline: 0,
        insuline_correction: 0,
        glycemie_avant: null,
        glycemie_apres: null,
        resucrage: 0,
        date: new Date().toISOString().split('T')[0]
      },
      'diner': {
        aliments: [],
        insuline: 0,
        insuline_correction: 0,
        glycemie_avant: null,
        glycemie_apres: null,
        resucrage: 0,
        date: new Date().toISOString().split('T')[0]
      }
    };

    // Alertes
    this.alertsContainer = document.getElementById('alerts-container');
    
    // Afficher les infos patient
    const patientNameInput = document.getElementById('patient-name');
    const patientBasaleInput = document.getElementById('patient-basale');
    if (patientNameInput) {
      patientNameInput.value = this.patientData.nom || '';
      patientNameInput.onchange = () => this.savePatientData();
    }
    if (patientBasaleInput) {
      patientBasaleInput.value = this.patientData.basale || 0;
      patientBasaleInput.onchange = () => this.savePatientData();
    }
    
    console.log('✅ loadData() terminé');
  }

  savePatientData() {
    this.patientData.nom = document.getElementById('patient-name').value;
    this.patientData.basale = parseFloat(document.getElementById('patient-basale').value) || 0;
    localStorage.setItem('patient_data', JSON.stringify(this.patientData));
  }

  saveData() {
    localStorage.setItem('meals_data', JSON.stringify(this.mealsData));
    this.saveHistoricalData();
  }

  saveHistoricalData() {
    const today = new Date().toISOString().split('T')[0];
    let history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    
    // Garder seulement les 10 derniers jours
    const dates = Object.keys(history).sort().reverse().slice(0, 9);
    const newHistory = { [today]: JSON.parse(JSON.stringify(this.mealsData)) };
    
    dates.forEach(date => {
      newHistory[date] = history[date];
    });
    
    localStorage.setItem('meals_history', JSON.stringify(newHistory));
  }

  // ============ CHARGER ALIMENTS (JSON LOCAL) ============
  async loadAlimentsFromJSON() {
    try {
      // Chargement depuis fichier JSON local (Ciqual complete)
      const response = await fetch('data/ciqual-complete.json');
      
      if (!response.ok) throw new Error('Erreur chargement fichier');

      const data = await response.json();
      this.aliments = data.aliments || [];

      this.alimentsLoaded = true;
      this.hideLoadingIndicator();
      this.showSuccess(`✅ ${this.aliments.length} aliments Ciqual (BASE LOCALE) chargés !`);
    } catch (error) {
      console.error('❌ Erreur chargement aliments:', error);
      this.hideLoadingIndicator();
      this.showError('⚠️ Impossible de charger les aliments');
    }
  }

  // ============ RECHERCHE ULTRA-RAPIDE ============
  searchFood(query, mealType) {
    // Debounce: attendre 150ms avant de faire la recherche
    clearTimeout(this.searchTimeout);
    
    if (!query || query.length < 2) {
      const resultsDiv = document.getElementById(`food-results-${mealType}`);
      if (resultsDiv) resultsDiv.innerHTML = '';
      return;
    }

    // Afficher "Recherche..." immédiatement
    const resultsDiv = document.getElementById(`food-results-${mealType}`);
    if (resultsDiv) resultsDiv.innerHTML = '<div style="padding:10px;color:#999;font-size:12px;">🔍 Recherche...</div>';

    this.searchTimeout = setTimeout(() => {
      if (!this.alimentsLoaded || this.aliments.length === 0) {
        if (resultsDiv) resultsDiv.innerHTML = '<div style="padding:10px;color:#f44336;">Base en cours de chargement...</div>';
        return;
      }

      const q = query.toLowerCase();
      const results = this.aliments
        .filter(a => a.nom.toLowerCase().includes(q))
        .slice(0, 15); // Limiter à 15

      if (!resultsDiv) return;

      if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:10px;color:#999;">Aucun résultat</div>';
        return;
      }

      resultsDiv.innerHTML = results.map(a => `
        <div class="food-item" onclick="app.selectFood('${mealType}', ${a.id}, '${a.nom.replace(/'/g, "\\'")}', ${a.glucides})">
          <strong>${a.nom}</strong>
          <span>${a.glucides}g/100g</span>
        </div>
      `).join('');
    }, 150);
  }

  selectFood(mealType, id, nom, glucides) {
    this.currentFood = { id, nom, glucides };
    this.currentMeal = mealType;
    
    const input = document.getElementById(`food-search-${mealType}`);
    if (input) input.value = nom;
    
    const resultsDiv = document.getElementById(`food-results-${mealType}`);
    if (resultsDiv) resultsDiv.innerHTML = '';
    
    const weightInput = document.getElementById(`meal-weight-${mealType}`);
    if (weightInput) weightInput.focus();
  }

  addFoodToMeal(mealType) {
    if (!this.currentFood) {
      this.showError('❌ Sélectionnez un aliment');
      return;
    }

    const weightInput = document.getElementById(`meal-weight-${mealType}`);
    const poids = parseFloat(weightInput.value);

    if (!poids || poids < 1 || poids > 2000) {
      this.showError('Poids invalide (1-2000g)');
      return;
    }

    const glucidesTotaux = (this.currentFood.glucides * poids) / 100;

    this.mealsData[mealType].aliments.push({
      id: Date.now(),
      aliment_nom: this.currentFood.nom,
      poids: poids,
      glucides: this.currentFood.glucides,
      glucides_totaux: glucidesTotaux
    });

    this.saveData();
    this.render();
    this.showSuccess(`✅ ${this.currentFood.nom} (${poids}g) ajouté`);

    document.getElementById(`food-search-${mealType}`).value = '';
    weightInput.value = '';
    this.currentFood = null;
  }

  deleteFoodFromMeal(mealType, id) {
    this.mealsData[mealType].aliments = this.mealsData[mealType].aliments.filter(f => f.id !== id);
    this.saveData();
    this.render();
    this.showSuccess('✅ Aliment supprimé');
  }

  // ============ MISE À JOUR DES VALEURS ============
  updateMealValue(mealType, field, value) {
    this.mealsData[mealType][field] = value;
    this.saveData();
    this.render();
  }

  // ============ RENDER ============
  render() {
    const container = document.getElementById('meals-container');
    if (!container) return;

    const mealsToRender = [
      { type: 'petit_dejeuner', label: '🌅 Petit Déjeuner' },
      { type: 'dejeuner', label: '☀️ Déjeuner' },
      { type: 'diner', label: '🌙 Dîner' }
    ];

    container.innerHTML = mealsToRender.map(meal => this.renderMealBlock(meal.type, meal.label)).join('');
  }

  renderMealBlock(mealType, label) {
    const meal = this.mealsData[mealType];
    const totalGlucides = meal.aliments.reduce((sum, item) => sum + item.glucides_totaux, 0);

    return `
      <div class="meal-block">
        <div class="meal-block-title">${label}</div>
        
        <!-- Glycémie AVANT -->
        <div class="meal-section">
          <label>Glycémie AVANT le repas (mg/dL)</label>
          <input type="number" 
            value="${meal.glycemie_avant || ''}" 
            placeholder="Ex: 125"
            min="20" max="600"
            onchange="app.updateMealValue('${mealType}', 'glycemie_avant', this.value)"
            class="meal-input">
        </div>

        <!-- Aliments -->
        <div class="meal-section">
          <label>Ajouter des aliments</label>
          <div class="food-search-container">
            <input type="text" 
              id="food-search-${mealType}"
              placeholder="Chercher un aliment..."
              oninput="app.searchFood(this.value, '${mealType}')"
              class="meal-input">
            <div id="food-results-${mealType}" class="food-results"></div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <input type="number" 
              id="meal-weight-${mealType}"
              placeholder="Poids (g)"
              min="1" max="2000"
              class="meal-input" style="flex: 1;">
            <button onclick="app.addFoodToMeal('${mealType}')" class="btn-add">
              <i class="fas fa-plus"></i> Ajouter
            </button>
          </div>
        </div>

        <!-- Aliments ajoutés -->
        ${meal.aliments.length > 0 ? `
          <div class="meal-section">
            <label>Aliments du repas</label>
            ${meal.aliments.map(item => `
              <div class="meal-food-item">
                <div>
                  <strong>${item.aliment_nom}</strong>
                  <div class="meal-food-detail">${item.poids}g = ${item.glucides_totaux.toFixed(1)}g glucides</div>
                </div>
                <button onclick="app.deleteFoodFromMeal('${mealType}', ${item.id})" class="btn-delete">✕</button>
              </div>
            `).join('')}
            
            <div class="meal-total">
              <strong>Total glucides: ${totalGlucides.toFixed(1)}g</strong>
            </div>
          </div>
        ` : ''}

        <!-- Insuline à prendre -->
        <div class="meal-section">
          <label>Insuline à prendre (u)</label>
          <input type="number" 
            value="${meal.insuline || 0}" 
            placeholder="0"
            min="0" max="100" step="0.5"
            onchange="app.updateMealValue('${mealType}', 'insuline', this.value)"
            class="meal-input">
        </div>

        <!-- Insuline de correction -->
        <div class="meal-section">
          <label>Insuline de correction si besoin (u)</label>
          <input type="number" 
            value="${meal.insuline_correction || 0}" 
            placeholder="0"
            min="0" max="50" step="0.5"
            onchange="app.updateMealValue('${mealType}', 'insuline_correction', this.value)"
            class="meal-input">
        </div>

        <!-- Resucrage -->
        <div class="meal-section">
          <label>Resucrage (g glucides)</label>
          <input type="number" 
            value="${meal.resucrage || 0}" 
            placeholder="0"
            min="0" max="100" step="1"
            onchange="app.updateMealValue('${mealType}', 'resucrage', this.value)"
            class="meal-input">
        </div>

        <!-- Glycémie APRÈS (3-4h) -->
        <div class="meal-section">
          <label>Glycémie APRÈS le repas (3-4h)</label>
          <input type="number" 
            value="${meal.glycemie_apres || ''}" 
            placeholder="Ex: 140"
            min="20" max="600"
            onchange="app.updateMealValue('${mealType}', 'glycemie_apres', this.value)"
            class="meal-input">
        </div>
      </div>
    `;
  }

  // ============ FONCTION 1: GÉNÉRER HTML DU RAPPORT ============
  generateReportHTML() {
    const aujourd_hui = new Date().toLocaleDateString('fr-FR');
    
    const htmlContent = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: white; padding: 20px; }
  h1 { color: #667eea; text-align: center; margin-bottom: 10px; font-size: 22px; }
  .date { text-align: center; color: #999; margin-bottom: 20px; font-size: 12px; }
  .patient-box { background: #f0f0f0; padding: 12px; margin-bottom: 20px; border-left: 4px solid #667eea; }
  .patient-box p { margin: 4px 0; font-size: 12px; }
  h2 { color: #667eea; margin-top: 20px; margin-bottom: 12px; font-size: 14px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #667eea; color: white; padding: 8px; text-align: left; font-size: 11px; font-weight: bold; }
  td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
  tr:nth-child(even) { background: #f9f9f9; }
  .meal-section { margin-bottom: 15px; background: #f9f9f9; padding: 10px; border-left: 3px solid #667eea; }
  .meal-title { font-weight: bold; margin-bottom: 8px; font-size: 12px; }
  .food { margin: 4px 0; font-size: 11px; }
</style>

<h1>📊 GluciTracker - Rapport de Suivi</h1>
<div class="date">Date: ${aujourd_hui}</div>

<div class="patient-box">
  <p><strong>Patient:</strong> ${this.patientData.nom || 'Non renseigné'}</p>
  <p><strong>Dose Basale:</strong> ${this.patientData.basale}u</p>
</div>

<h2>📈 Résumé des Repas</h2>
<table>
  <thead>
    <tr>
      <th>Repas</th>
      <th>Glyc. Avant</th>
      <th>Glucides (g)</th>
      <th>Insuline (u)</th>
      <th>Correction (u)</th>
      <th>Resucrage (g)</th>
      <th>Glyc. Après</th>
    </tr>
  </thead>
  <tbody>
    ${this.buildTableRows()}
  </tbody>
</table>

<h2>🍽️ Détail des Aliments par Repas</h2>
${this.buildFoodDetails()}
`;
    
    return htmlContent;
  }

  // ============ EXPORT RAPPORT (PDF) ============
  exportReport() {
    try {
      this.showSuccess('⏳ Génération du PDF...');
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      let yPos = 10;
      
      // ===== HEADER =====
      doc.setFontSize(18);
      doc.setTextColor(102, 126, 234);
      doc.text('RAPPORT GLUCITRACKER', 105, yPos, { align: 'center' });
      yPos += 10;
      
      // Infos patient
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Patient: ${this.patientData.nom || 'Non renseigné'}`, 20, yPos);
      yPos += 5;
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPos);
      yPos += 5;
      doc.text(`Dose Basale: ${this.patientData.basale || '-'} u`, 20, yPos);
      yPos += 12;
      
      // ===== TABLEAU RÉSUMÉ DES REPAS =====
      doc.setFontSize(12);
      doc.setTextColor(102, 126, 234);
      doc.text('RÉSUMÉ DES REPAS', 20, yPos);
      yPos += 7;
      
      // Entête tableau (7 colonnes)
      const headers = ['Repas', 'Gly.Av', 'Glucides', 'Insul.', 'Corr.', 'Résuç.', 'Gly.Ap'];
      const colWidths = [20, 16, 18, 16, 16, 16, 20];
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      
      // Dessiner l'en-tête avec bordure
      doc.setFillColor(102, 126, 234);
      doc.rect(20, yPos, totalWidth, 6, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      let xPos = 20;
      
      headers.forEach((header, i) => {
        doc.text(header, xPos + colWidths[i] / 2, yPos + 4, { align: 'center' });
        xPos += colWidths[i];
      });
      
      // Ajouter les bordures de colonnes
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      xPos = 20;
      for (let i = 0; i <= headers.length; i++) {
        doc.line(xPos, yPos, xPos, yPos + 6);
        if (i < headers.length) xPos += colWidths[i];
      }
      
      yPos += 6;
      
      // Données tableau repas
      const mealData = this.buildTableRowsForPDF();
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      
      mealData.forEach((row, index) => {
        // Fond alterné
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, totalWidth, 5, 'F');
        }
        
        // Texte
        xPos = 20;
        row.forEach((cell, i) => {
          doc.text(cell, xPos + colWidths[i] / 2, yPos + 3.5, { align: 'center' });
          xPos += colWidths[i];
        });
        
        // Bordures
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        xPos = 20;
        for (let i = 0; i <= headers.length; i++) {
          doc.line(xPos, yPos, xPos, yPos + 5);
          if (i < headers.length) xPos += colWidths[i];
        }
        
        yPos += 5;
      });
      
      yPos += 8;
      
      // ===== TABLEAU DÉTAIL DES ALIMENTS =====
      doc.setFontSize(12);
      doc.setTextColor(102, 126, 234);
      doc.text('DÉTAIL DES ALIMENTS', 20, yPos);
      yPos += 7;
      
      // Entête tableau aliments
      const foodHeaders = ['Repas', 'Aliment', 'Poids', 'Glucides'];
      const foodColWidths = [28, 75, 20, 24];
      const foodTotalWidth = foodColWidths.reduce((a, b) => a + b, 0);
      
      doc.setFillColor(102, 126, 234);
      doc.rect(20, yPos, foodTotalWidth, 6, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      xPos = 20;
      
      foodHeaders.forEach((header, i) => {
        doc.text(header, xPos + foodColWidths[i] / 2, yPos + 4, { align: 'center' });
        xPos += foodColWidths[i];
      });
      
      // Bordures en-tête aliments
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      xPos = 20;
      for (let i = 0; i <= foodHeaders.length; i++) {
        doc.line(xPos, yPos, xPos, yPos + 6);
        if (i < foodHeaders.length) xPos += foodColWidths[i];
      }
      
      yPos += 6;
      
      // Données tableau aliments
      const foodData = this.buildFoodDetailsForPDF();
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(7);
      
      foodData.forEach((row, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, foodTotalWidth, 5, 'F');
        }
        
        xPos = 20;
        row.forEach((cell, i) => {
          const text = cell.toString().substring(0, 12);
          doc.text(text, xPos + foodColWidths[i] / 2, yPos + 3, { align: 'center' });
          xPos += foodColWidths[i];
        });
        
        // Bordures
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        xPos = 20;
        for (let i = 0; i <= foodHeaders.length; i++) {
          doc.line(xPos, yPos, xPos, yPos + 5);
          if (i < foodHeaders.length) xPos += foodColWidths[i];
        }
        
        yPos += 5;
      });
      
      // Ajouter pages historique
      this.addHistoryPages(doc);
      
      // Télécharger
      doc.save(`Rapport_Gluci_${this.patientData.nom || 'Suivi'}_${new Date().toISOString().split('T')[0]}.pdf`);
      this.showSuccess('✅ PDF téléchargé !');
    } catch (error) {
      console.error('Erreur PDF:', error);
      this.showError('❌ Erreur lors de la génération du PDF');
    }
  }
  
  addHistoryPages(doc) {
    const history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    const dates = Object.keys(history).sort().reverse();
    
    if (dates.length <= 1) return; // Seulement aujourd'hui
    
    dates.slice(1, 11).forEach(date => {
      doc.addPage();
      let yPos = 10;
      
      // Titre page historique
      doc.setFontSize(12);
      doc.setTextColor(102, 126, 234);
      doc.text(`Historique - ${new Date(date).toLocaleDateString('fr-FR')}`, 20, yPos);
      yPos += 10;
      
      const dayData = history[date];
      const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
      const mealsLabels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
      
      // Mini tableau pour cette journée
      const headers = ['Repas', 'Glyc. Avant', 'Glucides', 'Insuline', 'Correction', 'Résucrage', 'Glyc. Après'];
      const colWidths = [25, 23, 20, 18, 20, 18, 23];
      let xPos = 20;
      
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(102, 126, 234);
      
      yPos += 0.5;
      headers.forEach((header, i) => {
        doc.rect(xPos, yPos, colWidths[i], 5, 'F');
        doc.setFontSize(7);
        doc.text(header, xPos + 0.5, yPos + 3);
        xPos += colWidths[i];
      });
      yPos += 5;
      
      doc.setTextColor(50, 50, 50);
      meals.forEach((mealType, index) => {
        const meal = dayData[mealType];
        if (!meal) return;
        
        const totalGlucides = (meal.aliments || []).reduce((sum, item) => sum + (item.glucides_totaux || 0), 0);
        const row = [
          mealsLabels[mealType],
          meal.glycemie_avant !== null ? `${meal.glycemie_avant}` : '-',
          totalGlucides.toFixed(1),
          `${meal.insuline || 0}`,
          `${meal.insuline_correction || 0}`,
          `${meal.resucrage || 0}`,
          meal.glycemie_apres !== null ? `${meal.glycemie_apres}` : '-'
        ];
        
        xPos = 20;
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, 167, 5, 'F');
        }
        row.forEach((cell, i) => {
          doc.setFontSize(7);
          doc.text(cell, xPos + 1, yPos + 3);
          xPos += colWidths[i];
        });
        yPos += 5;
      });
    });
  }
  
  buildTableRowsForPDF() {
    const rows = [];
    const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
    const mealsLabels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
    
    meals.forEach(mealType => {
      const meal = this.mealsData[mealType];
      const totalGlucides = meal.aliments.reduce((sum, item) => sum + (item.glucides_totaux || 0), 0);
      rows.push([
        mealsLabels[mealType],
        meal.glycemie_avant !== null ? `${meal.glycemie_avant}` : '-',
        totalGlucides.toFixed(1),
        `${meal.insuline || 0}`,
        `${meal.insuline_correction || 0}`,
        `${meal.resucrage || 0}`,
        meal.glycemie_apres !== null ? `${meal.glycemie_apres}` : '-'
      ]);
    });
    
    return rows;
  }
  
  buildFoodDetailsForPDF() {
    const rows = [];
    const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
    const mealsLabels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
    
    meals.forEach(mealType => {
      const meal = this.mealsData[mealType];
      if (meal.aliments.length === 0) {
        rows.push([mealsLabels[mealType], 'Aucun aliment', '-', '-']);
      } else {
        meal.aliments.forEach((aliment, index) => {
          rows.push([
            index === 0 ? mealsLabels[mealType] : '',
            aliment.aliment_nom || 'N/A',
            `${aliment.poids || 0}`,
            `${aliment.glucides_totaux || 0}`
          ]);
        });
      }
    });
    
    return rows;
  }

  buildTableRows() {
    return ['petit_dejeuner', 'dejeuner', 'diner'].map(mealType => {
      const meal = this.mealsData[mealType];
      const labels = { petit_dejeuner: '🌅 Petit Déjeuner', dejeuner: '☀️ Déjeuner', diner: '🌙 Dîner' };
      const totalGlucides = meal.aliments.reduce((sum, item) => sum + item.glucides_totaux, 0);

      return `<tr>
        <td><strong>${labels[mealType]}</strong></td>
        <td>${meal.glycemie_avant || '-'}</td>
        <td><strong>${totalGlucides.toFixed(1)}g</strong></td>
        <td>${meal.insuline || 0}u</td>
      </tr>`;
    }).join('');
  }

  buildFoodDetails() {
    return ['petit_dejeuner', 'dejeuner', 'diner'].map(mealType => {
      const meal = this.mealsData[mealType];
      const labels = { petit_dejeuner: '🌅 Petit Déjeuner', dejeuner: '☀️ Déjeuner', diner: '🌙 Dîner' };
      const totalGlucides = meal.aliments.reduce((sum, item) => sum + item.glucides_totaux, 0);

      if (meal.aliments.length === 0) {
        return `<div class="meal-block">
          <div class="meal-title">${labels[mealType]}</div>
          <div style="color: #999; font-style: italic;">Aucun aliment</div>
        </div>`;
      }

      return `<div class="meal-block">
        <div class="meal-title">${labels[mealType]}</div>
        ${meal.aliments.map(item => `
          <div>• <strong>${item.aliment_nom}</strong> (${item.poids}g) = ${item.glucides_totaux.toFixed(1)}g glucides</div>
        `).join('')}
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ccc; font-weight: bold; color: #667eea;">Total glucides: ${totalGlucides.toFixed(1)}g</div>
      </div>`;
    }).join('');
  }

  // ============ UTILITY ============
  showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert success';
    alert.textContent = message;
    this.alertsContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

  showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert error';
    alert.textContent = message;
    this.alertsContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

  clearAllData() {
    if (!confirm('Êtes-vous sûr ? Cette action est irréversible.')) return;
    this.mealsData = {
      'petit_dejeuner': { aliments: [], insuline: 0, insuline_correction: 0, glycemie_avant: null, glycemie_apres: null, resucrage: 0 },
      'dejeuner': { aliments: [], insuline: 0, insuline_correction: 0, glycemie_avant: null, glycemie_apres: null, resucrage: 0 },
      'diner': { aliments: [], insuline: 0, insuline_correction: 0, glycemie_avant: null, glycemie_apres: null, resucrage: 0 }
    };
    this.saveData();
    this.render();
    this.showSuccess('✅ Données effacées');
  }

  attachEvents() {
    const btnExport = document.getElementById('btn-export');
    const btnClear = document.getElementById('btn-clear-all');
    const btnHistory = document.getElementById('btn-history');
    
    if (btnExport) btnExport.onclick = () => this.exportReport();
    if (btnClear) btnClear.onclick = () => this.clearAllData();
    if (btnHistory) btnHistory.onclick = () => this.toggleHistoryPanel();
  }

  toggleHistoryPanel() {
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    
    if (!historySection) return;
    
    if (historySection.style.display === 'none') {
      this.loadHistoryPanel();
      historySection.style.display = 'block';
    } else {
      historySection.style.display = 'none';
    }
  }

  loadHistoryPanel() {
    const history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    const historyList = document.getElementById('history-list');
    
    if (!historyList) return;
    
    const dates = Object.keys(history).sort().reverse();
    
    if (dates.length === 0) {
      historyList.innerHTML = '<p style="color: #999; padding: 10px;">Aucun historique</p>';
      return;
    }
    
    historyList.innerHTML = dates.map(date => {
      const dayData = history[date];
      const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
      let totalGlucides = 0;
      let totalInsulime = 0;
      
      meals.forEach(mealType => {
        const meal = dayData[mealType];
        totalGlucides += (meal.aliments || []).reduce((sum, item) => sum + (item.glucides_totaux || 0), 0);
        totalInsulime += meal.insuline || 0;
      });
      
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });
      
      return `
        <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; border-left: 4px solid #667eea; cursor: pointer;" onclick="app.restoreHistoricalDay('${date}')">
          <div style="font-weight: 600; color: #333; margin-bottom: 5px;">📅 ${dateStr}</div>
          <div style="font-size: 12px; color: #666;">
            <span>📊 Glucides: ${totalGlucides.toFixed(1)}g</span> • 
            <span>💉 Insuline: ${totalInsulime}u</span>
          </div>
        </div>
      `;
    }).join('');
  }

  restoreHistoricalDay(date) {
    const history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    if (history[date]) {
      this.mealsData = JSON.parse(JSON.stringify(history[date]));
      this.saveData();
      this.render();
      this.showSuccess(`✅ Données du ${new Date(date).toLocaleDateString('fr-FR')} restaurées`);
      this.toggleHistoryPanel();
    }
  }

}

// Initialize
let app;
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded');
  app = new GluciApp();
  console.log('✅ App initialized successfully');
});
