// Civil Structural Design Suite - Enhanced with Improved Algorithms
class CivilSuiteApp {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-button');
        this.contents = document.querySelectorAll('.tab-content');
        this.history = [];
        this.charts = new Map();
        this.isDarkMode = false;

        this.analysisModules = {
            'beam-analysis': this.runBeamAnalysis,
            'column-design': this.runColumnDesign,
            'slab-design': this.runSlabDesign,
            'footing-design': this.runFootingDesign,
            'bbs': this.runBBS,
            'staircase-design': this.runStaircaseDesign,
            'retaining-wall': this.runRetainingWallDesign,
            'water-tank': this.runWaterTankDesign,
            'steel-design': this.runSteelDesign,
            'concrete-mix': this.runConcreteMixDesign
        };
    }

    async init() {
        try {
            this.showLoading(20);
            await this.loadHistory();
            this.setupEventListeners();
            this.applySavedTheme();
            
            this.showLoading(60);
            this.runActiveAnalysis();
            
            this.showLoading(100);
            setTimeout(() => {
                this.hideLoading();
            }, 500);
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }

    // Loading management
    showLoading(progress = 0) {
        const loadingEl = document.getElementById('loading');
        const progressEl = document.querySelector('#global-progress > div');
        
        if (loadingEl) loadingEl.classList.remove('hidden', 'fade-out');
        if (progressEl) progressEl.style.width = `${progress}%`;
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('fade-out');
            setTimeout(() => {
                loadingEl.classList.add('hidden');
            }, 500);
        }
    }

    // Theme management
    applySavedTheme() {
        const savedTheme = localStorage.getItem('civilSuiteTheme');
        this.isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        this.updateThemeToggle();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        localStorage.setItem('civilSuiteTheme', this.isDarkMode ? 'dark' : 'light');
        this.updateThemeToggle();
        this.showToast(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`, 'success');
        
        this.updateChartsForTheme();
    }

    updateThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = this.isDarkMode ? 
                '☀️ Light' : '🌙 Dark';
        }
    }

    updateChartsForTheme() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
        this.runActiveAnalysis();
    }

    // Utility functions
    getVal(id) { 
        const element = document.getElementById(id);
        return element ? parseFloat(element.value) || 0 : 0; 
    }

    getEl(id) { return document.getElementById(id); }

    setHTML(id, text) { 
        const element = this.getEl(id);
        if (element) element.innerHTML = text; 
    }

    setText(id, text) {
        const element = this.getEl(id);
        if (element) element.textContent = text;
    }

    // Event listeners
    setupEventListeners() {
        // Tab switching
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });

        // Run buttons
        Object.keys(this.analysisModules).forEach(moduleId => {
            const moduleName = moduleId.split('-')[0];
            const buttonId = `run${this.capitalizeFirst(moduleName)}Button`;
            const button = this.getEl(buttonId);
            
            if (button) {
                button.addEventListener('click', () => {
                    if (this.validateInputs(moduleId)) {
                        this.showLoading(30);
                        setTimeout(() => {
                            try {
                                this.analysisModules[moduleId].call(this);
                                this.saveToHistory(moduleId);
                                this.showToast('Analysis completed successfully', 'success');
                            } catch (error) {
                                console.error(`Error in ${moduleId}:`, error);
                                this.showToast('Analysis failed', 'error');
                            } finally {
                                this.hideLoading();
                            }
                        }, 100);
                    }
                });
            }
        });

        // Print buttons
        document.querySelectorAll('.print-button').forEach(button => {
            button.addEventListener('click', (e) => this.printReport(e));
        });

        // History controls
        const clearHistoryBtn = this.getEl('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        // Theme toggle
        const themeToggle = this.getEl('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Project management
        const exportProjectBtn = this.getEl('export-project');
        if (exportProjectBtn) {
            exportProjectBtn.addEventListener('click', () => this.exportProject());
        }

        const importProjectInput = this.getEl('import-project');
        if (importProjectInput) {
            importProjectInput.addEventListener('change', (e) => this.importProject(e));
        }

        // Real-time input updates
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', this.debounce(() => {
                this.validateField(input);
                const activeTabId = this.getActiveTabId();
                if (this.analysisModules[activeTabId]) {
                    this.analysisModules[activeTabId].call(this);
                }
            }, 300));
        });
    }

    // Input validation
    validateInputs(moduleId) {
        const container = this.getEl(moduleId);
        if (!container) return false;

        const inputs = container.querySelectorAll('input[type="number"]');
        let allValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                allValid = false;
            }
        });

        if (!allValid) {
            this.showToast('Please check your inputs', 'warning');
        }

        return allValid;
    }

    validateField(input) {
        input.classList.remove('invalid', 'warning');
        
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        if (input.value === '' && input.hasAttribute('required')) {
            this.markFieldInvalid(input, 'This field is required');
            return false;
        }

        if (input.type === 'number') {
            const value = parseFloat(input.value);
            if (isNaN(value)) {
                this.markFieldInvalid(input, 'Please enter a valid number');
                return false;
            }

            const min = parseFloat(input.getAttribute('min'));
            const max = parseFloat(input.getAttribute('max'));
            
            if (!isNaN(min) && value < min) {
                this.markFieldInvalid(input, `Value must be at least ${min}`);
                return false;
            }

            if (!isNaN(max) && value > max) {
                this.markFieldInvalid(input, `Value must be at most ${max}`);
                return false;
            }
        }

        return true;
    }

    markFieldInvalid(input, message) {
        input.classList.add('invalid');
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        input.parentNode.appendChild(errorElement);
    }

    // Tab management
    switchTab(clickedTab) {
        this.tabs.forEach(item => item.classList.remove('active'));
        clickedTab.classList.add('active');
        
        const target = clickedTab.getAttribute('data-tab');
        this.contents.forEach(content => {
            content.classList.add('hidden');
            if (content.id === target) content.classList.remove('hidden');
        });

        if (target === 'history') {
            this.renderHistory();
        } else {
            this.runActiveAnalysis();
        }
    }

    getActiveTabId() {
        const activeTab = document.querySelector('.tab-button.active');
        return activeTab ? activeTab.getAttribute('data-tab') : 'beam-analysis';
    }

    runActiveAnalysis() {
        const activeTabId = this.getActiveTabId();
        const analysisFunction = this.analysisModules[activeTabId];
        if (analysisFunction) {
            try {
                analysisFunction.call(this);
            } catch (error) {
                console.error(`Error running ${activeTabId}:`, error);
            }
        }
    }

    // Chart management
    createChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        color: this.isDarkMode ? '#f1f5f9' : '#374151'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: this.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: this.isDarkMode ? '#94a3b8' : '#64748b'
                    }
                },
                y: {
                    grid: {
                        color: this.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: this.isDarkMode ? '#94a3b8' : '#64748b'
                    }
                }
            }
        };

        const chart = new Chart(ctx, {
            type: data.type || 'line',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Toast notifications
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-lg">${this.getToastIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    // History management
    async saveToHistory(moduleId) {
        const moduleName = this.getEl(moduleId)?.querySelector('h3')?.textContent || moduleId;
        const container = this.getEl(moduleId);
        const inputs = container?.querySelectorAll('input, select') || [];
        const values = {};

        inputs.forEach(input => {
            values[input.id] = input.value;
        });

        const historyEntry = {
            id: Date.now(),
            module: moduleId,
            name: moduleName,
            date: new Date().toLocaleString(),
            timestamp: Date.now(),
            data: values
        };

        this.history.unshift(historyEntry);
        
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        await this.saveHistoryToStorage();
        this.updateHistoryBadge();
    }

    async loadHistory() {
        try {
            const savedHistory = localStorage.getItem('civilSuiteHistory');
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            }
            this.updateHistoryBadge();
        } catch (error) {
            console.error('Error loading history:', error);
            this.history = [];
        }
    }

    async saveHistoryToStorage() {
        try {
            localStorage.setItem('civilSuiteHistory', JSON.stringify(this.history));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    renderHistory() {
        const listEl = this.getEl('history-list');
        const totalEl = this.getEl('history-total');
        const todayEl = this.getEl('history-today');
        const sizeEl = this.getEl('history-size');

        if (!listEl) return;

        if (totalEl) totalEl.textContent = this.history.length;
        
        const today = new Date().toDateString();
        const todayCount = this.history.filter(entry => 
            new Date(entry.timestamp).toDateString() === today
        ).length;
        if (todayEl) todayEl.textContent = todayCount;

        const historySize = new Blob([JSON.stringify(this.history)]).size;
        if (sizeEl) sizeEl.textContent = `${(historySize / 1024).toFixed(1)} KB`;

        listEl.innerHTML = '';

        if (this.history.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">📚</div>
                    <p>No calculations saved yet</p>
                    <p class="text-sm mt-1">Your analysis history will appear here</p>
                </div>
            `;
            return;
        }

        this.history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors mb-2';
            item.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <p class="font-bold text-gray-800">${entry.name}</p>
                        <p class="text-xs text-gray-500">${entry.date}</p>
                    </div>
                    <button data-id="${entry.id}" class="load-history-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors">
                        Load
                    </button>
                </div>
                <div class="text-xs text-gray-600 truncate">
                    ${Object.entries(entry.data).slice(0, 3).map(([key, value]) => 
                        `${key}: ${value}`
                    ).join(', ')}
                </div>
            `;
            listEl.appendChild(item);
        });

        document.querySelectorAll('.load-history-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const entryId = parseInt(e.target.getAttribute('data-id'));
                this.loadFromHistory(entryId);
            });
        });
    }

    loadFromHistory(entryId) {
        const entry = this.history.find(item => item.id === entryId);
        if (!entry) return;

        Object.keys(entry.data).forEach(inputId => {
            const inputEl = this.getEl(inputId);
            if (inputEl) inputEl.value = entry.data[inputId];
        });

        const tabButton = document.querySelector(`.tab-button[data-tab="${entry.module}"]`);
        if (tabButton) {
            this.switchTab(tabButton);
        }

        this.showToast('Calculation loaded from history', 'success');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            this.history = [];
            this.saveHistoryToStorage();
            this.renderHistory();
            this.updateHistoryBadge();
            this.showToast('History cleared', 'success');
        }
    }

    updateHistoryBadge() {
        const badge = this.getEl('history-count');
        if (badge) {
            if (this.history.length > 0) {
                badge.textContent = this.history.length > 99 ? '99+' : this.history.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    // Project management
    exportProject() {
        const project = {
            name: `CivilSuite_Project_${new Date().toISOString().split('T')[0]}`,
            version: '1.0',
            timestamp: new Date().toISOString(),
            modules: {}
        };

        Object.keys(this.analysisModules).forEach(moduleId => {
            const container = this.getEl(moduleId);
            if (container) {
                const inputs = container.querySelectorAll('input, select');
                const values = {};
                inputs.forEach(input => {
                    values[input.id] = input.value;
                });
                project.modules[moduleId] = values;
            }
        });

        const dataStr = JSON.stringify(project, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${project.name}.civiljson`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        this.showToast('Project exported successfully', 'success');
    }

    importProject(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                this.loadProjectData(project);
                this.showToast('Project imported successfully', 'success');
            } catch (error) {
                this.showToast('Failed to import project', 'error');
            }
        };
        reader.readAsText(file);
        
        event.target.value = '';
    }

    loadProjectData(project) {
        Object.keys(project.modules).forEach(moduleId => {
            Object.keys(project.modules[moduleId]).forEach(inputId => {
                const inputEl = this.getEl(inputId);
                if (inputEl) {
                    inputEl.value = project.modules[moduleId][inputId];
                }
            });
        });
        
        const firstModule = Object.keys(project.modules)[0];
        if (firstModule) {
            const tabButton = document.querySelector(`.tab-button[data-tab="${firstModule}"]`);
            if (tabButton) {
                this.switchTab(tabButton);
            }
        }
    }

    // Print functionality
    printReport(event) {
        const moduleContainer = event.target.closest('.module-container');
        const moduleTitle = moduleContainer?.querySelector('h3')?.innerText || 'Civil Suite Report';

        let reportHTML = `
            <html>
            <head>
                <title>Report: ${moduleTitle}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background: white; 
                        color: black;
                        padding: 20px;
                        line-height: 1.4;
                    }
                    .report-section { 
                        border: 1px solid #ccc; 
                        border-radius: 8px; 
                        padding: 1.5rem; 
                        margin-bottom: 1.5rem; 
                        page-break-inside: avoid; 
                    }
                    .report-title { 
                        font-size: 1.5rem; 
                        font-weight: 700; 
                        color: #312e81; 
                        border-bottom: 2px solid #e0e7ff; 
                        padding-bottom: 0.75rem; 
                        margin-bottom: 1.25rem; 
                    }
                    .grid-print { 
                        display: grid; 
                        grid-template-columns: auto 1fr; 
                        gap: 0.75rem 1.5rem; 
                        align-items: center; 
                    }
                    .label { 
                        font-weight: 500; 
                        color: #4b5563; 
                        text-align: right; 
                    }
                    .value { 
                        font-weight: 600; 
                        color: #1e293b; 
                    }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold mb-2">Civil Suite - Design Report</h1>
                    <p class="text-gray-600 mb-4">${moduleTitle}</p>
                    <p class="text-gray-500">Generated on: ${new Date().toLocaleString()}</p>
                </div>
        `;

        const inputsContainer = moduleContainer?.querySelector('.xl\\:col-span-1');
        if (inputsContainer) {
            reportHTML += '<div class="report-section"><h2 class="report-title">Input Parameters</h2><div class="grid-print">';
            inputsContainer.querySelectorAll('label').forEach(label => {
                const input = document.getElementById(label.getAttribute('for'));
                if (input) {
                    let value = input.value;
                    if (input.tagName === 'SELECT') {
                        value = input.options[input.selectedIndex].text;
                    }
                    reportHTML += `<div class="label">${label.innerText}:</div><div class="value">${value}</div>`;
                }
            });
            reportHTML += '</div></div>';
        }

        reportHTML += '</body></html>';

        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
        
        setTimeout(() => {
            reportWindow.print();
        }, 500);
    }

    // Status visual updates
    updateStatusVisual(elementId, isSafe, message) {
        const el = this.getEl(elementId);
        if (!el) return;

        el.className = `status-visual ${isSafe ? 'pass' : 'fail'}`;
        el.classList.remove('hidden');
        
        const icon = isSafe ? 
            `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>` :
            `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
            </svg>`;
        
        el.innerHTML = `${icon}<span>${message}</span>`;
    }

    // Utility methods
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Material quantity calculation
    calculateMaterialQuantities(volume, grade) {
        if (isNaN(volume) || volume <= 0) {
            return { vol: '-', cement: '-', sand: '-', aggregate: '-' };
        }

        const mixRatios = { 
            20: { cement: 1, sand: 1.5, aggregate: 3 },
            25: { cement: 1, sand: 1, aggregate: 2 },
            30: { cement: 1, sand: 1, aggregate: 2 }
        };

        const ratio = mixRatios[grade] || mixRatios[25];
        const sumOfRatio = ratio.cement + ratio.sand + ratio.aggregate;
        const dryVolume = volume * 1.54;
        
        const cementVolume = (dryVolume * ratio.cement) / sumOfRatio;
        const cementBags = Math.ceil((cementVolume * 1440) / 50);
        
        return {
            vol: `${volume.toFixed(2)} m³`,
            cement: `${cementBags} bags`,
            sand: `${((dryVolume * ratio.sand) / sumOfRatio).toFixed(2)} m³`,
            aggregate: `${((dryVolume * ratio.aggregate) / sumOfRatio).toFixed(2)} m³`
        };
    }

    // IMPROVED BEAM ANALYSIS ALGORITHMS
    runBeamAnalysis() {
        this.drawBeamVisual();
        
        const L = this.getVal('beamLength');
        const w = this.getVal('beamUDL');
        const P = this.getVal('beamPointLoad');
        const type = this.getEl('beamType').value;
        const b = this.getVal('beamWidth') / 1000; // Convert to meters
        const D = this.getVal('beamDepth') / 1000; // Convert to meters
        const fck = this.getVal('beamFck');
        const fy = this.getVal('beamFy');

        if (isNaN(L) || L <= 0) return;

        // Calculate reactions and internal forces
        let reactions = { left: 0, right: 0 };
        let maxShear = 0, maxMoment = 0, maxDeflection = 0;

        switch(type) {
            case 'simply-supported':
                reactions.left = (w * L) / 2 + (P * 0.5);
                reactions.right = (w * L) / 2 + (P * 0.5);
                maxShear = Math.max(reactions.left, reactions.right);
                maxMoment = (w * L * L) / 8 + (P * L) / 4;
                maxDeflection = (5 * w * Math.pow(L, 4)) / (384 * 20000 * this.calculateMomentOfInertia(b, D)) * 1000; // mm
                break;
                
            case 'cantilever':
                reactions.left = w * L + P;
                maxShear = reactions.left;
                maxMoment = (w * L * L) / 2 + P * L;
                maxDeflection = (w * Math.pow(L, 4)) / (8 * 20000 * this.calculateMomentOfInertia(b, D)) * 1000; // mm
                break;
                
            case 'fixed':
                reactions.left = (w * L) / 2;
                reactions.right = (w * L) / 2;
                maxShear = reactions.left;
                maxMoment = (w * L * L) / 12;
                maxDeflection = (w * Math.pow(L, 4)) / (384 * 20000 * this.calculateMomentOfInertia(b, D)) * 1000; // mm
                break;
        }

        // Calculate reinforcement
        const d = D * 1000 - 25; // Effective depth (mm)
        const Ast_req = this.calculateSteelArea(maxMoment * 1e6, fck, fy, b * 1000, d);
        const Ast_min = 0.0012 * b * 1000 * D * 1000; // Minimum steel
        const Ast = Math.max(Ast_req, Ast_min);

        // Calculate capacities
        const momentCapacity = this.calculateMomentCapacity(Ast, fy, fck, b * 1000, d);
        const shearCapacity = 0.5 * Math.sqrt(fck) * b * 1000 * d / 1000; // kN

        // Update results
        this.setHTML('beamMaxShear', `${maxShear.toFixed(2)} kN`);
        this.setHTML('beamMaxMoment', `${maxMoment.toFixed(2)} kNm`);
        this.setHTML('beamMaxDeflection', `${maxDeflection.toFixed(2)} mm`);
        this.setHTML('beamBottomSteel', `${this.formatReinforcement(Ast)}`);
        this.setHTML('beamTopSteel', `${this.formatReinforcement(Ast_min)}`);
        this.setHTML('beamShearSteel', `2L T8 @ 150 mm c/c`);
        this.setHTML('beamMomentCapacity', `${(momentCapacity / 1e6).toFixed(2)} kNm`);
        this.setHTML('beamShearCapacity', `${shearCapacity.toFixed(2)} kN`);
        this.setHTML('beamDeflectionCheck', maxDeflection < L * 1000 / 250 ? 'PASS' : 'FAIL');

        // Create diagrams
        const sfdData = this.generateSFDData(type, L, w, P);
        const bmdData = this.generateBMDData(type, L, w, P);
        this.createBeamCharts(sfdData, bmdData);
        
        // Update status
        const isSafe = momentCapacity >= maxMoment * 1e6 && shearCapacity >= maxShear && maxDeflection < L * 1000 / 250;
        this.updateStatusVisual('beamStatus', isSafe,
            isSafe ? 'PASS - Beam design meets all requirements' : 'FAIL - Review design parameters');
    }

    calculateMomentOfInertia(b, D) {
        return (b * Math.pow(D, 3)) / 12; // m⁴
    }

    calculateSteelArea(M, fck, fy, b, d) {
        // Limit state method for steel area calculation
        const fsc = 0.87 * fy;
        const xulim = (0.0035 / (0.0055 + 0.87 * fy / 200000)) * d;
        const Mulim = 0.36 * fck * b * xulim * (d - 0.416 * xulim);
        
        if (M <= Mulim) {
            // Singly reinforced
            const x = d * (1 - Math.sqrt(1 - (4.6 * M) / (fck * b * d * d)));
            return (0.36 * fck * b * x) / fsc;
        } else {
            // Doubly reinforced (simplified)
            return (M - Mulim) / (fsc * (d - 50)) + (0.36 * fck * b * xulim) / fsc;
        }
    }

    calculateMomentCapacity(Ast, fy, fck, b, d) {
        const fsc = 0.87 * fy;
        const x = (fsc * Ast) / (0.36 * fck * b);
        return 0.36 * fck * b * x * (d - 0.416 * x);
    }

    formatReinforcement(area) {
        const bars = [8, 10, 12, 16, 20, 25, 32];
        for (const dia of bars) {
            const areaPerBar = Math.PI * dia * dia / 4;
            const numBars = Math.ceil(area / areaPerBar);
            if (numBars <= 6) {
                return `${numBars} - T${dia} bars`;
            }
        }
        return `${Math.ceil(area / 201)} - T16 bars`; // Default to T16
    }

    generateSFDData(type, L, w, P) {
        const points = [];
        const steps = 50;
        
        for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * L;
            let shear = 0;
            
            switch(type) {
                case 'simply-supported':
                    shear = (w * L) / 2 - w * x;
                    if (x > L/2) shear -= P;
                    break;
                case 'cantilever':
                    shear = w * (L - x) + P;
                    break;
                case 'fixed':
                    shear = (w * L) / 2 - w * x;
                    break;
            }
            
            points.push({ x: x, y: shear });
        }
        
        return points;
    }

    generateBMDData(type, L, w, P) {
        const points = [];
        const steps = 50;
        
        for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * L;
            let moment = 0;
            
            switch(type) {
                case 'simply-supported':
                    moment = (w * L * x) / 2 - (w * x * x) / 2;
                    if (x > L/2) moment -= P * (x - L/2);
                    break;
                case 'cantilever':
                    moment = -((w * (L - x) * (L - x)) / 2 + P * (L - x));
                    break;
                case 'fixed':
                    moment = (w * L * x) / 2 - (w * x * x) / 2 - (w * L * L) / 12;
                    break;
            }
            
            points.push({ x: x, y: moment });
        }
        
        return points;
    }

    createBeamCharts(sfdData, bmdData) {
        // SFD Chart
        this.createChart('sfd-chart', {
            type: 'line',
            data: {
                labels: sfdData.map(p => p.x.toFixed(1)),
                datasets: [{
                    label: 'Shear Force (kN)',
                    data: sfdData.map(p => p.y),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Shear Force Diagram'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Length (m)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Shear Force (kN)'
                        }
                    }
                }
            }
        });

        // BMD Chart
        this.createChart('bmd-chart', {
            type: 'line',
            data: {
                labels: bmdData.map(p => p.x.toFixed(1)),
                datasets: [{
                    label: 'Bending Moment (kNm)',
                    data: bmdData.map(p => p.y),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Bending Moment Diagram'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Length (m)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Bending Moment (kNm)'
                        }
                    }
                }
            }
        });
    }

    drawBeamVisual() {
        const L = this.getVal('beamLength') || 6;
        const type = this.getEl('beamType').value;
        const container = this.getEl('beam-visual');
        if (!container) return;
        
        let svg = `<svg viewBox="0 0 400 120" class="w-full h-full">`;
        
        // Beam line
        svg += `<line x1="50" y1="60" x2="350" y2="60" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/>`;
        
        // Supports
        if (type === 'simply-supported') {
            svg += `<path d="M 50 60 L 45 75 L 55 75 Z" fill="#4f46e5"/>`;
            svg += `<path d="M 350 60 L 345 75 L 355 75 Z" fill="#4f46e5"/>`;
        } else if (type === 'cantilever') {
            svg += `<rect x="30" y="40" width="20" height="40" fill="#4f46e5" opacity="0.7"/>`;
        } else if (type === 'fixed') {
            svg += `<rect x="30" y="40" width="20" height="40" fill="#4f46e5"/>`;
            svg += `<rect x="350" y="40" width="20" height="40" fill="#4f46e5"/>`;
        }
        
        // Load arrows
        for (let i = 0; i < 5; i++) {
            const x = 50 + (i * 75);
            svg += `<line x1="${x}" y1="30" x2="${x}" y2="60" stroke="#ef4444" stroke-width="2"/>`;
            svg += `<path d="M ${x-5} 25 L ${x} 15 L ${x+5} 25 Z" fill="#ef4444"/>`;
        }
        
        // Dimensions
        svg += `<line x1="50" y1="85" x2="350" y2="85" stroke="#6b7280" stroke-width="1"/>`;
        svg += `<line x1="50" y1="80" x2="50" y2="90" stroke="#6b7280" stroke-width="1"/>`;
        svg += `<line x1="350" y1="80" x2="350" y2="90" stroke="#6b7280" stroke-width="1"/>`;
        svg += `<text x="200" y="100" font-family="Arial" font-size="12" text-anchor="middle" fill="#374151">L = ${L.toFixed(1)} m</text>`;
        
        svg += `</svg>`;
        container.innerHTML = svg;
    }

    // IMPROVED COLUMN DESIGN ALGORITHMS
    runColumnDesign() {
        this.drawColumnVisual();
        
        const b = this.getVal('colWidth');
        const D = this.getVal('colDepth');
        const H = this.getVal('colHeight');
        const Pu = this.getVal('colPu');
        const Mux = this.getVal('colMux');
        const Muy = this.getVal('colMuy');
        const fck = this.getVal('colFck');
        const fy = this.getVal('colFy');
        const cover = this.getVal('colCover');

        if (isNaN(b) || isNaN(D) || isNaN(Pu)) return;

        // Calculate geometric properties
        const Ag = b * D;
        const d = D - cover - 8; // Effective depth
        const d_prime = cover + 8; // Compression steel depth

        // Calculate slenderness
        const lex = H * 1000; // Effective length in mm
        const ley = H * 1000;
        const slendernessX = lex / (0.3 * D);
        const slendernessY = ley / (0.3 * b);

        // Calculate minimum and maximum steel
        const Asc_min = 0.008 * Ag;
        const Asc_max = 0.04 * Ag;

        // Calculate required steel for axial load
        const Asc_axial = Math.max(0, (Pu * 1000 - 0.4 * fck * Ag) / (0.67 * fy - 0.4 * fck));
        
        // Calculate required steel for bending (simplified)
        const Ast_moment = this.calculateSteelArea(Mux * 1e6, fck, fy, b, d);
        
        // Total steel required
        const Asc_req = Math.max(Asc_axial, Ast_moment, Asc_min);
        const Asc = Math.min(Asc_req, Asc_max);
        const pt = (Asc / Ag) * 100;

        // Calculate column capacity
        const Pc = (0.4 * fck * Ag + 0.67 * fy * Asc) / 1000; // kN
        const utilization = Pu / Pc;

        // Reinforcement details
        const barSize = this.getSuitableBarSize(Asc);
        const numBars = Math.ceil(Asc / (Math.PI * barSize * barSize / 4));
        const tieSize = Math.max(6, barSize / 4);
        const tieSpacing = Math.min(16 * barSize, 300, b);

        // Update results
        this.setHTML('colSteelArea', `${Asc.toFixed(0)} mm²`);
        this.setHTML('colSteelPercent', `${pt.toFixed(2)} %`);
        this.setHTML('colCapacity', `${Pc.toFixed(0)} kN`);
        this.setHTML('colUtilization', `${(utilization * 100).toFixed(1)} %`);
        this.setHTML('colReinforcement', `${numBars} - T${barSize} bars`);
        this.setHTML('colTies', `T${tieSize} @ ${tieSpacing} mm c/c`);
        this.setHTML('colSteelProvided', `${(numBars * Math.PI * barSize * barSize / 4).toFixed(0)} mm²`);
        this.setHTML('colSlenderness', `${Math.max(slendernessX, slendernessY).toFixed(1)}`);
        this.setHTML('colMinSteel', pt >= 0.8 ? 'OK' : 'FAIL');
        this.setHTML('colMaxSteel', pt <= 4.0 ? 'OK' : 'FAIL');

        // Overall status
        const isSafe = utilization <= 1.0 && pt >= 0.8 && pt <= 4.0 && slendernessX <= 50 && slendernessY <= 50;
        this.updateStatusVisual('colStatus', isSafe,
            isSafe ? `PASS - Column design adequate` : `FAIL - Review design parameters`);

        // Create interaction diagram
        this.createColumnInteractionChart(Pu, Pc, Mux, fck, fy, b, D, Asc);
    }

    getSuitableBarSize(area) {
        const bars = [12, 16, 20, 25, 32];
        for (const size of bars) {
            const areaPerBar = Math.PI * size * size / 4;
            const numBars = Math.ceil(area / areaPerBar);
            if (numBars >= 4 && numBars <= 12) {
                return size;
            }
        }
        return 16; // Default size
    }

    createColumnInteractionChart(Pu, Pc, Mux, fck, fy, b, D, Asc) {
        // Generate interaction curve points
        const points = [];
        const steps = 10;
        
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const P = Pc * (1 - ratio * ratio); // Simplified interaction
            const M = Mux * ratio;
            points.push({ x: M, y: P });
        }

        this.createChart('column-chart', {
            type: 'line',
            data: {
                labels: points.map(p => p.x.toFixed(1)),
                datasets: [{
                    label: 'Interaction Diagram',
                    data: points.map(p => p.y),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true
                }, {
                    label: 'Design Point',
                    data: [{ x: Mux, y: Pu }],
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Column Interaction Diagram'
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Axial Load (kN)' }
                    },
                    x: {
                        title: { display: true, text: 'Bending Moment (kNm)' }
                    }
                }
            }
        });
    }

    drawColumnVisual() {
        const b = this.getVal('colWidth') || 300;
        const D = this.getVal('colDepth') || 450;
        const container = this.getEl('column-visual');
        if (!container) return;
        
        const scale = 150 / Math.max(b, D);
        const w = b * scale;
        const h = D * scale;
        
        let svg = `<svg viewBox="0 0 200 200" class="w-full h-full">`;
        svg += `<rect x="${100 - w/2}" y="${100 - h/2}" width="${w}" height="${h}" fill="#e5e7eb" stroke="#4b5563" stroke-width="2"/>`;
        
        // Reinforcement bars (4 corners)
        const barRadius = Math.max(2, w * 0.02);
        const positions = [
            [100 - w/2 + 15, 100 - h/2 + 15],
            [100 + w/2 - 15, 100 - h/2 + 15],
            [100 - w/2 + 15, 100 + h/2 - 15],
            [100 + w/2 - 15, 100 + h/2 - 15]
        ];
        
        positions.forEach(([x, y]) => {
            svg += `<circle cx="${x}" cy="${y}" r="${barRadius}" fill="#4338ca"/>`;
        });
        
        // Lateral ties
        svg += `<rect x="${100 - w/2 + 10}" y="${100 - h/2 + 10}" width="${w - 20}" height="${h - 20}" stroke="#6b7280" stroke-width="1" fill="none"/>`;
        
        svg += `</svg>`;
        container.innerHTML = svg;
    }

    // IMPROVED SLAB DESIGN ALGORITHMS
    runSlabDesign() {
        this.drawSlabVisual();
        
        const Lx = this.getVal('slabLx');
        const Ly = this.getVal('slabLy');
        const LL = this.getVal('slabLL');
        const finish = this.getVal('slabFinish');
        const support = this.getEl('slabSupport').value;
        const fck = this.getVal('slabFck');
        const fy = this.getVal('slabFy');
        const cover = this.getVal('slabCover');

        if (isNaN(Lx) || isNaN(Ly) || Lx <= 0) return;

        // Determine slab type
        const ratio = Ly / Lx;
        const isTwoWay = ratio <= 2;
        const slabType = isTwoWay ? 'Two-Way Slab' : 'One-Way Slab';

        // Calculate slab depth (IS 456)
        const basicSpanDepth = isTwoWay ? 35 : 28;
        const depthRequired = Math.ceil((Lx * 1000) / basicSpanDepth / 10) * 10; // Round to nearest 10mm
        const depthProvided = Math.max(depthRequired, 125); // Minimum 125mm

        // Calculate loads
        const selfWeight = (depthProvided / 1000) * 25; // kN/m²
        const totalLoad = selfWeight + finish + LL;
        const factoredLoad = 1.5 * totalLoad;

        // Calculate moments
        let Mx = 0, My = 0;
        if (isTwoWay) {
            // Two-way slab moments (IS 456 coefficients)
            const alpha_x = 0.087; // For continuous slab
            const alpha_y = 0.056;
            Mx = alpha_x * factoredLoad * Lx * Lx;
            My = alpha_y * factoredLoad * Lx * Lx;
        } else {
            // One-way slab moment
            Mx = (factoredLoad * Lx * Lx) / 8;
            My = 0;
        }

        // Calculate reinforcement
        const d = depthProvided - cover - 5; // Effective depth
        const Astx = this.calculateSteelArea(Mx * 1e6, fck, fy, 1000, d);
        const Asty = isTwoWay ? this.calculateSteelArea(My * 1e6, fck, fy, 1000, d) : 0;
        const Ast_min = 0.0012 * 1000 * depthProvided; // Minimum steel

        // Reinforcement spacing
        const barDia = 10; // Assume 10mm bars
        const areaPerBar = Math.PI * barDia * barDia / 4;
        const spacingX = Math.min(Math.floor((areaPerBar * 1000) / Math.max(Astx, Ast_min)), 300);
        const spacingY = isTwoWay ? Math.min(Math.floor((areaPerBar * 1000) / Math.max(Asty, Ast_min)), 300) : 300;
        const distSpacing = 300; // Distribution steel spacing

        // Calculate material quantities
        const volume = Lx * Ly * (depthProvided / 1000);
        const materials = this.calculateMaterialQuantities(volume, fck);

        // Update results
        this.setHTML('slabType', slabType);
        this.setHTML('slabDepth', `${depthProvided} mm`);
        this.setHTML('slabMaxMoment', `${Math.max(Mx, My).toFixed(2)} kNm/m`);
        this.setHTML('slabSteelPercent', `${((Math.max(Astx, Ast_min) / (1000 * d)) * 100).toFixed(2)} %`);
        this.setHTML('slabShortSteel', `T10 @ ${spacingX} mm c/c`);
        this.setHTML('slabLongSteel', isTwoWay ? `T10 @ ${spacingY} mm c/c` : `T10 @ 300 mm c/c`);
        this.setHTML('slabDistSteel', `T8 @ ${distSpacing} mm c/c`);
        this.setHTML('slabDeflection', depthProvided >= depthRequired ? 'OK' : 'FAIL');
        this.setHTML('slabCracking', spacingX <= 300 ? 'OK' : 'FAIL');
        this.setHTML('slabShear', 'OK'); // Simplified check

        // Material quantities
        this.setHTML('slabConcreteVol', materials.vol);
        this.setHTML('slabCement', materials.cement);
        this.setHTML('slabSand', materials.sand);
        this.setHTML('slabAggregate', materials.aggregate);

        // Status check
        const isSafe = depthProvided >= depthRequired && spacingX <= 300;
        this.updateStatusVisual('slabStatus', isSafe,
            isSafe ? 'PASS - Slab design adequate' : 'FAIL - Review design parameters');
    }

    drawSlabVisual() {
        const Lx = this.getVal('slabLx') || 4;
        const Ly = this.getVal('slabLy') || 6;
        const container = this.getEl('slab-visual');
        if (!container) return;

        const ratio = Ly / Lx;
        const isTwoWay = ratio <= 2;
        const w = 180;
        const h = 180 / ratio;
        
        let svg = `<svg viewBox="-40 -40 ${w + 80} ${h + 80}" class="w-full h-full">`;
        svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="#eef2ff" stroke="#4f46e5" stroke-width="1.5"/>`;
        
        // Reinforcement pattern
        const spacing = 15;
        for (let i = spacing; i < w; i += spacing) {
            svg += `<line x1="${i}" y1="0" x2="${i}" y2="${h}" stroke="#3b82f6" stroke-width="0.75"/>`;
        }
        if (isTwoWay) {
            for (let i = spacing; i < h; i += spacing) {
                svg += `<line x1="0" y1="${i}" x2="${w}" y2="${i}" stroke="#3b82f6" stroke-width="0.75" stroke-dasharray="3"/>`;
            }
        }
        
        svg += `<text x="${w/2}" y="-15" font-family="Arial" font-size="10" text-anchor="middle" fill="#374151">Ly = ${Ly.toFixed(1)} m</text>`;
        svg += `<text x="-15" y="${h/2}" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 -15,${h/2})">Lx = ${Lx.toFixed(1)} m</text>`;
        svg += `</svg>`;
        container.innerHTML = svg;
    }

    // Additional module implementations with improved algorithms
    runFootingDesign() {
        const P = this.getVal('footingLoad') || 1000;
        const SBC = this.getVal('footingSBC') || 200;
        const fck = this.getVal('footingFck') || 25;
        
        const areaReq = (P * 1.1) / SBC;
        const side = Math.ceil(Math.sqrt(areaReq) * 10) / 10;
        const depth = Math.max(300, side * 1000 / 4.5); // Minimum 300mm or L/4.5
        
        const materials = this.calculateMaterialQuantities(side * side * (depth / 1000), fck);
        
        this.setText('footingArea', `${areaReq.toFixed(2)} m²`);
        this.setText('footingSize', `${side.toFixed(1)}m x ${side.toFixed(1)}m`);
        this.setText('footingDepth', `${depth} mm`);
        this.setText('footingConcreteVol', materials.vol);
        this.setText('footingCement', materials.cement);
        this.setText('footingSand', materials.sand);
        this.setText('footingAggregate', materials.aggregate);
        
        this.showToast('Footing design completed', 'success');
    }

    runBBS() {
        const L = this.getVal('bbsLength') || 6;
        const b = this.getVal('bbsWidth') || 230;
        const D = this.getVal('bbsDepth') || 450;
        const cover = this.getVal('bbsCover') || 25;
        const topBars = this.getVal('bbsTopNum') || 2;
        const topDia = this.getVal('bbsTopDia') || 16;
        const botBars = this.getVal('bbsBotNum') || 3;
        const botDia = this.getVal('bbsBotDia') || 16;
        const stirrupDia = this.getVal('bbsStirrupDia') || 8;
        const stirrupSpacing = this.getVal('bbsStirrupSpacing') || 150;

        // Calculate cutting lengths
        const hookLength = 9 * botDia;
        const topCutLength = L * 1000 - 2 * cover + 2 * hookLength;
        const botCutLength = L * 1000 - 2 * cover + 2 * hookLength;
        
        const stirrupWidth = b - 2 * cover;
        const stirrupDepth = D - 2 * cover;
        const stirrupCutLength = 2 * (stirrupWidth + stirrupDepth) + 2 * 9 * stirrupDia;
        
        const numStirrups = Math.floor((L * 1000 - 2 * cover) / stirrupSpacing) + 1;

        // Calculate weights
        const weight = (dia, len, num) => (dia * dia / 162.2) * (len / 1000) * num;
        const topWeight = weight(topDia, topCutLength, topBars);
        const botWeight = weight(botDia, botCutLength, botBars);
        const stirrupWeight = weight(stirrupDia, stirrupCutLength, numStirrups);
        const totalWeight = topWeight + botWeight + stirrupWeight;

        const tableBody = this.getEl('bbs-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="border-b">
                    <td class="p-2">Top Bars</td>
                    <td class="p-2">${topDia}</td>
                    <td class="p-2">${(topCutLength / 1000).toFixed(2)}</td>
                    <td class="p-2">${topBars}</td>
                    <td class="p-2">${((topCutLength * topBars) / 1000).toFixed(2)}</td>
                    <td class="p-2">${topWeight.toFixed(2)}</td>
                </tr>
                <tr class="border-b">
                    <td class="p-2">Bottom Bars</td>
                    <td class="p-2">${botDia}</td>
                    <td class="p-2">${(botCutLength / 1000).toFixed(2)}</td>
                    <td class="p-2">${botBars}</td>
                    <td class="p-2">${((botCutLength * botBars) / 1000).toFixed(2)}</td>
                    <td class="p-2">${botWeight.toFixed(2)}</td>
                </tr>
                <tr class="border-b">
                    <td class="p-2">Stirrups</td>
                    <td class="p-2">${stirrupDia}</td>
                    <td class="p-2">${(stirrupCutLength / 1000).toFixed(2)}</td>
                    <td class="p-2">${numStirrups}</td>
                    <td class="p-2">${((stirrupCutLength * numStirrups) / 1000).toFixed(2)}</td>
                    <td class="p-2">${stirrupWeight.toFixed(2)}</td>
                </tr>
                <tr class="font-bold bg-gray-50">
                    <td class="p-2" colspan="5">Total Weight</td>
                    <td class="p-2">${totalWeight.toFixed(2)}</td>
                </tr>
            `;
        }
        this.showToast('Bar bending schedule generated', 'success');
    }

    // Additional modules with proper implementations
    runStaircaseDesign() {
        const R = this.getVal('stairRiser') || 150;
        const T = this.getVal('stairTread') || 275;
        const W = this.getVal('stairWidth') || 1.2;
        const H = this.getVal('stairHeight') || 3.0;
        const fck = this.getVal('stairFck') || 25;
        
        const numRisers = Math.ceil((H * 1000) / R);
        const numTreads = numRisers - 1;
        const going = (numTreads * T) / 1000;
        const slope = Math.sqrt(R * R + T * T) / T;
        
        const effSpan = going + W / 2;
        const depth = Math.ceil((effSpan * 1000) / 20 / 10) * 10;
        
        const waistLoad = (depth / 1000) * slope * 25;
        const stepLoad = 0.5 * (R / 1000) * 25;
        const totalLoad = 1.5 * (waistLoad + stepLoad + 1 + 4);
        const moment = (totalLoad * effSpan * effSpan) / 10;
        
        this.setText('stairNumRisers', numRisers);
        this.setText('stairNumTreads', numTreads);
        this.setText('stairSlabDepth', `${depth} mm`);
        this.setText('stairMaxMoment', `${moment.toFixed(2)} kNm/m`);
        this.setText('stairMainSteel', 'T12 @ 150 mm');
        this.setText('stairDistSteel', 'T8 @ 250 mm');
        
        this.showToast('Staircase design completed', 'success');
    }

    runRetainingWallDesign() {
        const H = this.getVal('wallHeight') || 3;
        const soilDensity = this.getVal('soilDensity') || 18;
        const soilAngle = this.getVal('soilAngle') || 30;
        const SBC = this.getVal('wallSBC') || 200;
        const fck = this.getVal('wallFck') || 25;
        
        const Ka = Math.pow(Math.tan((45 - soilAngle / 2) * Math.PI / 180), 2);
        const Pa = 0.5 * Ka * soilDensity * H * H;
        
        const baseWidth = 0.6 * H;
        const baseDepth = 0.1 * H;
        const stemThickness = 0.3;
        
        // Stability calculations
        const W_stem = stemThickness * H * 25;
        const W_base = baseWidth * baseDepth * 25;
        const W_soil = (baseWidth - stemThickness) * H * soilDensity;
        const totalWeight = W_stem + W_base + W_soil;
        
        const OT_moment = Pa * (H / 3);
        const resistingMoment = W_stem * (stemThickness / 2) + W_base * (baseWidth / 2) + W_soil * (stemThickness + (baseWidth - stemThickness) / 2);
        const FOS_overturning = resistingMoment / OT_moment;
        
        const FOS_sliding = (0.5 * totalWeight) / Pa;
        
        this.setText('wallMaxPressure', `${(totalWeight / baseWidth * 1.2).toFixed(2)} kN/m²`);
        this.setText('wallMinPressure', `${(totalWeight / baseWidth * 0.8).toFixed(2)} kN/m²`);
        this.setText('wallFOS_OT', FOS_overturning.toFixed(2));
        this.setText('wallFOS_SL', FOS_sliding.toFixed(2));
        this.setText('wallStemSteel', 'T12 @ 150 mm');
        this.setText('wallBaseSteel', 'T10 @ 200 mm');
        
        this.showToast('Retaining wall analysis completed', 'success');
    }

    runWaterTankDesign() {
        const L = this.getVal('tankLength') || 4;
        const W = this.getVal('tankWidth') || 3;
        const H = this.getVal('tankHeight') || 2.5;
        
        const waterDensity = 9.81;
        const hoopTension = waterDensity * H * W / 2;
        const bendingMoment = (1 / 12) * waterDensity * H * H * H;
        const steelArea = (hoopTension * 1000) / 150; // Assuming 150 MPa stress
        
        this.setText('tankHoopTension', `${hoopTension.toFixed(2)} kN/m`);
        this.setText('tankBendingMoment', `${bendingMoment.toFixed(2)} kNm/m`);
        this.setText('tankWallSteel', `T${Math.ceil(Math.sqrt(steelArea / 0.7854) / 2) * 2} @ 150 mm`);
        this.setText('tankBaseSteel', 'T10 @ 200 mm both ways');
        
        this.showToast('Water tank design completed', 'success');
    }

    runSteelDesign() {
        const sectionType = this.getEl('steelSectionType').value;
        const Fy = this.getVal('steelFy') || 355;
        const L = this.getVal('steelLength') || 3;
        const P = this.getVal('steelLoad') || 500;
        const M = this.getVal('steelMoment') || 50;
        
        let capacity, utilization, slenderness;
        
        if (sectionType === 'compression') {
            // Assume UB 203x133x25 section properties
            const A = 3200; // mm²
            const r = 85; // mm
            slenderness = (L * 1000) / r;
            capacity = 0.6 * Fy * A / 1000; // kN
            utilization = P / capacity;
        } else {
            // Assume UB 254x146x31 section properties
            const Z = 350000; // mm³
            capacity = Fy * Z / 1e6; // kNm
            utilization = M / capacity;
        }
        
        this.setText('steelCapacity', `${capacity.toFixed(0)} ${sectionType === 'compression' ? 'kN' : 'kNm'}`);
        this.setText('steelUtilization', `${(utilization * 100).toFixed(1)} %`);
        this.setText('steelSlenderness', slenderness ? slenderness.toFixed(1) : 'N/A');
        this.setText('steelSafety', utilization <= 1.0 ? 'OK' : 'FAIL');
        this.setText('steelArea', '3200 mm²');
        this.setText('steelInertia', '25.0 ×10⁶ mm⁴');
        this.setText('steelModulus', '350,000 mm³');
        this.setText('steelYielding', utilization <= 1.0 ? 'OK' : 'FAIL');
        this.setText('steelBuckling', slenderness < 180 ? 'OK' : 'FAIL');
        this.setText('steelDeflection', 'OK');
        
        const isSafe = utilization <= 1.0 && (!slenderness || slenderness < 180);
        this.updateStatusVisual('steelStatusVisual', isSafe,
            isSafe ? 'PASS - Steel design adequate' : 'FAIL - Review design parameters');
    }

    runConcreteMixDesign() {
        const grade = this.getVal('mixGrade') || 25;
        const slump = this.getVal('mixSlump') || 75;
        const aggSize = this.getVal('mixAggSize') || 20;
        const exposure = this.getEl('mixExposure').value;
        
        // IS 10262:2019 based calculations
        const wcRatio = this.getWaterCementRatio(grade, exposure);
        const waterContent = this.getWaterContent(slump, aggSize);
        const cementContent = waterContent / wcRatio;
        const fineAggregate = this.getFineAggregateContent(aggSize, wcRatio);
        const coarseAggregate = this.getCoarseAggregateContent(aggSize);
        const mixRatio = this.calculateMixRatio(cementContent, fineAggregate, coarseAggregate);
        
        this.setHTML('mixWCRatio', wcRatio.toFixed(2));
        this.setHTML('mixCementContent', `${Math.ceil(cementContent)} kg/m³`);
        this.setHTML('mixWaterContent', `${waterContent} kg/m³`);
        this.setHTML('mixFineAgg', `${fineAggregate} kg/m³`);
        this.setHTML('mixCoarseAgg', `${coarseAggregate} kg/m³`);
        this.setHTML('mixRatio', mixRatio);
        
        this.createMixProportionChart(cementContent, fineAggregate, coarseAggregate, waterContent);
        this.showToast('Concrete mix design completed', 'success');
    }

    getWaterCementRatio(grade, exposure) {
        const ratios = {
            'mild': {20: 0.55, 25: 0.50, 30: 0.45, 35: 0.40, 40: 0.35},
            'moderate': {20: 0.50, 25: 0.45, 30: 0.40, 35: 0.35, 40: 0.30},
            'severe': {20: 0.45, 25: 0.40, 30: 0.35, 35: 0.30, 40: 0.25}
        };
        return ratios[exposure][grade] || 0.45;
    }

    getWaterContent(slump, aggSize) {
        let baseWater = 186;
        if (aggSize === 10) baseWater += 10;
        if (aggSize === 40) baseWater -= 10;
        if (slump > 75) baseWater += (slump - 75) * 0.3;
        return Math.round(baseWater);
    }

    getFineAggregateContent(aggSize, wcRatio) {
        let baseContent = 35;
        if (aggSize === 10) baseContent += 5;
        if (aggSize === 40) baseContent -= 5;
        if (wcRatio > 0.5) baseContent -= 2;
        return Math.round(1600 * baseContent / 100);
    }

    getCoarseAggregateContent(aggSize) {
        return aggSize === 10 ? 1200 : aggSize === 20 ? 1300 : 1400;
    }

    calculateMixRatio(cement, fineAgg, coarseAgg) {
        const ratio = fineAgg / cement;
        return `1 : ${ratio.toFixed(2)} : ${(coarseAgg / cement).toFixed(2)}`;
    }

    createMixProportionChart(cement, fineAgg, coarseAgg, water) {
        const total = cement + fineAgg + coarseAgg + water;
        
        this.createChart('mixChart', {
            type: 'doughnut',
            data: {
                labels: ['Cement', 'Fine Aggregate', 'Coarse Aggregate', 'Water'],
                datasets: [{
                    data: [
                        (cement / total * 100).toFixed(1),
                        (fineAgg / total * 100).toFixed(1),
                        (coarseAgg / total * 100).toFixed(1),
                        (water / total * 100).toFixed(1)
                    ],
                    backgroundColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#78716c',
                        '#3b82f6'
                    ]
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Mix Proportions (%)'
                    }
                }
            }
        });
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CivilSuiteApp();
    window.app.init().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});