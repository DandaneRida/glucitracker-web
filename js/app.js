class GluciApp {
  constructor() {
    this.alimentsLoaded = false;
    this.aliments = [];
    this.searchTimeout = null;
    this.currentMeal = null;
    this.currentFood = null;
    this.currentLoadedDate = null; // Track la date chargée de l'historique
    this.urineTests = [];

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

    const urineTestsData = localStorage.getItem('urine_tests_data');
    const todayStr = new Date().toISOString().split('T')[0];

    // Charger ou initialiser les tests urinaires
    if (urineTestsData) {
      const parsed = JSON.parse(urineTestsData);
      if (parsed.date === todayStr) {
        this.urineTests = parsed.tests || [];
      } else {
        this.urineTests = [];
      }
    } else {
      this.urineTests = [];
    }

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
    localStorage.setItem('urine_tests_data', JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      tests: this.urineTests
    }));
    this.saveHistoricalData();
  }

  saveHistoricalData() {
    const today = new Date().toISOString().split('T')[0];
    let history = JSON.parse(localStorage.getItem('meals_history') || '{}');
    let urineHistory = JSON.parse(localStorage.getItem('urine_history') || '{}');

    // Garder seulement les 10 derniers jours
    const dates = Object.keys(history).sort().reverse().slice(0, 9);
    const newHistory = { [today]: JSON.parse(JSON.stringify(this.mealsData)) };
    const newUrineHistory = { [today]: JSON.parse(JSON.stringify(this.urineTests)) };

    dates.forEach(date => {
      newHistory[date] = history[date];
      if (urineHistory[date]) {
        newUrineHistory[date] = urineHistory[date];
      }
    });

    localStorage.setItem('meals_history', JSON.stringify(newHistory));
    localStorage.setItem('urine_history', JSON.stringify(newUrineHistory));
  }

  // ============ CHARGER ALIMENTS (JS LOCAL) ============
  async loadAlimentsFromJSON() {
    try {
      if (window.CIQUAL_DATA && window.CIQUAL_DATA.aliments) {
        this.aliments = window.CIQUAL_DATA.aliments;
        this.alimentsLoaded = true;
        this.hideLoadingIndicator();
        this.showSuccess(`${this.aliments.length} aliments Ciqual chargés`);
      } else {
        throw new Error('Données ciqual-complete.js absentes ou invalides.');
      }
    } catch (error) {
      console.error('Erreur chargement aliments:', error);
      this.hideLoadingIndicator();
      this.showError('Impossible de charger les aliments. Vérifiez ciqual-complete.js');
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

  // ============ ALIMENT PERSONNALISÉ ============
  toggleCustomFood(mealType) {
    const section = document.getElementById(`custom-food-section-${mealType}`);
    if (section) {
      if (section.style.display === 'none') {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    }
  }

  addCustomFood(mealType) {
    // Si on modifie à partir de l'historique, revenir à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (this.currentLoadedDate && this.currentLoadedDate !== today) {
      this.currentLoadedDate = null;
    }

    const nom = document.getElementById(`custom-food-name-${mealType}`).value;
    const unit = document.getElementById(`custom-food-unit-${mealType}`).value;
    const carbs = parseFloat(document.getElementById(`custom-food-carbs-${mealType}`).value);
    const quantity = parseFloat(document.getElementById(`custom-food-qty-${mealType}`).value);

    if (!nom) {
      this.showError('Saisissez un nom (ex: Hrira)');
      return;
    }
    if (isNaN(carbs) || carbs < 0) {
      this.showError('Teneur en glucides invalide');
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      this.showError('Quantité invalide');
      return;
    }

    let glucidesTotaux = 0;
    let desc = "";
    if (unit === '100g' || unit === '100ml') {
      glucidesTotaux = (carbs * quantity) / 100;
      desc = `${quantity}${unit.replace('100', '')}`;
    } else { // 1 bol, 1 part, etc.
      glucidesTotaux = carbs * quantity;
      desc = `${quantity} ${unit}`;
    }

    this.mealsData[mealType].aliments.push({
      id: Date.now(),
      aliment_nom: nom,
      poids: desc, // Stocker la description de quantité à la place du poids en g
      glucides: carbs,
      glucides_totaux: glucidesTotaux,
      isCustom: true
    });

    this.saveData();
    this.calculateDoses(mealType);
    this.saveData();
    this.render();
    this.showSuccess(`Aliment personnalisé ajouté`);
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
      validated: false,
      commentaire_glycemie_avant: '',
      commentaire_glycemie_apres: '',
      commentaire_resucrage: '',
      commentaire_repas: ''
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
        if (meal.commentaire_glycemie_avant === undefined) meal.commentaire_glycemie_avant = '';
        if (meal.commentaire_glycemie_apres === undefined) meal.commentaire_glycemie_apres = '';
        if (meal.commentaire_resucrage === undefined) meal.commentaire_resucrage = '';
        if (meal.commentaire_repas === undefined) meal.commentaire_repas = '';
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
    this.renderUrineTests();
  }

  // ============ TESTS URINAIRES ============

  renderUrineTests() {
    const listContainer = document.getElementById('urine-tests-list');
    if (!listContainer) return;

    if (this.urineTests.length === 0) {
      listContainer.innerHTML = '<p style="color: #999; font-style: italic; text-align: center;">Aucun test urinaire enregistré pour aujourd\'hui.</p>';
      return;
    }

    listContainer.innerHTML = this.urineTests.map(test => `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 15px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <button onclick="app.deleteUrineTest(${test.id})" class="btn-delete" style="position: absolute; top: 15px; right: 15px; width: 28px; height: 28px;">✕</button>
        <div style="font-weight: bold; color: #4F46E5; margin-bottom: 12px; font-size: 15px;">
          <i class="far fa-clock"></i> Test du ${test.date || new Date().toISOString().split('T')[0]} à ${test.time}
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 15px;">
          <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 13px;">
            <span style="color: #64748b; display: block; font-size: 11px;">Glucose</span>
            <strong>${test.glucose}</strong>
          </div>
          <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 13px;">
            <span style="color: #64748b; display: block; font-size: 11px;">Cétones</span>
            <strong>${test.ketones}</strong>
          </div>
          <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 13px;">
            <span style="color: #64748b; display: block; font-size: 11px;">Sang</span>
            <strong>${test.blood}</strong>
          </div>
          <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 13px;">
            <span style="color: #64748b; display: block; font-size: 11px;">Protéines</span>
            <strong>${test.proteins}</strong>
          </div>
          <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 13px;">
            <span style="color: #64748b; display: block; font-size: 11px;">Nitrites</span>
            <strong>${test.nitrites}</strong>
          </div>
          <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 13px;">
            <span style="color: #64748b; display: block; font-size: 11px;">PH</span>
            <strong>${test.ph}</strong>
          </div>
        </div>

        ${test.comment ? `
          <div style="background: #fef9c3; padding: 10px; border-radius: 6px; font-size: 13px; color: #854d0e; margin-bottom: 12px;">
            <i class="fas fa-comment"></i> ${test.comment}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  addUrineTestForm() {
    const container = document.getElementById('urine-tests-container');
    if (!container) return;

    if (document.getElementById('new-urine-test-form')) {
      document.getElementById('new-urine-test-form').remove();
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    container.innerHTML = `
      <div id="new-urine-test-form" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 15px; animation: slideIn 0.3s ease;">
        <h4 style="color: #4F46E5; margin-bottom: 15px; font-size: 15px;">Nouveau Test Urinaire</h4>
        
        <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 5px; display: block;">Jour du test</label>
              <input type="date" id="ut-date" value="${new Date().toISOString().split('T')[0]}" class="meal-input">
            </div>
            <div>
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 5px; display: block;">Heure du test</label>
              <input type="time" id="ut-time" value="${timeStr}" class="meal-input">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">Glucose</label>
              <select id="ut-glucose" class="meal-input" style="padding: 8px;">
                <option value="Négatif">Négatif</option>
                <option value="Trace">Trace</option>
                <option value="+">+</option>
                <option value="++">++</option>
                <option value="+++">+++</option>
                <option value="++++">++++</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">Corps Cétoniques</label>
              <select id="ut-ketones" class="meal-input" style="padding: 8px;">
                <option value="Négatif">Négatif</option>
                <option value="Trace">Trace</option>
                <option value="+">+</option>
                <option value="++">++</option>
                <option value="+++">+++</option>
                <option value="++++">++++</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">Sang</label>
              <select id="ut-blood" class="meal-input" style="padding: 8px;">
                <option value="Négatif">Négatif</option>
                <option value="Positif">Positif</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">Protéines</label>
              <select id="ut-proteins" class="meal-input" style="padding: 8px;">
                <option value="Négatif">Négatif</option>
                <option value="Trace">Trace</option>
                <option value="+">+</option>
                <option value="++">++</option>
                <option value="+++">+++</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">Nitrites</label>
              <select id="ut-nitrites" class="meal-input" style="padding: 8px;">
                <option value="Négatif">Négatif</option>
                <option value="Positif">Positif</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: block;">PH</label>
              <input type="number" id="ut-ph" step="0.5" value="6.0" min="4" max="9" class="meal-input" style="padding: 8px;">
            </div>
          </div>

          <div>
            <label style="font-size: 13px; font-weight: 600; margin-bottom: 5px; display: block;">Commentaire</label>
            <input type="text" id="ut-comment" placeholder="Fiévreux, déshydraté..." class="meal-input">
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button onclick="document.getElementById('new-urine-test-form').remove()" class="btn-secondary" style="flex: 1;">Annuler</button>
            <button onclick="app.saveUrineTest()" class="btn-primary" style="flex: 2;">Enregistrer le test</button>
          </div>
        </div>
      </div>
    `;
  }

  saveUrineTest() {
    const dateInput = document.getElementById('ut-date');
    const time = document.getElementById('ut-time').value;
    const glucose = document.getElementById('ut-glucose').value;
    const ketones = document.getElementById('ut-ketones').value;
    const blood = document.getElementById('ut-blood').value;
    const proteins = document.getElementById('ut-proteins').value;
    const nitrites = document.getElementById('ut-nitrites').value;
    const ph = document.getElementById('ut-ph').value;
    const comment = document.getElementById('ut-comment').value;

    if (!time) {
      this.showError('L\'heure est obligatoire');
      return;
    }

    const newTest = {
      id: Date.now(),
      date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
      time, glucose, ketones, blood, proteins, nitrites, ph, comment
    };

    this.urineTests.push(newTest);
    this.finalizeUrineTestSave();
  }

  finalizeUrineTestSave() {
    this.saveData();
    const form = document.getElementById('new-urine-test-form');
    if (form) form.remove();
    this.renderUrineTests();
    this.showSuccess('Test urinaire enregistré');
  }

  deleteUrineTest(id) {
    if (confirm('Supprimer ce test urinaire ?')) {
      this.urineTests = this.urineTests.filter(t => t.id !== id);
      this.saveData();
      this.renderUrineTests();
      this.showSuccess('Test supprimé');
    }
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
          <div style="display: flex; gap: 10px;">
            <input type="number" 
              value="${meal.glycemie_avant || ''}" 
              placeholder="Ex: 1.25"
              min="0.1" max="6"
              step="0.1"
              onchange="app.updateMealValueAndCalculate('${mealType}', 'glycemie_avant', this.value)"
              class="meal-input" style="flex: 1;">
            <button onclick="document.getElementById('comment-avant-${mealType}').style.display = 'block'" class="btn-secondary" style="padding: 0 15px;" title="Ajouter un commentaire">💬</button>
          </div>
          <input type="text" id="comment-avant-${mealType}" 
            value="${meal.commentaire_glycemie_avant || ''}" 
            placeholder="Commentaire sur la glycémie avant..." 
            onchange="app.updateMealValue('${mealType}', 'commentaire_glycemie_avant', this.value)"
            class="meal-input" style="margin-top: 8px; font-size: 13px; font-style: italic; background: #f8fafc; display: ${meal.commentaire_glycemie_avant ? 'block' : 'none'};">
        </div>

        <!-- Aliments -->
        <div class="meal-section">
          <label>Ajouter des aliments de la base</label>
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

          <div style="margin-top: 15px; text-align: center;">
            <button onclick="app.toggleCustomFood('${mealType}')" class="btn-secondary" style="width: 100%; border-style: dashed;">
              <i class="fas fa-utensils"></i> + Créer un aliment personnalisé (ex: Plat préparé)
            </button>
          </div>

          <div id="custom-food-section-${mealType}" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 10px;">
            <h4 style="margin-bottom: 10px; font-size: 14px; color: #4F46E5;">Nouvel aliment personnalisé</h4>
            <input type="text" id="custom-food-name-${mealType}" placeholder="Nom (ex: Hrira marocaine)" class="meal-input" style="margin-bottom: 8px;">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <label style="font-size: 12px; margin-bottom: 4px;">Unité</label>
                <select id="custom-food-unit-${mealType}" class="meal-input" style="padding: 8px 10px;">
                  <option value="100g">Pour 100 g</option>
                  <option value="100ml">Pour 100 ml</option>
                  <option value="bol">Pour 1 bol / part</option>
                </select>
              </div>
              <div>
                <label style="font-size: 12px; margin-bottom: 4px;">Glucides / Unité (g)</label>
                <input type="number" id="custom-food-carbs-${mealType}" placeholder="Ex: 25" min="0" step="0.1" class="meal-input" style="padding: 8px 10px;">
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="font-size: 12px; margin-bottom: 4px;">Quantité mangée</label>
                <input type="number" id="custom-food-qty-${mealType}" placeholder="Ex: 1.5, 200..." min="0" step="0.1" class="meal-input" style="padding: 8px 10px;">
              </div>
              <button onclick="app.addCustomFood('${mealType}')" class="btn-primary" style="align-self: flex-end; padding: 8px 16px;">
                Ajouter
              </button>
            </div>
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
                  <div class="meal-food-detail">${item.isCustom ? item.poids : (item.poids + 'g')} = ${item.glucides_totaux.toFixed(1)}g glucides</div>
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
          <div style="display: flex; gap: 10px;">
            <input type="number" 
              value="${meal.resucrage || 0}" 
              placeholder="0"
              min="0" max="100" step="1"
              onchange="app.updateMealValue('${mealType}', 'resucrage', this.value)"
              class="meal-input" style="flex: 1;">
            <button onclick="document.getElementById('comment-resucrage-${mealType}').style.display = 'block'" class="btn-secondary" style="padding: 0 15px;" title="Ajouter un commentaire">💬</button>
          </div>
          <input type="text" id="comment-resucrage-${mealType}" 
            value="${meal.commentaire_resucrage || ''}" 
            placeholder="Commentaire sur le resucrage..." 
            onchange="app.updateMealValue('${mealType}', 'commentaire_resucrage', this.value)"
            class="meal-input" style="margin-top: 8px; font-size: 13px; font-style: italic; background: #f8fafc; display: ${meal.commentaire_resucrage ? 'block' : 'none'};">
        </div>

        <!-- Commentaire Global Repas -->
        <div class="meal-section">
          <label>Commentaire général pour ce repas</label>
          <textarea 
            placeholder="Ex: Repas de fête, activité physique intense avant..." 
            onchange="app.updateMealValue('${mealType}', 'commentaire_repas', this.value)"
            class="meal-input" style="resize: vertical; min-height: 60px;">${meal.commentaire_repas || ''}</textarea>
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
          <div style="display: flex; gap: 10px;">
            <input type="number" 
              value="${meal.glycemie_apres || ''}" 
              placeholder="Ex: 1.40"
              min="0.1" max="6"
              step="0.1"
              onchange="app.updateMealValueAndCalculate('${mealType}', 'glycemie_apres', this.value)"
              class="meal-input" style="flex: 1;">
            <button onclick="document.getElementById('comment-apres-${mealType}').style.display = 'block'" class="btn-secondary" style="padding: 0 15px;" title="Ajouter un commentaire">💬</button>
          </div>
          <input type="text" id="comment-apres-${mealType}" 
            value="${meal.commentaire_glycemie_apres || ''}" 
            placeholder="Commentaire sur la glycémie après..." 
            onchange="app.updateMealValue('${mealType}', 'commentaire_glycemie_apres', this.value)"
            class="meal-input" style="margin-top: 8px; font-size: 13px; font-style: italic; background: #f8fafc; display: ${meal.commentaire_glycemie_apres ? 'block' : 'none'};">
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

    // Extraire les commentaires pour en faire des notes de bas de page
    const notesArray = [];
    let htmlTableRows = this.buildTableRowsHTML(notesArray);

    let htmlNotes = '';
    if (notesArray.length > 0) {
      htmlNotes = `
      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 11px;">
        <h3 style="color: #667eea; margin-bottom: 5px; font-size: 12px;">Notes & Commentaires</h3>
        ${notesArray.map((note, idx) => `<div style="margin-bottom: 3px;"><sup>${idx + 1}</sup> ${note}</div>`).join('')}
      </div>`;
    }

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
  th { background: #667eea; color: white; padding: 8px; text-align: center; font-size: 11px; font-weight: bold; }
  td { padding: 8px; border: 1px solid #ddd; font-size: 11px; text-align: center; }
  tr:nth-child(even) { background: #f9f9f9; }
  .meal-section { margin-bottom: 15px; background: #f9f9f9; padding: 10px; border-left: 3px solid #667eea; }
  .meal-title { font-weight: bold; margin-bottom: 8px; font-size: 12px; text-align: left; }
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
      <th>Dose Repas</th>
      <th>Correction</th>
      <th>Total Injecté</th>
      <th>Glyc. Après</th>
      <th>Corr. 3-4h</th>
    </tr>
  </thead>
  <tbody>
    ${htmlTableRows}
  </tbody>
</table>

${htmlNotes}

<h2>Détail des Aliments par Repas</h2>
${this.buildFoodDetails()}

${this.urineTests && this.urineTests.length > 0 ? `
  <h2>Tests Urinaires</h2>
  <table>
    <thead>
      <tr>
        <th>Jour</th>
        <th>Heure</th>
        <th>Glucose</th>
        <th>Cétones</th>
        <th>Sang</th>
        <th>Protéines</th>
        <th>Nitrites</th>
        <th>PH</th>
        <th>Commentaire</th>
      </tr>
    </thead>
    <tbody>
      ${this.urineTests.map(test => `
        <tr>
          <td>${test.date || new Date().toLocaleDateString('fr-FR')}</td>
          <td>${test.time}</td>
          <td>${test.glucose}</td>
          <td>${test.ketones}</td>
          <td>${test.blood}</td>
          <td>${test.proteins}</td>
          <td>${test.nitrites}</td>
          <td>${test.ph}</td>
          <td>${test.comment || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
` : ''}
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

      // Entête tableau (8 colonnes) - Agrandir
      const headers = ['Repas', 'Gly.Av', 'Glucides', 'D. Repas', 'D. Corr', 'D. Total', 'Gly.Ap', 'Corr.3-4h'];
      const colWidths = [24, 16, 16, 18, 18, 20, 16, 20];
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
      const notesArrayPDF = [];
      const mealData = this.buildTableRowsForPDF(notesArrayPDF);
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
          let yOffset = 4;
          // Séparer le texte de la note [n]
          const match = cell.toString().match(/(.*)(\s\[\d+\])/);
          if (match) {
            const mainText = match[1];
            const noteText = match[2];
            let cellWidth = doc.getTextWidth(mainText);
            // Centrer le texte principal
            doc.text(mainText, xPos + colWidths[i] / 2 - doc.getTextWidth(noteText) / 2, yPos + yOffset, { align: 'center' });

            // Ajouter la note en plus petit
            doc.setFontSize(6); // Plus petit pour les crochets
            doc.setTextColor(150, 150, 150);
            doc.text(noteText, xPos + colWidths[i] / 2 + cellWidth / 2 - doc.getTextWidth(noteText) / 2, yPos + yOffset, { align: 'left' });

            // Rétablir la police normale
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);

          } else {
            // S'il y a des retours à la ligne (ex: resucrage)
            if (cell.toString().includes('\n')) {
              yOffset = 3;
            }
            doc.text(cell, xPos + colWidths[i] / 2, yPos + yOffset, { align: 'center' });
          }
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

      // Notes de bas de page pour le PDF
      if (notesArrayPDF.length > 0) {
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(102, 126, 234);
        doc.setFont(undefined, 'bold');
        doc.text('Notes & Commentaires:', 20, yPos);
        yPos += 4;
        doc.setFontSize(7);
        doc.setTextColor(50, 50, 50);
        doc.setFont(undefined, 'normal');
        notesArrayPDF.forEach((note, idx) => {
          doc.text(`[${idx + 1}] ${note}`, 20, yPos);
          yPos += 3;
        });
      }

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
          if (i === 1) {
            const text = cell.toString().substring(0, 75);
            doc.text(text, xPos + 2, yPos + 3, { align: 'left' });
          } else {
            doc.text(cell.toString(), xPos + foodColWidths[i] / 2, yPos + 3, { align: 'center' });
          }
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

      // ===== TESTS URINAIRES =====
      if (this.urineTests && this.urineTests.length > 0) {
        doc.addPage();
        yPos = 15;

        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('TESTS URINAIRES', 105, 16, { align: 'center' });
        yPos = 35;

        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);

        // Entête tableau tests urinaires
        const utHeaders = ['Jour', 'Heure', 'Glucose', 'Cétones', 'Sang', 'Protéines', 'Nitrites', 'PH', 'Commentaire'];
        const utColWidths = [20, 12, 16, 16, 16, 18, 16, 12, 44];
        const utTotalWidth = utColWidths.reduce((a, b) => a + b, 0);

        for (const test of this.urineTests) {
          // Si on s'approche trop du bas de la page, créer une nouvelle
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          // Dessiner l'en-tête du test urinaire
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, utTotalWidth, 8, 'F');

          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(50, 50, 50);

          let xUtPos = 20;
          utHeaders.forEach((header, i) => {
            doc.text(header, xUtPos + utColWidths[i] / 2, yPos + 5, { align: 'center' });
            xUtPos += utColWidths[i];
          });

          // Bordures en-tête
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          xUtPos = 20;
          for (let i = 0; i <= utHeaders.length; i++) {
            doc.line(xUtPos, yPos, xUtPos, yPos + 8);
            if (i < utHeaders.length) xUtPos += utColWidths[i];
          }

          yPos += 8;

          // Données du test urinaire
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);

          xUtPos = 20;
          const utRow = [
            test.date || new Date().toLocaleDateString('fr-FR'),
            test.time,
            test.glucose,
            test.ketones,
            test.blood,
            test.proteins,
            test.nitrites,
            test.ph,
            test.comment ? test.comment.substring(0, 35) : '-'
          ];

          utRow.forEach((cell, i) => {
            const cellText = cell !== null && cell !== undefined ? String(cell) : '-';
            doc.text(cellText, xUtPos + utColWidths[i] / 2, yPos + 5, { align: 'center' });
            xUtPos += utColWidths[i];
          });

          // Bordures données
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          xUtPos = 20;
          for (let i = 0; i <= utHeaders.length; i++) {
            doc.line(xUtPos, yPos, xUtPos, yPos + 8);
            if (i < utHeaders.length) xUtPos += utColWidths[i];
          }

          yPos += 15;
        }
      }

      // Télécharger avec la bonne date
      const fileName = `Rapport_Gluci_${this.patientData.nom || 'Suivi'}_${this.currentLoadedDate || new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
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

  buildTableRowsHTML(notesArray) {
    return ['petit_dejeuner', 'dejeuner', 'diner'].map(mealType => {
      const meal = this.mealsData[mealType];
      const labels = { petit_dejeuner: '🌅 Petit Déjeuner', dejeuner: '☀️ Déjeuner', diner: '🌙 Dîner' };
      const totalGlucides = meal.aliments.reduce((sum, item) => sum + item.glucides_totaux, 0);

      const addNote = (text, prefix) => {
        if (!text) return '';
        notesArray.push(`<strong>${prefix} :</strong> ${text}`);
        return `<sup>${notesArray.length}</sup>`;
      };

      const mealLabel = labels[mealType] + addNote(meal.commentaire_repas, labels[mealType] + " (Général)");
      const glyAvant = (meal.glycemie_avant || '-') + addNote(meal.commentaire_glycemie_avant, labels[mealType] + " (Glyc. Avant)");
      const glyApres = (meal.glycemie_apres || '-') + addNote(meal.commentaire_glycemie_apres, labels[mealType] + " (Glyc. Après)");
      const resucrage = meal.resucrage > 0 ? `<br><small style="color:#d32f2f">Resucrage: ${meal.resucrage}g ${addNote(meal.commentaire_resucrage, labels[mealType] + " (Resucrage)")}</small>` : '';

      return `<tr>
        <td style="text-align: left;"><strong>${mealLabel}</strong></td>
        <td>${glyAvant}</td>
        <td><strong>${totalGlucides.toFixed(4)}g</strong></td>
        <td>${Math.round(meal.doseRepas)}u</td>
        <td>${Math.round(meal.doseCorrection)}u</td>
        <td><strong>${Math.round(meal.doseTotale)}u</strong>${resucrage}</td>
        <td>${glyApres}</td>
        <td>${Math.round(meal.correctionTroisHeures)}u</td>
      </tr>`;
    }).join('');
  }

  buildTableRowsForPDF(notesArray) {
    const rows = [];
    const meals = ['petit_dejeuner', 'dejeuner', 'diner'];
    const mealsLabels = { petit_dejeuner: 'Petit Déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };

    meals.forEach(mealType => {
      const meal = this.mealsData[mealType];
      const totalGlucides = meal.aliments.reduce((sum, item) => sum + (item.glucides_totaux || 0), 0);

      const addNote = (text, prefix) => {
        if (!text) return '';
        notesArray.push(`${prefix} : ${text}`);
        return ` [${notesArray.length}]`; // Gardé pour l'insertion par jsPDF, on réduira la taille de la police dans le rendu PDF
      };

      const mealLabel = mealsLabels[mealType] + addNote(meal.commentaire_repas, mealsLabels[mealType] + " (Général)");
      const glyAvant = (meal.glycemie_avant !== null ? `${meal.glycemie_avant}` : '-') + addNote(meal.commentaire_glycemie_avant, mealsLabels[mealType] + " (Glyc. Avant)");
      const glyApres = (meal.glycemie_apres !== null ? `${meal.glycemie_apres}` : '-') + addNote(meal.commentaire_glycemie_apres, mealsLabels[mealType] + " (Glyc. Après)");

      let resucrageStr = "";
      if (meal.resucrage > 0) {
        resucrageStr = `\n(Resucrage ${meal.resucrage}g)${addNote(meal.commentaire_resucrage, mealsLabels[mealType] + " (Resucrage)")}`;
      }

      rows.push([
        mealLabel,
        glyAvant,
        totalGlucides.toFixed(4),
        `${Math.round(meal.doseRepas)}u`,
        `${Math.round(meal.doseCorrection)}u`,
        `${Math.round(meal.doseTotale)}u${resucrageStr}`,
        glyApres,
        `${Math.round(meal.correctionTroisHeures)}u`
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
            `${Number(aliment.glucides_totaux || 0).toFixed(4)}`
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

    // Global keydown for Enter key submissions
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = e.target;

        // 1. Urine test form (any input inside it)
        if (target.closest('#new-urine-test-form')) {
          e.preventDefault();
          this.saveUrineTest();
          return;
        }

        // 2. Custom food form (any input inside it)
        const customForm = target.closest('[id^="custom-food-form-"]');
        if (customForm) {
          e.preventDefault();
          const mealType = customForm.id.replace('custom-food-form-', '');
          this.addCustomFood(mealType);
          return;
        }

        // 3. Search input
        if (target.matches('.meal-input[placeholder="Rechercher un aliment..."]')) {
          e.preventDefault();
          const mealBlock = target.closest('.meal-block');
          if (mealBlock) {
            const mealType = mealBlock.querySelector('div[id^="food-results-"]').id.replace('food-results-', '');
            const resultsDiv = document.getElementById(`food-results-${mealType}`);
            if (resultsDiv && resultsDiv.children.length > 0) {
              resultsDiv.children[0].click();
              target.value = '';
              resultsDiv.innerHTML = '';
            }
          }
          return;
        }
      }
    });
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
