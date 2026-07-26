/**
 * Mini serveur de développement - GluciTracker
 * Lancement: node dev-server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Routes principales
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/config', (req, res) => {
  res.sendFile(path.join(__dirname, 'config.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GluciTracker Dev Server'
  });
});

// ===================================
// ENDPOINT PDF - WeasyPrint (Python)
// ===================================
app.post('/export-pdf', (req, res) => {
  try {
    const { data, filename } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data required' });
    }

    console.log('📄 Génération PDF avec WeasyPrint...');

    // Générer le HTML du rapport
    const aujourd_hui = new Date().toLocaleDateString('fr-FR');
    
    const meals = data.meals || [];
    const mealsHtml = meals.map(meal => `
      <tr>
        <td>${meal.repas}</td>
        <td>${meal.glycemieBefore || '-'}</td>
        <td><strong>${meal.glucides.toFixed(1)}</strong></td>
        <td>${meal.insuline}</td>
      </tr>
    `).join('');

    const foodsHtml = data.foods ? Object.entries(data.foods).map(([mealName, items]) => `
      <div style="margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #667eea;">
        <strong style="color: #667eea;">${mealName}</strong>
        ${Array.isArray(items) && items.length > 0 ? `
          <ul style="margin: 10px 0 0 20px;">
            ${items.map(food => `<li>${food.nom} (${food.poids}g) = ${food.glucides.toFixed(1)}g glucides</li>`).join('')}
          </ul>
        ` : `<p style="color: #999; font-style: italic;">Aucun aliment</p>`}
      </div>
    `).join('') : '';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', sans-serif; 
      color: #333; 
      padding: 30px;
      background: white;
    }
    h1 { 
      color: #667eea; 
      text-align: center; 
      font-size: 28px;
      margin-bottom: 5px;
    }
    .date { 
      text-align: center; 
      color: #999; 
      margin-bottom: 20px;
      font-size: 13px;
    }
    .patient-box { 
      background: #f0f0f0; 
      padding: 15px; 
      margin-bottom: 20px; 
      border-left: 5px solid #667eea; 
      border-radius: 3px;
    }
    .patient-box p { 
      margin: 5px 0; 
      font-size: 13px;
    }
    h2 { 
      color: #667eea; 
      font-size: 16px; 
      margin: 20px 0 12px 0; 
      border-bottom: 3px solid #667eea; 
      padding-bottom: 6px;
      font-weight: bold;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 20px;
      font-size: 12px;
    }
    th { 
      background: #667eea; 
      color: white; 
      padding: 12px; 
      text-align: left;
      border: 1px solid #667eea;
    }
    td { 
      padding: 12px; 
      border: 1px solid #ddd;
      background: white;
    }
    tr:nth-child(even) td { 
      background: #f9f9f9;
    }
    ul { margin: 0; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>GluciTracker - Rapport de Suivi</h1>
  <div class="date">Rapport du ${aujourd_hui}</div>
  
  <div class="patient-box">
    <p><strong>Patient:</strong> ${data.patientNom || '-'}</p>
    <p><strong>Dose Basale:</strong> ${data.doseBasale || '-'} unités</p>
  </div>

  <h2>Résumé des Repas</h2>
  <table>
    <thead>
      <tr>
        <th>Repas</th>
        <th>Glycémie Avant</th>
        <th>Glucides (g)</th>
        <th>Insuline</th>
      </tr>
    </thead>
    <tbody>
      ${mealsHtml}
    </tbody>
  </table>

  <h2>Détail des Aliments</h2>
  ${foodsHtml || '<p style="color: #999;">Aucun aliment enregistré</p>'}
  
  <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #999;">
    GluciTracker v1.0 | Rapport confidentiel - Consultation médicale recommandée
  </p>
</body>
</html>`;

    // Appeler le script Python avec ReportLab (Python global)
    const python = spawn('python', [path.join(__dirname, 'generate_pdf.py')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let pdfData = Buffer.alloc(0);
    let errorOutput = '';
    let responseSent = false;

    python.stdout.on('data', (chunk) => {
      pdfData = Buffer.concat([pdfData, chunk]);
    });

    python.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    python.on('close', (code) => {
      if (responseSent) return; // Éviter double envoi
      
      if (code !== 0) {
        console.error('❌ Erreur PDF:', errorOutput);
        responseSent = true;
        return res.status(500).json({ error: 'PDF generation failed', details: errorOutput });
      }

      if (pdfData.length === 0) {
        console.error('❌ Pas de données PDF');
        responseSent = true;
        return res.status(500).json({ error: 'No PDF data generated' });
      }

      console.log(`✅ PDF généré (${pdfData.length} bytes)`);

      responseSent = true;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'Rapport-GluciTracker.pdf'}"`);
      res.send(pdfData);
    });

    python.on('error', (err) => {
      if (responseSent) return; // Éviter double envoi
      console.error('❌ Erreur spawn:', err);
      responseSent = true;
      res.status(500).json({ error: 'Failed to spawn process', details: err.message });
    });

    // Envoyer le HTML au script Python
    python.stdin.write(htmlContent, 'utf8');
    python.stdin.end();

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ===================================
// DÉMARRAGE SERVEUR
// ===================================

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Serveur GluciTracker démarré`);
  console.log(`${'='.repeat(50)}`);
  console.log(`🌐 URL : http://localhost:${PORT}`);
  console.log(`💚 Health : http://localhost:${PORT}/health`);
  console.log(`${'='.repeat(50)}\n`);
});
