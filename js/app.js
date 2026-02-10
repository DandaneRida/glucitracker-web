class GluciApp {
  constructor() {
    this.alimentsLoaded = false;
    this.aliments = [];
    this.searchTimeout = null;
    this.currentMeal = null;
    this.currentFood = null;
    this.currentLoadedDate = null; // Track la date chargée de l'historique

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
      basale: 0,
      insulinSensitivity: 0,
      ratioPetitDejeuner: 0,
      ratioDejeuner: 0,
      ratioDiner: 0
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
        doseRepas: 0,
        doseCorrection: 0,
        doseTotale: 0,
        correctionTroisHeures: 0,
        date: new Date().toISOString().split('T')[0]
      },
      'dejeuner': {
        aliments: [],
        insuline: 0,
        insuline_correction: 0,
        glycemie_avant: null,
        glycemie_apres: null,
        resucrage: 0,
        doseRepas: 0,
        doseCorrection: 0,
        doseTotale: 0,
        correctionTroisHeures: 0,
        date: new Date().toISOString().split('T')[0]
      },
      'diner': {
        aliments: [],
        insuline: 0,
        insuline_correction: 0,
        glycemie_avant: null,
        glycemie_apres: null,
        resucrage: 0,
        doseRepas: 0,
        doseCorrection: 0,
        doseTotale: 0,
        correctionTroisHeures: 0,
        date: new Date().toISOString().split('T')[0]
      }
    };

    // S'assurer que tous les champs existent (pour la compatibilité avec les anciennes données)
    this.ensureMealFields();

    // Alertes
    this.alertsContainer = document.getElementById('alerts-container');
    
    // Afficher les infos patient
    const patientNameInput = document.getElementById('patient-name');
    const patientBasaleInput = document.getElementById('patient-basale');
    const insulinSensitivityInput = document.getElementById('patient-insulin-sensitivity');
    const ratioPDInput = document.getElementById('patient-ratio-petit-dejeuner');
    const ratioDejeunerInput = document.getElementById('patient-ratio-dejeuner');
    const ratioDinerInput = document.getElementById('patient-ratio-diner');
    
    if (patientNameInput) {
      patientNameInput.value = this.patientData.nom || '';
      patientNameInput.onchange = () => this.savePatientData();
    }
    if (patientBasaleInput) {
      patientBasaleInput.value = this.patientData.basale || 0;
      patientBasaleInput.onchange = () => this.savePatientData();
    }
    if (insulinSensitivityInput) {
      insulinSensitivityInput.value = this.patientData.insulinSensitivity || 0;
      insulinSensitivityInput.onchange = () => this.savePatientData();
    }
    if (ratioPDInput) {
      ratioPDInput.value = this.patientData.ratioPetitDejeuner || 0;
      ratioPDInput.onchange = () => this.savePatientData();
    }
    if (ratioDejeunerInput) {
      ratioDejeunerInput.value = this.patientData.ratioDejeuner || 0;
      ratioDejeunerInput.onchange = () => this.savePatientData();
    }
    if (ratioDinerInput) {
      ratioDinerInput.value = this.patientData.ratioDiner || 0;
      ratioDinerInput.onchange = () => this.savePatientData();
    }
    
    // Calculer les doses pour tous les repas
    ['petit_dejeuner', 'dejeuner', 'diner'].forEach(mealType => {
      this.calculateDoses(mealType);
    });
    
    console.log('✅ loadData() terminé');
  }

  savePatientData() {
    this.patientData.nom = document.getElementById('patient-name').value;
    this.patientData.basale = parseFloat(document.getElementById('patient-basale').value) || 0;
    this.patientData.insulinSensitivity = parseFloat(document.getElementById('patient-insulin-sensitivity').value) || 0;
    this.patientData.ratioPetitDejeuner = parseFloat(document.getElementById('patient-ratio-petit-dejeuner').value) || 0;
    this.patientData.ratioDejeuner = parseFloat(document.getElementById('patient-ratio-dejeuner').value) || 0;
    this.patientData.ratioDiner = parseFloat(document.getElementById('patient-ratio-diner').value) || 0;
    localStorage.setItem('patient_data', JSON.stringify(this.patientData));
    
    // Recalculer les doses avec les nouveaux ratios/sensibilité
    ['petit_dejeuner', 'dejeuner', 'diner'].forEach(mealType => {
      this.calculateDoses(mealType);
    });
    
    this.render();
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
      this.showSuccess(`${this.aliments.length} aliments Ciqual chargés`);
    } catch (error) {
      console.error('Erreur chargement aliments:', error);
      this.hideLoadingIndicator();
      this.showError('Impossible de charger les aliments');
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
    // Si on modifie à partir de l'historique, revenir à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (this.currentLoadedDate && this.currentLoadedDate !== today) {
      this.currentLoadedDate = null;
      this.showInfo('Retour aux données d\'aujourd\'hui');
    }
    
    if (!this.currentFood) {
      this.showError('Sélectionnez un aliment');
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
    this.calculateDoses(mealType);
    this.saveData();
    this.render();
    this.showSuccess(`${this.currentFood.nom} (${poids}g) ajouté`);

    document.getElementById(`food-search-${mealType}`).value = '';
    weightInput.value = '';
    this.currentFood = null;
  }

  deleteFoodFromMeal(mealType, id) {
    // Si on modifie à partir de l'historique, revenir à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (this.currentLoadedDate && this.currentLoadedDate !== today) {
      this.currentLoadedDate = null;
      this.showInfo('Retour aux données d\'aujourd\'hui');
    }
    
    this.mealsData[mealType].aliments = this.mealsData[mealType].aliments.filter(f => f.id !== id);
    this.saveData();
    this.calculateDoses(mealType);
    this.saveData();
    this.render();
    this.showSuccess('Aliment supprimé');
  }

  // ============ VALIDATION DU REPAS ============
  validateMeal(mealType) {
    const meal = this.mealsData[mealType];
    
    // Vérifier qu'il y a au moins une glycémie avant
    if (!meal.glycemie_avant) {
      this.showError('Veuillez remplir la glycémie AVANT le repas');
      return;
    }

    // Calculer les doses
    this.calculateDoses(mealType);
    meal.validated = true;
    this.saveData();
    this.render();
    
    // Afficher un message de succès
    this.showSuccess(`Repas validé! Dose totale: ${meal.doseTotale.toFixed(2)}u`);
  }

  // ============ MISE À JOUR DES VALEURS ============
  updateMealValue(mealType, field, value) {
    // Si on modifie à partir de l'historique, revenir à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (this.currentLoadedDate && this.currentLoadedDate !== today) {
      this.currentLoadedDate = null;
      this.showInfo('Retour aux données d\'aujourd\'hui');
    }
    
    this.mealsData[mealType][field] = value;
    this.saveData();
    this.render();
  }

  updateMealValueAndCalculate(mealType, field, value) {
    // Si on modifie à partir de l'historique, revenir à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (this.currentLoadedDate && this.currentLoadedDate !== today) {
      this.currentLoadedDate = null;
      this.showInfo('Retour aux données d\'aujourd\'hui');
    }
    
    this.mealsData[mealType][field] = value;
    this.calculateDoses(mealType);
    this.saveData();
    this.render();
  }

  // ============ CALCUL DES DOSES D'INSULINE ============
  calculateDoses(mealType) {
    const meal = this.mealsData[mealType];
    const ratio = this.getRatioForMeal(mealType);
    const sensitivity = parseFloat(this.patientData.insulinSensitivity) || 0;
    
    // Récupérer les valeurs
    const totalGlucides = meal.aliments.reduce((sum, item) => sum + item.glucides_totaux, 0);
    const glycemieBefore = parseFloat(meal.glycemie_avant) || 0;
    
    // 1. Dose pour manger = (total glucides / 10) * ratio repas
    meal.doseRepas = ratio > 0 ? (totalGlucides / 10) * ratio : 0;
    
    // 2. Dose de correction (si glycémie > 1.2 g/L = 120 mg/dL)
    // En France on utilise g/L, 1.2 g/L = 120 mg/dL
    meal.doseCorrection = 0;
    if (glycemieBefore > 1.2) {
      meal.doseCorrection = sensitivity > 0 ? (glycemieBefore - 1.2) / sensitivity : 0;
    }
    
    // 3. Dose totale = dose pour manger + dose correction
    // Avec ajustements selon glycémie
    let doseTotale = meal.doseRepas + meal.doseCorrection;
    
    if (glycemieBefore >= 0.7 && glycemieBefore <= 1.0) {
      doseTotale = Math.max(0, doseTotale - 1);
    } else if (glycemieBefore < 0.7) {
      doseTotale = Math.max(0, doseTotale - 2);
      meal.needsResucrage = true;
    } else {
      meal.needsResucrage = false;
    }
    
    meal.doseTotale = doseTotale;
    
    // 4. Correction 3h après (si glycémie > 1.4 g/L)
    const glycemieApres = parseFloat(meal.glycemie_apres) || 0;
    meal.correctionTroisHeures = 0;
    if (glycemieApres > 1.4) {
      meal.correctionTroisHeures = sensitivity > 0 ? (glycemieApres - 1.4) / sensitivity : 0;
    }
    
    this.saveData();
  }

  getRatioForMeal(mealType) {
    const ratios = {
      'petit_dejeuner': this.patientData.ratioPetitDejeuner,
      'dejeuner': this.patientData.ratioDejeuner,
      'diner': this.patientData.ratioDiner
    };
    return parseFloat(ratios[mealType]) || 0;
  }

  // ============ INITIALISER LES CHAMPS DE REPAS ============
  ensureMealFields() {
    const defaultMealTemplate = {
      aliments: [],
      insuline: 0,
      insuline_correction: 0,
      glycemie_avant: null,
      glycemie_apres: null,
      resucrage: 0,
      doseRepas: 0,
      doseCorrection: 0,
      doseTotale: 0,
      correctionTroisHeures: 0,
      needsResucrage: false,
      validated: false
    };

    const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
    meals.forEach(mealType => {
      if (!this.mealsData[mealType]) {
        this.mealsData[mealType] = { ...defaultMealTemplate };
      } else {
        // Ajouter les champs manquants
        const meal = this.mealsData[mealType];
        if (meal.doseRepas === undefined) meal.doseRepas = 0;
        if (meal.doseCorrection === undefined) meal.doseCorrection = 0;
        if (meal.doseTotale === undefined) meal.doseTotale = 0;
        if (meal.correctionTroisHeures === undefined) meal.correctionTroisHeures = 0;
        if (meal.needsResucrage === undefined) meal.needsResucrage = false;
        if (meal.validated === undefined) meal.validated = false;
      }
    });
  }

  // ============ RENDER ============
  render() {
    const container = document.getElementById('meals-container');
    if (!container) return;

    const mealsToRender = [
      { type: 'petit_dejeuner', label: 'Petit Déjeuner' },
      { type: 'dejeuner', label: 'Déjeuner' },
      { type: 'diner', label: 'Dîner' }
    ];

    container.innerHTML = mealsToRender.map(meal => this.renderMealBlock(meal.type, meal.label)).join('');
  }

  renderMealBlock(mealType, label) {
    const meal = this.mealsData[mealType];
    const totalGlucides = meal.aliments.reduce((sum, item) => sum + item.glucides_totaux, 0);

    return `
      <div class="meal-block">
        <div class="meal-block-title">${label}</div>
        
        ${meal.validated ? `
          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <div style="color: #2e7d32; font-weight: bold; font-size: 12px; margin-bottom: 8px;">REPAS VALIDÉ</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
              <div>
                <span style="color: #666; display: block; font-size: 11px;">Dose pour manger</span>
                <span style="color: #2e7d32; font-weight: bold; font-size: 14px;">${meal.doseRepas.toFixed(2)} u</span>
              </div>
              <div>
                <span style="color: #666; display: block; font-size: 11px;">Dose de correction</span>
                <span style="color: #2e7d32; font-weight: bold; font-size: 14px;">${meal.doseCorrection.toFixed(2)} u</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <span style="color: #666; display: block; font-size: 11px;">DOSE TOTALE À INJECTER</span>
                <span style="color: #1565c0; font-weight: bold; font-size: 16px;">${meal.doseTotale.toFixed(2)} u</span>
              </div>
            </div>
          </div>
        ` : ``}
        
        <!-- Glycémie AVANT -->
        <div class="meal-section">
          <label>Glycémie AVANT le repas (g/L)</label>
          <input type="number" 
            value="${meal.glycemie_avant || ''}" 
            placeholder="Ex: 1.25"
            min="0.1" max="6"
            step="0.1"
            onchange="app.updateMealValueAndCalculate('${mealType}', 'glycemie_avant', this.value)"
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
        <!-- SUPPRIMÉ - Les doses sont calculées automatiquement -->

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

        <!-- Bouton Valider -->
        <div class="meal-section">
          <button onclick="app.validateMeal('${mealType}')" class="btn-validate">
            <i class="fas fa-check-circle"></i> Valider le repas
          </button>
        </div>

        <!-- SECTION DES CALCULS D'INSULINE -->
        <div class="calculation-section">
          <label>Calculs d'Insuline</label>
          
          <div class="calculation-input-group">
            <div>
              <label>Ratio du repas (u par 10g)</label>
              <span class="calculation-result">${this.getRatioForMeal(mealType).toFixed(2)} u/10g</span>
            </div>
            <div>
              <label>Indice de sensibilité</label>
              <span class="calculation-result">${(this.patientData.insulinSensitivity || 0).toFixed(2)} g/u</span>
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 12px 0;">

          <div class="calculation-input-group">
            <div>
              <label>💊 Dose pour manger</label>
              <span class="calculation-result">${meal.doseRepas.toFixed(2)} u</span>
              <small>(glucides ÷ 10) × ratio</small>
            </div>
            <div>
              <label>🔄 Dose de correction</label>
              <span class="calculation-result">${meal.doseCorrection.toFixed(2)} u</span>
              <small>si glyc. > 1.2</small>
            </div>
          </div>

          <div style="background: white; padding: 15px; border-radius: 8px; border-left: 5px solid #667eea; margin: 15px 0;">
            <label style="font-weight: 700; color: #667eea; font-size: 13px; margin-bottom: 8px; display: block;">DOSE TOTALE À INJECTER</label>
            <span class="calculation-result" style="font-size: 20px; margin: 0;">${meal.doseTotale.toFixed(2)} u</span>
            <small style="display: block; color: #999; font-size: 11px; margin-top: 8px;">
              ${meal.needsResucrage ? 'Besoin de resucrage (glyc. < 0.7)' : ''}
              ${meal.glycemie_avant && parseFloat(meal.glycemie_avant) >= 0.7 && parseFloat(meal.glycemie_avant) <= 1.0 ? '📉 Dose réduite de 1u (glyc. 0.7-1.0)' : ''}
            </small>
          </div>

          <div class="calculation-input-group">
            <div>
              <label>⏰ Correction 3h après</label>
              <span class="calculation-result">${meal.correctionTroisHeures.toFixed(2)} u</span>
              <small>si glyc. après > 1.4</small>
            </div>
          </div>
        </div>

        <!-- Glycémie APRÈS (3-4h) -->
        <div class="meal-section">
          <label>Glycémie APRÈS le repas 3-4h (g/L)</label>
          <input type="number" 
            value="${meal.glycemie_apres || ''}" 
            placeholder="Ex: 1.40"
            min="0.1" max="6"
            step="0.1"
            onchange="app.updateMealValueAndCalculate('${mealType}', 'glycemie_apres', this.value)"
            class="meal-input">
        </div>

        <!-- Bouton Vider le repas -->
        <div class="meal-section" style="margin-top: 15px;">
          <button onclick="app.clearMealData('${mealType}')" class="btn-danger" style="width: 100%; padding: 12px; border: 2px solid #f44336; border-radius: 8px; background: rgba(244, 67, 54, 0.1); color: #f44336; font-weight: 600; cursor: pointer;">
            <i class="fas fa-trash-alt"></i> Vider ce repas
          </button>
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

<h1>GluciTracker - Rapport de Suivi</h1>
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

<h2>Détail des Aliments par Repas</h2>
${this.buildFoodDetails()}
`;
    
    return htmlContent;
  }

  // ============ EXPORT RAPPORT (PDF) ============
  exportReport() {
    try {
      this.showSuccess('Génération du PDF en cours...'); 
      
      // Déterminer quelle date utiliser
      const reportDate = this.currentLoadedDate ? new Date(this.currentLoadedDate + 'T00:00:00') : new Date();
      const dateStr = reportDate.toLocaleDateString('fr-FR');
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      let yPos = 15;
      
      // ===== HEADER STYLISÉ =====
      // Couleur de fond pour le header
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, 210, 25, 'F');
      
      // Titre principal
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('GluciTracker', 105, 12, { align: 'center' });
      
      // Sous-titre
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Suivi Glycémie • Insuline • Repas', 105, 19, { align: 'center' });
      
      yPos = 32;
      
      // ===== BLOC INFOS PATIENT =====
      doc.setFillColor(240, 247, 255);
      doc.rect(20, yPos - 2, 170, 38, 'F');
      
      // Bordure
      doc.setDrawColor(102, 126, 234);
      doc.setLineWidth(0.5);
      doc.rect(20, yPos - 2, 170, 38);
      
      // Titre du bloc
      doc.setFontSize(9);
      doc.setTextColor(102, 126, 234);
      doc.setFont(undefined, 'bold');
      doc.text('INFORMATIONS PATIENT', 22, yPos + 2);
      
      // Infos en colonnes - Ligne 1
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, 'bold');
      
      const leftCol = 22;
      const rightCol = 105;
      let infoY = yPos + 8;
      
      doc.text('Patient:', leftCol, infoY);
      doc.setFont(undefined, 'normal');
      doc.text(this.patientData.nom || 'Non renseigné', leftCol + 18, infoY);
      
      doc.setFont(undefined, 'bold');
      doc.text('Date:', rightCol, infoY);
      doc.setFont(undefined, 'normal');
      doc.text(dateStr, rightCol + 12, infoY);
      
      // Ligne 2
      infoY += 5;
      doc.setFont(undefined, 'bold');
      doc.text('Dose Basale:', leftCol, infoY);
      doc.setFont(undefined, 'normal');
      doc.text(`${this.patientData.basale || '-'} u`, leftCol + 22, infoY);
      
      doc.setFont(undefined, 'bold');
      doc.text('Indice Sensibilité:', rightCol, infoY);
      doc.setFont(undefined, 'normal');
      doc.text(`${this.patientData.insulinSensitivity || '-'} g/u`, rightCol + 30, infoY);
      
      // Ligne 3 - Ratios
      infoY += 5;
      doc.setFont(undefined, 'bold');
      doc.text('Ratios Insuline:', leftCol, infoY);
      doc.setFont(undefined, 'normal');
      doc.text(`PD: ${this.patientData.ratioPetitDejeuner || '-'} u | Déj: ${this.patientData.ratioDejeuner || '-'} u | Dî: ${this.patientData.ratioDiner || '-'} u`, leftCol + 27, infoY);
      
      yPos += 44;
      
      // ===== TABLEAU RÉSUMÉ DES REPAS =====
      doc.setFontSize(11);
      doc.setTextColor(102, 126, 234);
      doc.setFont(undefined, 'bold');
      doc.text('RESUME DES REPAS', 20, yPos);
      yPos += 7;
      
      // Entête tableau (7 colonnes) - Agrandir
      const headers = ['Repas', 'Gly.Av', 'Glucides', 'Dose Repas', 'Dose Corr.', 'Dose Total', 'Gly.Ap'];
      const colWidths = [24, 18, 18, 22, 22, 22, 22];
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      
      // Dessiner l'en-tête avec bordure
      doc.setFillColor(102, 126, 234);
      doc.rect(20, yPos, totalWidth, 8, 'F');
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
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
        doc.line(xPos, yPos, xPos, yPos + 8);
        if (i < headers.length) xPos += colWidths[i];
      }
      
      yPos += 8;
      
      // Données tableau repas
      const mealData = this.buildTableRowsForPDF();
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      
      mealData.forEach((row, index) => {
        // Fond alterné
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, totalWidth, 7, 'F');
        }
        
        // Texte
        xPos = 20;
        row.forEach((cell, i) => {
          doc.text(cell, xPos + colWidths[i] / 2, yPos + 4, { align: 'center' });
          xPos += colWidths[i];
        });
        
        // Bordures
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        xPos = 20;
        for (let i = 0; i <= headers.length; i++) {
          doc.line(xPos, yPos, xPos, yPos + 7);
          if (i < headers.length) xPos += colWidths[i];
        }
        
        yPos += 7;
      });
      
      yPos += 10;
      
      // ===== TABLEAU DÉTAIL DES ALIMENTS =====
      doc.setFontSize(11);
      doc.setTextColor(102, 126, 234);
      doc.setFont(undefined, 'bold');
      doc.text('DETAIL DES ALIMENTS', 20, yPos);
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
      
      // Télécharger
      doc.save(`Rapport_Gluci_${this.patientData.nom || 'Suivi'}_${new Date().toISOString().split('T')[0]}.pdf`);
      this.showSuccess('✅ PDF du jour téléchargé !');
    } catch (error) {
      console.error('Erreur PDF:', error);
      this.showError('❌ Erreur lors de la génération du PDF');
    }
  }

  clearPatientData() {
    if (confirm('Êtes-vous sûr de vouloir effacer les informations du patient?\n\nCette action est irréversible.')) {
      this.patientData = {
        nom: '',
        basale: 0,
        insulinSensitivity: 0,
        ratioPetitDejeuner: 0,
        ratioDejeuner: 0,
        ratioDiner: 0
      };
      this.savePatientData();
      this.render();
      this.showSuccess('Infos patient effacées');
    }
  }

  clearMealData(mealType) {
    // Si on modifie à partir de l'historique, revenir à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (this.currentLoadedDate && this.currentLoadedDate !== today) {
      this.currentLoadedDate = null;
      this.showInfo('Retour aux données d\'aujourd\'hui');
    }
    
    const labels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
    if (confirm(`Effacer les données de ${labels[mealType]}?`)) {
      this.mealsData[mealType] = {
        aliments: [],
        glycemie_avant: null,
        glycemie_apres: null,
        resucrage: 0,
        doseRepas: 0,
        doseCorrection: 0,
        doseTotale: 0,
        correctionTroisHeures: 0,
        validated: false
      };
      this.saveData();
      this.render();
      this.showSuccess(`${labels[mealType]} effacé`);
    }
  }
  
  addHistoryPages(doc) {
    const history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    const dates = Object.keys(history).sort().reverse();
    
    if (dates.length <= 1) return; // Seulement aujourd'hui
    
    dates.slice(1, 11).forEach(date => {
      doc.addPage();
      let yPos = 15;
      
      // Header historique
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, 210, 15, 'F');
      
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('HISTORIQUE', 20, 10);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 20, 14.5);
      
      yPos = 25;
      
      const dayData = history[date];
      const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
      const mealsLabels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
      
      // Mini tableau pour cette journée
      const headers = ['Repas', 'Glyc. Avant', 'Glucides', 'Dose Repas', 'Dose Corr.', 'Dose Total', 'Glyc. Après'];
      const colWidths = [22, 20, 18, 18, 18, 18, 20];
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
          `${(meal.doseRepas || 0).toFixed(2)}u`,
          `${(meal.doseCorrection || 0).toFixed(2)}u`,
          `${(meal.doseTotale || 0).toFixed(2)}u`,
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
        `${meal.doseRepas.toFixed(2)}u`,
        `${meal.doseCorrection.toFixed(2)}u`,
        `${meal.doseTotale.toFixed(2)}u`,
        meal.glycemie_apres !== null ? `${meal.glycemie_apres}` : '-'
      ]);
    });
    
    return rows;
  }

  buildDosesTableForPDF() {
    const rows = [];
    const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
    const mealsLabels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
    
    meals.forEach(mealType => {
      const meal = this.mealsData[mealType];
      rows.push([
        mealsLabels[mealType],
        `${meal.doseRepas.toFixed(2)}u`,
        `${meal.doseCorrection.toFixed(2)}u`,
        `${meal.doseTotale.toFixed(2)}u`,
        `${meal.correctionTroisHeures.toFixed(2)}u`
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

  showInfo(message) {
    const alert = document.createElement('div');
    alert.className = 'alert info';
    alert.textContent = message;
    alert.style.backgroundColor = '#DBEAFE';
    alert.style.color = '#0369a1';
    this.alertsContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

  clearAllData() {
    if (!confirm('Êtes-vous sûr ? Cette action est irréversible.')) return;
    this.mealsData = {
      'petit_dejeuner': { aliments: [], insuline: 0, insuline_correction: 0, glycemie_avant: null, glycemie_apres: null, resucrage: 0, doseRepas: 0, doseCorrection: 0, doseTotale: 0, correctionTroisHeures: 0 },
      'dejeuner': { aliments: [], insuline: 0, insuline_correction: 0, glycemie_avant: null, glycemie_apres: null, resucrage: 0, doseRepas: 0, doseCorrection: 0, doseTotale: 0, correctionTroisHeures: 0 },
      'diner': { aliments: [], insuline: 0, insuline_correction: 0, glycemie_avant: null, glycemie_apres: null, resucrage: 0, doseRepas: 0, doseCorrection: 0, doseTotale: 0, correctionTroisHeures: 0 }
    };
    this.saveData();
    this.render();
    this.showSuccess('✅ Données effacées');
  }

  attachEvents() {
    const btnExport = document.getElementById('btn-export');
    const btnClear = document.getElementById('btn-clear-all');
    const btnHistory = document.getElementById('btn-history');
    const btnClearPatient = document.getElementById('btn-clear-patient');
    
    if (btnExport) btnExport.onclick = () => this.exportReport();
    if (btnClear) btnClear.onclick = () => this.clearAllData();
    if (btnHistory) btnHistory.onclick = () => this.toggleHistoryPanel();
    if (btnClearPatient) btnClearPatient.onclick = () => this.clearPatientData();
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
          <div style="font-weight: 600; color: #333; margin-bottom: 5px;">${dateStr}</div>
          <div style="font-size: 12px; color: #666;">
            <span>Glucides: ${totalGlucides.toFixed(1)}g</span> • 
            <span>Insuline: ${totalInsulime}u</span>
          </div>
        </div>
      `;
    }).join('');
  }

  restoreHistoricalDay(date) {
    const history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    if (history[date]) {
      this.mealsData = JSON.parse(JSON.stringify(history[date]));
      this.currentLoadedDate = date; // Tracker la date chargée
      this.saveData();
      this.render();
      this.showSuccess(`Données du ${new Date(date + 'T00:00:00').toLocaleDateString('fr-FR')} restaurées`);
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
