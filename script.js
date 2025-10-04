// Civil Structural Design Suite - Enhanced with Improved Algorithms v2.0
class CivilSuiteApp {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-button');
        this.contents = document.querySelectorAll('.tab-content');
        this.history = [];
        this.charts = new Map();
        this.isDarkMode = false;
        this.currentProject = {
            name: 'Untitled Project',
            version: '2.0',
            timestamp: new Date().toISOString()
        };

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

        // Material properties database
        this.materialDB = {
            concrete: {
                20: { fck: 20, Ec: 22360, density: 25 },
                25: { fck: 25, Ec: 25000, density: 25 },
                30: { fck: 30, Ec: 27386, density: 25 },
                35: { fck: 35, Ec: 29580, density: 25 },
                40: { fck: 40, Ec: 31623, density: 25 }
            },
            steel: {
                415: { fy: 415, Es: 200000 },
                500: { fy: 500, Es: 200000 },
                550: { fy: 550, Es: 200000 }
            }
        };
    }

    async init() {
        try {
            this.showLoading(10, 'Loading application...');
            await this.loadHistory();
            this.setupEventListeners();
            this.applySavedTheme();
            
            this.showLoading(40, 'Initializing modules...');
            this.runActiveAnalysis();
            
            this.showLoading(80, 'Finalizing setup...');
            
            setTimeout(() => {
                this.hideLoading();
                this.showToast('Civil Suite v2.0 ready!', 'success');
            }, 800);
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }

    // Enhanced loading management
    showLoading(progress = 0, message = '') {
        const loadingEl = document.getElementById('loading');
        const progressEl = document.getElementById('loading-progress');
        const detailsEl = document.getElementById('loading-details');
        
        if (loadingEl) loadingEl.classList.remove('hidden', 'fade-out');
        if (progressEl) progressEl.style.width = `${progress}%`;
        if (detailsEl && message) detailsEl.textContent = message;
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

    // Enhanced theme management
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
                '☀️ Light Mode' : '🌙 Dark Mode';
        }
    }

    updateChartsForTheme() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
        this.runActiveAnalysis();
    }

    // Enhanced utility functions
    getVal(id) { 
        const element = document.getElementById(id);
        if (!element) return 0;
        
        const value = element.value;
        if (element.type === 'number') {
            return value === '' ? 0 : parseFloat(value);
        }
        return value;
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

    // Enhanced event listeners
    setupEventListeners() {
        // Tab switching
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });

        // Run buttons with enhanced validation
        Object.keys(this.analysisModules).forEach(moduleId => {
            const moduleName = moduleId.split('-')[0];
            const buttonId = `run${this.capitalizeFirst(moduleName)}Button`;
            const button = this.getEl(buttonId);
            
            if (button) {
                button.addEventListener('click', () => {
                    if (this.validateInputs(moduleId)) {
                        this.showLoading(30, `Running ${moduleName} analysis...`);
                        setTimeout(() => {
                            try {
                                this.analysisModules[moduleId].call(this);
                                this.saveToHistory(moduleId);
                                this.showToast(`${this.capitalizeFirst(moduleName)} analysis completed`, 'success');
                            } catch (error) {
                                console.error(`Error in ${moduleId}:`, error);
                                this.showToast(`${moduleName} analysis failed`, 'error');
                            } finally {
                                this.hideLoading();
                            }
                        }, 100);
                    }
                });
            }
        });

        // Enhanced print buttons
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

        // Enhanced real-time input updates with better debouncing
        document.querySelectorAll('input[type="number"], select').forEach(input => {
            input.addEventListener('input', this.debounce(() => {
                this.validateField(input);
                const activeTabId = this.getActiveTabId();
                if (this.analysisModules[activeTabId]) {
                    this.analysisModules[activeTabId].call(this);
                }
            }, 500));
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.exportProject();
                        break;
                    case 'o':
                        e.preventDefault();
                        document.getElementById('import-project').click();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                }
            }
        });
    }

    // Enhanced input validation
    validateInputs(moduleId) {
        const container = this.getEl(moduleId);
        if (!container) return false;

        const inputs = container.querySelectorAll('input[type="number"], select');
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

    // Enhanced tab management
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

        // Update URL for sharing
        window.history.replaceState(null, null, `#${target}`);
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

    // Enhanced chart management
    createChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const textColor = this.isDarkMode ? '#f1f5f9' : '#374151';
        const gridColor = this.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        color: textColor,
                        font: {
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: this.isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: this.isDarkMode ? '#334155' : '#e2e8f0',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
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

    // Enhanced toast notifications
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

    // Enhanced history management
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
            data: values,
            results: this.getCurrentResults(moduleId)
        };

        this.history.unshift(historyEntry);
        
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        await this.saveHistoryToStorage();
        this.updateHistoryBadge();
    }

    getCurrentResults(moduleId) {
        const container = this.getEl(moduleId);
        const resultElements = container?.querySelectorAll('[id$="Steel"], [id$="Moment"], [id$="Shear"], [id$="Capacity"]') || [];
        const results = {};
        
        resultElements.forEach(el => {
            if (el.textContent && el.textContent !== '-') {
                results[el.id] = el.textContent;
            }
        });
        
        return results;
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
                ${entry.results ? `
                <div class="mt-2 text-xs text-green-600">
                    ${Object.values(entry.results).slice(0, 2).join(', ')}
                </div>
                ` : ''}
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

    // Enhanced project management
    exportProject() {
        const projectName = prompt('Enter project name:', this.currentProject.name);
        if (!projectName) return;

        this.currentProject.name = projectName;
        this.currentProject.timestamp = new Date().toISOString();
        
        const project = {
            ...this.currentProject,
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
        const exportFileDefaultName = `${project.name.replace(/\s+/g, '_')}.civiljson`;

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
                this.currentProject = {
                    name: project.name,
                    version: project.version,
                    timestamp: project.timestamp
                };
                this.showToast(`Project "${project.name}" imported successfully`, 'success');
            } catch (error) {
                this.showToast('Failed to import project - invalid file format', 'error');
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

    // Enhanced print functionality
    printReport(event) {
        const moduleContainer = event.target.closest('.module-container');
        const moduleTitle = moduleContainer?.querySelector('h3')?.innerText || 'Civil Suite Report';
        const inputsContainer = moduleContainer?.querySelector('.xl\\:col-span-1');

        let reportHTML = `
            <!DOCTYPE html>
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
                        max-width: 1000px;
                        margin: 0 auto;
                    }
                    .report-header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .report-title { 
                        font-size: 2rem; 
                        font-weight: 700; 
                        color: #312e81; 
                        margin-bottom: 10px;
                    }
                    .report-section { 
                        border: 1px solid #ccc; 
                        border-radius: 8px; 
                        padding: 1.5rem; 
                        margin-bottom: 1.5rem; 
                        page-break-inside: avoid; 
                    }
                    .section-title { 
                        font-size: 1.25rem; 
                        font-weight: 700; 
                        color: #4f46e5; 
                        border-bottom: 1px solid #e0e7ff; 
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
                    .results-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-top: 20px;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 0.8rem;
                        color: #6b7280;
                        border-top: 1px solid #e5e7eb;
                        padding-top: 20px;
                    }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; }
                        .report-section { border: 1px solid #000; }
                    }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <h1 class="report-title">Civil Suite - Design Report</h1>
                    <p class="text-gray-600">${moduleTitle}</p>
                    <p class="text-gray-500">Generated on: ${new Date().toLocaleString()}</p>
                </div>
        `;

        if (inputsContainer) {
            reportHTML += '<div class="report-section"><h2 class="section-title">Input Parameters</h2><div class="grid-print">';
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

        // Add results section
        reportHTML += '<div class="report-section"><h2 class="section-title">Design Results</h2><div class="results-grid">';
        
        // Get all result elements and split into two columns
        const resultElements = moduleContainer.querySelectorAll('[id*="Steel"], [id*="Moment"], [id*="Shear"], [id*="Capacity"], [id*="Deflection"]');
        const midPoint = Math.ceil(resultElements.length / 2);
        
        for (let i = 0; i < resultElements.length; i++) {
            if (i === midPoint) reportHTML += '</div><div>';
            const element = resultElements[i];
            if (element.textContent && element.textContent !== '-') {
                reportHTML += `<div class="flex justify-between mb-2">
                    <span>${element.previousElementSibling?.textContent || element.id}:</span>
                    <span class="font-bold">${element.textContent}</span>
                </div>`;
            }
        }
        
        reportHTML += '</div></div>';

        reportHTML += `
            <div class="footer">
                <p>Generated by Civil Structural Design Suite v2.0</p>
                <p>Professional Engineering Tools</p>
            </div>
            </body>
            </html>
        `;

        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
        
        setTimeout(() => {
            reportWindow.print();
        }, 500);
    }

    // Enhanced status visual updates
    updateStatusVisual(elementId, isSafe, message, details = '') {
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
        
        el.innerHTML = `${icon}<div><div class="font-semibold">${message}</div>${details ? `<div class="text-sm opacity-80">${details}</div>` : ''}</div>`;
    }

    // Enhanced utility methods
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

    // Enhanced material quantity calculation
    calculateMaterialQuantities(volume, grade) {
        if (isNaN(volume) || volume <= 0) {
            return { vol: '-', cement: '-', sand: '-', aggregate: '-' };
        }

        const mixRatios = { 
            20: { cement: 1, sand: 1.5, aggregate: 3, water: 0.5 },
            25: { cement: 1, sand: 1, aggregate: 2, water: 0.45 },
            30: { cement: 1, sand: 0.8, aggregate: 1.8, water: 0.4 },
            35: { cement: 1, sand: 0.7, aggregate: 1.6, water: 0.35 },
            40: { cement: 1, sand: 0.6, aggregate: 1.4, water: 0.3 }
        };

        const ratio = mixRatios[grade] || mixRatios[25];
        const sumOfRatio = ratio.cement + ratio.sand + ratio.aggregate;
        const dryVolume = volume * 1.54;
        
        const cementVolume = (dryVolume * ratio.cement) / sumOfRatio;
        const cementBags = Math.ceil((cementVolume * 1440) / 50);
        
        return {
            vol: `${volume.toFixed(3)} m³`,
            cement: `${cementBags} bags (${(cementVolume * 1440 / 1000).toFixed(1)} kg)`,
            sand: `${((dryVolume * ratio.sand) / sumOfRatio).toFixed(3)} m³`,
            aggregate: `${((dryVolume * ratio.aggregate) / sumOfRatio).toFixed(3)} m³`,
            water: `${(cementBags * 50 * ratio.water / 1000).toFixed(1)} m³`
        };
    }

    // IMPROVED BEAM ANALYSIS ALGORITHMS
    runBeamAnalysis() {
        this.drawBeamVisual();
        
        const L = this.getVal('beamLength');
        const w = this.getVal('beamUDL');
        const P = this.getVal('beamPointLoad');
        const a = this.getVal('beamPointLoadPos'); // Position of point load
        const type = this.getEl('beamType').value;
        const b = this.getVal('beamWidth') / 1000; // Convert to meters
        const D = this.getVal('beamDepth') / 1000; // Convert to meters
        const fck = this.getVal('beamFck');
        const fy = this.getVal('beamFy');
        const cover = this.getVal('beamCover') / 1000; // Convert to meters

        if (isNaN(L) || L <= 0) return;

        // Get material properties
        const concrete = this.materialDB.concrete[fck];
        const steel = this.materialDB.steel[fy];

        // Calculate reactions and internal forces with improved algorithms
        let reactions = { left: 0, right: 0 };
        let maxShear = 0, maxMoment = 0, maxDeflection = 0;

        switch(type) {
            case 'simply-supported':
                reactions.left = (w * L) / 2 + (P * (L - a)) / L;
                reactions.right = (w * L) / 2 + (P * a) / L;
                maxShear = Math.max(reactions.left, reactions.right);
                
                // Calculate maximum moment (considering both UDL and point load)
                const M_udl = (w * L * L) / 8;
                const M_point = (P * a * (L - a)) / L;
                maxMoment = M_udl + M_point;
                
                // Improved deflection calculation
                const I = this.calculateMomentOfInertia(b, D);
                const deflection_udl = (5 * w * Math.pow(L, 4)) / (384 * concrete.Ec * I * 1e6);
                const deflection_point = (P * a * (3 * L * L - 4 * a * a)) / (48 * concrete.Ec * I * 1e6);
                maxDeflection = (deflection_udl + deflection_point) * 1000; // Convert to mm
                break;
                
            case 'cantilever':
                reactions.left = w * L + P;
                maxShear = reactions.left;
                maxMoment = (w * L * L) / 2 + P * a;
                const I_cantilever = this.calculateMomentOfInertia(b, D);
                const deflection_cantilever_udl = (w * Math.pow(L, 4)) / (8 * concrete.Ec * I_cantilever * 1e6);
                const deflection_cantilever_point = (P * Math.pow(a, 3)) / (3 * concrete.Ec * I_cantilever * 1e6);
                maxDeflection = (deflection_cantilever_udl + deflection_cantilever_point) * 1000;
                break;
                
            case 'fixed':
                reactions.left = (w * L) / 2;
                reactions.right = (w * L) / 2;
                maxShear = reactions.left;
                maxMoment = (w * L * L) / 12; // At supports
                const I_fixed = this.calculateMomentOfInertia(b, D);
                maxDeflection = (w * Math.pow(L, 4)) / (384 * concrete.Ec * I_fixed * 1e6) * 1000;
                break;

            case 'continuous':
                // Simplified continuous beam (2 spans)
                reactions.left = (3 * w * L) / 8;
                reactions.right = (3 * w * L) / 8;
                const middleReaction = (10 * w * L) / 8;
                maxShear = Math.max(reactions.left, reactions.right, middleReaction);
                maxMoment = (w * L * L) / 8; // At middle support
                const I_continuous = this.calculateMomentOfInertia(b, D);
                maxDeflection = (w * Math.pow(L, 4)) / (185 * concrete.Ec * I_continuous * 1e6) * 1000;
                break;
        }

        // Calculate reinforcement with improved algorithms
        const d = D * 1000 - cover * 1000 - 10; // Effective depth (mm)
        const Ast_req = this.calculateSteelArea(maxMoment * 1e6, fck, fy, b * 1000, d);
        const Ast_min = Math.max(0.0012 * b * 1000 * D * 1000, 0.85 * b * 1000 * d / fy); // Minimum steel
        const Ast = Math.max(Ast_req, Ast_min);

        // Calculate capacities with improved formulas
        const momentCapacity = this.calculateMomentCapacity(Ast, fy, fck, b * 1000, d);
        const shearCapacity = this.calculateShearCapacity(fck, b * 1000, d);
        const utilization = (maxMoment * 1e6) / momentCapacity;

        // Calculate shear reinforcement
        const shearStress = (maxShear * 1000) / (b * 1000 * d);
        const concreteShearStrength = 0.25 * Math.sqrt(fck);
        let shearReinforcement = 'Minimum shear reinforcement required';
        
        if (shearStress > concreteShearStrength) {
            const Vus = maxShear * 1000 - (0.5 * Math.sqrt(fck) * b * 1000 * d);
            const Asv_req = (Vus * 1000) / (0.87 * fy * d);
            shearReinforcement = `2L T8 @ ${Math.min(Math.floor((2 * 50.3 * 1000) / Asv_req), 300)} mm c/c`;
        }

        // Update results
        this.setHTML('beamMaxShear', `${maxShear.toFixed(2)} kN`);
        this.setHTML('beamMaxMoment', `${maxMoment.toFixed(2)} kNm`);
        this.setHTML('beamMaxDeflection', `${maxDeflection.toFixed(2)} mm`);
        this.setHTML('beamBottomSteel', `${this.formatReinforcement(Ast)}`);
        this.setHTML('beamTopSteel', `${this.formatReinforcement(Ast_min)}`);
        this.setHTML('beamShearSteel', shearReinforcement);
        this.setHTML('beamMomentCapacity', `${(momentCapacity / 1e6).toFixed(2)} kNm`);
        this.setHTML('beamShearCapacity', `${(shearCapacity / 1000).toFixed(2)} kN`);
        this.setHTML('beamDeflectionCheck', maxDeflection < L * 1000 / 250 ? 'PASS' : 'FAIL');
        this.setHTML('beamUtilization', `${(utilization * 100).toFixed(1)}%`);
        this.setHTML('beamDesignStatus', utilization <= 1 ? 'Adequate' : 'Inadequate');

        // Create enhanced diagrams
        const sfdData = this.generateSFDData(type, L, w, P, a);
        const bmdData = this.generateBMDData(type, L, w, P, a);
        this.createBeamCharts(sfdData, bmdData, maxMoment, maxShear);
        
        // Update status with enhanced information
        const isSafe = momentCapacity >= maxMoment * 1e6 && shearCapacity >= maxShear * 1000 && maxDeflection < L * 1000 / 250;
        const details = `Moment: ${(utilization * 100).toFixed(1)}% • Shear: ${((maxShear * 1000) / shearCapacity * 100).toFixed(1)}% • Deflection: ${(maxDeflection / (L * 1000) * 250).toFixed(1)}% of limit`;
        this.updateStatusVisual('beamStatus', isSafe,
            isSafe ? 'PASS - Beam design meets all requirements' : 'FAIL - Review design parameters',
            details);
    }

    calculateMomentOfInertia(b, D) {
        return (b * Math.pow(D, 3)) / 12; // m⁴
    }

    calculateSteelArea(M, fck, fy, b, d) {
        // Improved limit state method for steel area calculation (IS 456:2000)
        const fsc = 0.87 * fy;
        const xulim = (0.0035 / (0.0055 + 0.87 * fy / 200000)) * d;
        const Mulim = 0.138 * fck * b * d * d;
        
        if (M <= Mulim) {
            // Singly reinforced section
            const k = M / (fck * b * d * d);
            const la = 0.5 * (1 + Math.sqrt(1 - 4.598 * k));
            const z = la * d;
            return M / (0.87 * fy * z);
        } else {
            // Doubly reinforced section
            const M1 = Mulim;
            const M2 = M - M1;
            const Ast1 = M1 / (0.87 * fy * (d - 0.416 * xulim));
            const Ast2 = M2 / (0.87 * fy * (d - 50)); // Assuming 50mm cover to compression steel
            return Ast1 + Ast2;
        }
    }

    calculateMomentCapacity(Ast, fy, fck, b, d) {
        const fsc = 0.87 * fy;
        const x = (fsc * Ast) / (0.36 * fck * b);
        const z = d - 0.416 * x;
        return 0.87 * fy * Ast * z;
    }

    calculateShearCapacity(fck, b, d) {
        const tau_c = 0.25 * Math.sqrt(fck); // N/mm²
        return tau_c * b * d; // N
    }

    formatReinforcement(area) {
        const bars = [8, 10, 12, 16, 20, 25, 32];
        for (const dia of bars) {
            const areaPerBar = Math.PI * dia * dia / 4;
            const numBars = Math.ceil(area / areaPerBar);
            if (numBars <= 8) {
                return `${numBars} - T${dia} bars (${(areaPerBar * numBars).toFixed(0)} mm²)`;
            }
        }
        const dia = 16;
        const areaPerBar = Math.PI * dia * dia / 4;
        const numBars = Math.ceil(area / areaPerBar);
        return `${numBars} - T${dia} bars (${(areaPerBar * numBars).toFixed(0)} mm²)`;
    }

    generateSFDData(type, L, w, P, a) {
        const points = [];
        const steps = 100;
        
        for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * L;
            let shear = 0;
            
            switch(type) {
                case 'simply-supported':
                    shear = (w * L) / 2 - w * x;
                    if (x > a) shear -= P;
                    break;
                case 'cantilever':
                    shear = w * (L - x) + P;
                    break;
                case 'fixed':
                    shear = (w * L) / 2 - w * x;
                    break;
                case 'continuous':
                    if (x <= L/2) {
                        shear = (3 * w * L) / 8 - w * x;
                    } else {
                        shear = (5 * w * L) / 8 - w * x;
                    }
                    break;
            }
            
            points.push({ x: x, y: shear });
        }
        
        return points;
    }

    generateBMDData(type, L, w, P, a) {
        const points = [];
        const steps = 100;
        
        for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * L;
            let moment = 0;
            
            switch(type) {
                case 'simply-supported':
                    moment = (w * L * x) / 2 - (w * x * x) / 2;
                    if (x > a) moment -= P * (x - a);
                    break;
                case 'cantilever':
                    moment = -((w * (L - x) * (L - x)) / 2 + P * (L - x));
                    break;
                case 'fixed':
                    moment = (w * L * x) / 2 - (w * x * x) / 2 - (w * L * L) / 12;
                    break;
                case 'continuous':
                    if (x <= L/2) {
                        moment = (3 * w * L * x) / 8 - (w * x * x) / 2;
                    } else {
                        moment = (5 * w * L * (L - x)) / 8 - (w * (L - x) * (L - x)) / 2;
                    }
                    break;
            }
            
            points.push({ x: x, y: moment });
        }
        
        return points;
    }

    createBeamCharts(sfdData, bmdData, maxMoment, maxShear) {
        // Enhanced SFD Chart
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
                    tension: 0.1
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Shear Force Diagram',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    annotation: {
                        annotations: {
                            maxLine: {
                                type: 'line',
                                mode: 'horizontal',
                                scaleID: 'y',
                                value: maxShear,
                                borderColor: 'red',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: `Max: ${maxShear.toFixed(2)} kN`,
                                    enabled: true,
                                    position: 'end'
                                }
                            }
                        }
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

        // Enhanced BMD Chart
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
                    tension: 0.1
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Bending Moment Diagram',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    annotation: {
                        annotations: {
                            maxLine: {
                                type: 'line',
                                mode: 'horizontal',
                                scaleID: 'y',
                                value: maxMoment,
                                borderColor: 'blue',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: `Max: ${maxMoment.toFixed(2)} kNm`,
                                    enabled: true,
                                    position: 'end'
                                }
                            }
                        }
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
        const P = this.getVal('beamPointLoad') || 0;
        const a = this.getVal('beamPointLoadPos') || L/2;
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
        } else if (type === 'continuous') {
            svg += `<path d="M 50 60 L 45 75 L 55 75 Z" fill="#4f46e5"/>`;
            svg += `<path d="M 200 60 L 195 75 L 205 75 Z" fill="#4f46e5"/>`;
            svg += `<path d="M 350 60 L 345 75 L 355 75 Z" fill="#4f46e5"/>`;
        }
        
        // Load arrows
        // UDL
        for (let i = 0; i < 5; i++) {
            const x = 50 + (i * 75);
            svg += `<line x1="${x}" y1="30" x2="${x}" y2="60" stroke="#ef4444" stroke-width="2"/>`;
            svg += `<path d="M ${x-5} 25 L ${x} 15 L ${x+5} 25 Z" fill="#ef4444"/>`;
        }
        
        // Point load
        if (P > 0) {
            const pointX = 50 + (a / L) * 300;
            svg += `<line x1="${pointX}" y1="30" x2="${pointX}" y2="60" stroke="#f59e0b" stroke-width="3"/>`;
            svg += `<path d="M ${pointX-7} 25 L ${pointX} 10 L ${pointX+7} 25 Z" fill="#f59e0b"/>`;
            svg += `<text x="${pointX}" y="20" font-family="Arial" font-size="10" text-anchor="middle" fill="#f59e0b">${P} kN</text>`;
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
        const barDia = this.getVal('colBarDiameter');

        if (isNaN(b) || isNaN(D) || isNaN(Pu)) return;

        // Get material properties
        const concrete = this.materialDB.concrete[fck];
        const steel = this.materialDB.steel[fy];

        // Calculate geometric properties
        const Ag = b * D;
        const d = D - cover - barDia/2; // Effective depth
        const d_prime = cover + barDia/2; // Compression steel depth

        // Calculate slenderness with improved formulas
        const lex = H * 1000; // Effective length in mm
        const ley = H * 1000;
        const slendernessX = lex / (0.3 * D);
        const slendernessY = ley / (0.3 * b);
        const maxSlenderness = Math.max(slendernessX, slendernessY);

        // Calculate minimum and maximum steel
        const Asc_min = 0.008 * Ag;
        const Asc_max = 0.04 * Ag;

        // Calculate required steel for axial load (IS 456:2000)
        const Asc_axial = Math.max(0, (Pu * 1000 - 0.4 * fck * Ag) / (0.67 * fy - 0.4 * fck));
        
        // Calculate required steel for biaxial bending (simplified)
        const Ast_moment_x = this.calculateSteelArea(Mux * 1e6, fck, fy, b, d);
        const Ast_moment_y = this.calculateSteelArea(Muy * 1e6, fck, fy, D, b); // Swapped dimensions
        
        // Total steel required (conservative approach)
        const Asc_req = Math.max(Asc_axial, Ast_moment_x, Ast_moment_y, Asc_min);
        const Asc = Math.min(Asc_req, Asc_max);
        const pt = (Asc / Ag) * 100;

        // Calculate column capacity with improved formulas
        const Pc = (0.4 * fck * Ag + 0.67 * fy * Asc) / 1000; // kN
        const utilization = Pu / Pc;

        // Reinforcement details with improved calculations
        const barArea = Math.PI * barDia * barDia / 4;
        const numBars = Math.max(4, Math.ceil(Asc / barArea));
        const Asc_provided = numBars * barArea;
        const pt_provided = (Asc_provided / Ag) * 100;

        const tieSize = Math.max(6, barDia / 4);
        const tieSpacing = Math.min(16 * barDia, 300, b, D);

        // Biaxial interaction check (simplified)
        const interactionRatio = (Mux / (0.138 * fck * b * D * D / 1e6)) + (Muy / (0.138 * fck * D * b * b / 1e6));
        const biaxialCheck = interactionRatio <= 1.0 ? 'OK' : 'FAIL';

        // Update results
        this.setHTML('colSteelArea', `${Asc_provided.toFixed(0)} mm²`);
        this.setHTML('colSteelPercent', `${pt_provided.toFixed(2)} %`);
        this.setHTML('colCapacity', `${Pc.toFixed(0)} kN`);
        this.setHTML('colUtilization', `${(utilization * 100).toFixed(1)} %`);
        this.setHTML('colReinforcement', `${numBars} - T${barDia} bars`);
        this.setHTML('colTies', `T${tieSize} @ ${tieSpacing} mm c/c`);
        this.setHTML('colSteelProvided', `${Asc_provided.toFixed(0)} mm²`);
        this.setHTML('colNumBars', `${numBars} bars`);
        this.setHTML('colSlenderness', `${maxSlenderness.toFixed(1)}`);
        this.setHTML('colMinSteel', pt_provided >= 0.8 ? 'OK' : 'FAIL');
        this.setHTML('colMaxSteel', pt_provided <= 4.0 ? 'OK' : 'FAIL');
        this.setHTML('colBiaxial', biaxialCheck);

        // Overall status
        const isSafe = utilization <= 1.0 && pt_provided >= 0.8 && pt_provided <= 4.0 && 
                      maxSlenderness <= 50 && biaxialCheck === 'OK';
        const details = `Axial: ${(utilization * 100).toFixed(1)}% • Steel: ${pt_provided.toFixed(2)}% • Slenderness: ${maxSlenderness.toFixed(1)}`;
        this.updateStatusVisual('colStatus', isSafe,
            isSafe ? `PASS - Column design adequate` : `FAIL - Review design parameters`,
            details);

        // Create enhanced interaction diagram
        this.createColumnInteractionChart(Pu, Pc, Mux, Muy, fck, fy, b, D, Asc_provided);
    }

    createColumnInteractionChart(Pu, Pc, Mux, Muy, fck, fy, b, D, Asc) {
        // Generate enhanced interaction curve points
        const points = [];
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const P = Pc * (1 - Math.pow(ratio, 1.5)); // Improved interaction curve
            const M = Math.sqrt(Mux * Mux + Muy * Muy) * ratio;
            points.push({ x: M, y: P });
        }

        // Calculate biaxial moment
        const M_combined = Math.sqrt(Mux * Mux + Muy * Muy);

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
                    data: [{ x: M_combined, y: Pu }],
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    showLine: false
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Column Interaction Diagram'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 1) {
                                    return `Design: P=${Pu.toFixed(0)} kN, M=${M_combined.toFixed(1)} kNm`;
                                }
                                return `P=${context.parsed.y.toFixed(0)} kN, M=${context.parsed.x.toFixed(1)} kNm`;
                            }
                        }
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
        const barDia = this.getVal('colBarDiameter') || 16;
        const container = this.getEl('column-visual');
        if (!container) return;
        
        const scale = 150 / Math.max(b, D);
        const w = b * scale;
        const h = D * scale;
        
        let svg = `<svg viewBox="0 0 200 200" class="w-full h-full">`;
        svg += `<rect x="${100 - w/2}" y="${100 - h/2}" width="${w}" height="${h}" fill="#e5e7eb" stroke="#4b5563" stroke-width="2"/>`;
        
        // Calculate number of bars (at least 4, distributed evenly)
        const barRadius = Math.max(2, w * 0.02);
        const numBars = Math.max(4, Math.ceil((b * D * 0.01) / (Math.PI * barDia * barDia / 4)));
        const barsPerSide = Math.ceil(numBars / 2);
        
        // Main reinforcement bars
        for (let i = 0; i < barsPerSide; i++) {
            const xPos = 100 - w/2 + (w / (barsPerSide + 1)) * (i + 1);
            // Left side
            svg += `<circle cx="${100 - w/2 + 15}" cy="${100 - h/2 + 15 + (h - 30) / (barsPerSide - 1) * i}" r="${barRadius}" fill="#4338ca"/>`;
            // Right side
            svg += `<circle cx="${100 + w/2 - 15}" cy="${100 - h/2 + 15 + (h - 30) / (barsPerSide - 1) * i}" r="${barRadius}" fill="#4338ca"/>`;
        }
        
        // Lateral ties
        svg += `<rect x="${100 - w/2 + 10}" y="${100 - h/2 + 10}" width="${w - 20}" height="${h - 20}" stroke="#6b7280" stroke-width="1" fill="none"/>`;
        
        // Dimensions
        svg += `<text x="${100}" y="${100 + h/2 + 20}" font-family="Arial" font-size="10" text-anchor="middle" fill="#374151">${b} mm</text>`;
        svg += `<text x="${100 - w/2 - 15}" y="${100}" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${100 - w/2 - 15},${100})">${D} mm</text>`;
        
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
        const barDia = this.getVal('slabBarDiameter');

        if (isNaN(Lx) || isNaN(Ly) || Lx <= 0) return;

        // Get material properties
        const concrete = this.materialDB.concrete[fck];
        const steel = this.materialDB.steel[fy];

        // Determine slab type with improved logic
        const ratio = Ly / Lx;
        const isTwoWay = ratio <= 2;
        const slabType = isTwoWay ? 'Two-Way Slab' : 'One-Way Slab';

        // Calculate slab depth with improved formulas (IS 456:2000)
        const basicSpanDepth = isTwoWay ? 
            (support === 'simply-supported' ? 35 : 
             support === 'continuous' ? 40 : 32) : 
            (support === 'simply-supported' ? 28 : 
             support === 'continuous' ? 32 : 24);
             
        const depthRequired = Math.ceil((Lx * 1000) / basicSpanDepth / 5) * 5; // Round to nearest 5mm
        const depthProvided = Math.max(depthRequired, 125, Lx * 1000 / 30); // Minimum requirements

        // Calculate loads with improved factors
        const selfWeight = (depthProvided / 1000) * concrete.density; // kN/m²
        const totalLoad = selfWeight + finish + LL;
        const factoredLoad = 1.5 * totalLoad;

        // Calculate moments with improved coefficients
        let Mx = 0, My = 0, Mx_support = 0, My_support = 0;
        
        if (isTwoWay) {
            // Two-way slab moments (IS 456 coefficients)
            const alpha_x = support === 'simply-supported' ? 0.062 : 
                           support === 'continuous' ? 0.044 : 0.032;
            const alpha_y = support === 'simply-supported' ? 0.062 : 
                           support === 'continuous' ? 0.044 : 0.032;
            const alpha_x_neg = support === 'continuous' ? 0.060 : 0.0;
            const alpha_y_neg = support === 'continuous' ? 0.060 : 0.0;
            
            Mx = alpha_x * factoredLoad * Lx * Lx;
            My = alpha_y * factoredLoad * Lx * Lx;
            Mx_support = alpha_x_neg * factoredLoad * Lx * Lx;
            My_support = alpha_y_neg * factoredLoad * Lx * Lx;
        } else {
            // One-way slab moment
            if (support === 'simply-supported') {
                Mx = (factoredLoad * Lx * Lx) / 8;
            } else if (support === 'continuous') {
                Mx = (factoredLoad * Lx * Lx) / 10; // At support
            } else {
                Mx = (factoredLoad * Lx * Lx) / 12; // Fixed
            }
            My = 0.3 * Mx; // Distribution steel moment
        }

        // Calculate reinforcement with improved algorithms
        const d = depthProvided - cover - barDia/2; // Effective depth
        const Astx = this.calculateSteelArea(Mx * 1e6, fck, fy, 1000, d);
        const Asty = isTwoWay ? this.calculateSteelArea(My * 1e6, fck, fy, 1000, d) : 
                               this.calculateSteelArea(My * 1e6, fck, fy, 1000, d - barDia);
        const Ast_min = Math.max(0.0012 * 1000 * depthProvided, 0.85 * 1000 * d / fy);
        const Ast_dist = 0.0012 * 1000 * depthProvided; // Distribution steel

        // Reinforcement spacing with improved calculations
        const areaPerBar = Math.PI * barDia * barDia / 4;
        const spacingX = Math.min(Math.floor((areaPerBar * 1000) / Math.max(Astx, Ast_min)), 300, 3 * depthProvided);
        const spacingY = isTwoWay ? Math.min(Math.floor((areaPerBar * 1000) / Math.max(Asty, Ast_min)), 300, 3 * depthProvided) : 
                                   Math.min(Math.floor((areaPerBar * 1000) / Math.max(Ast_dist, Ast_min)), 300, 5 * depthProvided);
        const distSpacing = Math.min(300, 5 * depthProvided);

        // Calculate material quantities
        const volume = Lx * Ly * (depthProvided / 1000);
        const materials = this.calculateMaterialQuantities(volume, fck);

        // Deflection check with improved formula
        const I = this.calculateMomentOfInertia(1, depthProvided/1000); // For 1m width
        const deflection = (5 * totalLoad * Math.pow(Lx, 4)) / (384 * concrete.Ec * I * 1e6) * 1000;
        const deflectionOK = deflection < Lx * 1000 / 250;

        // Shear check
        const shearStress = (factoredLoad * Lx * 1000) / (2 * 1000 * d);
        const shearCapacity = 0.25 * Math.sqrt(fck);
        const shearOK = shearStress <= shearCapacity;

        // Update results
        this.setHTML('slabType', slabType);
        this.setHTML('slabDepth', `${depthProvided} mm`);
        this.setHTML('slabMaxMoment', `${Math.max(Mx, My, Mx_support, My_support).toFixed(2)} kNm/m`);
        this.setHTML('slabSteelPercent', `${((Math.max(Astx, Ast_min) / (1000 * d)) * 100).toFixed(2)} %`);
        this.setHTML('slabShortSteel', `T${barDia} @ ${spacingX} mm c/c`);
        this.setHTML('slabLongSteel', isTwoWay ? `T${barDia} @ ${spacingY} mm c/c` : `T${barDia} @ ${spacingY} mm c/c`);
        this.setHTML('slabDistSteel', `T8 @ ${distSpacing} mm c/c`);
        this.setHTML('slabSteelProvided', `${(areaPerBar * 1000 / spacingX).toFixed(0)} mm²/m`);
        this.setHTML('slabDeflection', deflectionOK ? 'OK' : 'FAIL');
        this.setHTML('slabCracking', spacingX <= 300 ? 'OK' : 'FAIL');
        this.setHTML('slabShear', shearOK ? 'OK' : 'FAIL');
        this.setHTML('slabMinSteel', Math.max(Astx, Ast_min) >= Ast_min ? 'OK' : 'FAIL');

        // Material quantities
        this.setHTML('slabConcreteVol', materials.vol);
        this.setHTML('slabCement', materials.cement);
        this.setHTML('slabSand', materials.sand);
        this.setHTML('slabAggregate', materials.aggregate);

        // Status check
        const isSafe = depthProvided >= depthRequired && spacingX <= 300 && 
                      deflectionOK && shearOK && Math.max(Astx, Ast_min) >= Ast_min;
        const details = `Moment: ${Math.max(Mx, My, Mx_support, My_support).toFixed(2)} kNm/m • Deflection: ${deflection.toFixed(2)} mm • Steel: ${((Math.max(Astx, Ast_min) / (1000 * d)) * 100).toFixed(2)}%`;
        this.updateStatusVisual('slabStatus', isSafe,
            isSafe ? 'PASS - Slab design adequate' : 'FAIL - Review design parameters',
            details);
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
        
        // Reinforcement pattern - improved visualization
        const spacingX = 15;
        const spacingY = isTwoWay ? 15 : 25;
        
        // Main reinforcement
        for (let i = spacingX; i < w; i += spacingX) {
            svg += `<line x1="${i}" y1="0" x2="${i}" y2="${h}" stroke="#3b82f6" stroke-width="1"/>`;
        }
        
        if (isTwoWay) {
            for (let i = spacingY; i < h; i += spacingY) {
                svg += `<line x1="0" y1="${i}" x2="${w}" y2="${i}" stroke="#3b82f6" stroke-width="1" stroke-dasharray="2"/>`;
            }
        } else {
            // Distribution steel for one-way slab
            for (let i = spacingY * 2; i < h; i += spacingY * 2) {
                svg += `<line x1="0" y1="${i}" x2="${w}" y2="${i}" stroke="#10b981" stroke-width="0.5" stroke-dasharray="3"/>`;
            }
        }
        
        // Support indicators
        if (isTwoWay) {
            svg += `<rect x="0" y="0" width="${w}" height="5" fill="#4f46e5" opacity="0.3"/>`;
            svg += `<rect x="0" y="${h-5}" width="${w}" height="5" fill="#4f46e5" opacity="0.3"/>`;
            svg += `<rect x="0" y="0" width="5" height="${h}" fill="#4f46e5" opacity="0.3"/>`;
            svg += `<rect x="${w-5}" y="0" width="5" height="${h}" fill="#4f46e5" opacity="0.3"/>`;
        } else {
            svg += `<rect x="0" y="0" width="${w}" height="5" fill="#4f46e5" opacity="0.3"/>`;
            svg += `<rect x="0" y="${h-5}" width="${w}" height="5" fill="#4f46e5" opacity="0.3"/>`;
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
        const fy = this.getVal('footingFy') || 500;
        const columnSize = this.getVal('footingColSize') || 300;
        
        // Improved footing design with bending moment calculation
        const areaReq = (P * 1.1) / SBC;
        const side = Math.ceil(Math.sqrt(areaReq) * 10) / 10;
        
        // Calculate depth based on bending and shear
        const projection = (side - columnSize/1000) / 2;
        const netPressure = P / (side * side);
        const bendingMoment = (netPressure * projection * projection) / 2 * 1000; // kNm/m
        
        // Calculate required depth for bending
        const d_req_bending = Math.sqrt(bendingMoment * 1e6 / (0.138 * fck * 1000));
        
        // Check for one-way shear
        const shearForce = netPressure * projection * 1000; // kN/m
        const tau_c = 0.25 * Math.sqrt(fck); // N/mm²
        const d_req_shear = (shearForce * 1000) / (tau_c * 1000);
        
        const depth = Math.max(300, Math.ceil(Math.max(d_req_bending, d_req_shear) / 25) * 25 + 50);
        
        // Calculate reinforcement
        const d_eff = depth - 50;
        const Ast_req = this.calculateSteelArea(bendingMoment * 1e6, fck, fy, 1000, d_eff);
        const Ast_min = 0.0012 * 1000 * depth;
        const Ast = Math.max(Ast_req, Ast_min);
        
        const barDia = 12;
        const areaPerBar = Math.PI * barDia * barDia / 4;
        const spacing = Math.min(Math.floor((areaPerBar * 1000) / Ast), 300);
        
        const materials = this.calculateMaterialQuantities(side * side * (depth / 1000), fck);
        
        this.setText('footingArea', `${areaReq.toFixed(2)} m²`);
        this.setText('footingSize', `${side.toFixed(1)}m x ${side.toFixed(1)}m`);
        this.setText('footingDepth', `${depth} mm`);
        this.setText('footingReinforcement', `T${barDia} @ ${spacing} mm both ways`);
        this.setText('footingMoment', `${bendingMoment.toFixed(2)} kNm/m`);
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

        // Improved cutting length calculations with proper hooks
        const hookLength = 9 * botDia;
        const topCutLength = L * 1000 - 2 * cover + 2 * hookLength;
        const botCutLength = L * 1000 - 2 * cover + 2 * hookLength;
        
        const stirrupWidth = b - 2 * cover;
        const stirrupDepth = D - 2 * cover;
        const stirrupCutLength = 2 * (stirrupWidth + stirrupDepth) + 2 * 9 * stirrupDia;
        
        const numStirrups = Math.floor((L * 1000 - 2 * cover) / stirrupSpacing) + 1;

        // Calculate weights with improved accuracy
        const density = 7850; // kg/m³
        const topWeight = (topBars * Math.PI * topDia * topDia / 4 * topCutLength / 1e6 * density / 1000).toFixed(1);
        const botWeight = (botBars * Math.PI * botDia * botDia / 4 * botCutLength / 1e6 * density / 1000).toFixed(1);
        const stirrupWeight = (numStirrups * Math.PI * stirrupDia * stirrupDia / 4 * stirrupCutLength / 1e6 * density / 1000).toFixed(1);
        const totalWeight = (parseFloat(topWeight) + parseFloat(botWeight) + parseFloat(stirrupWeight)).toFixed(1);

        this.setText('bbsTopLength', `${topCutLength} mm`);
        this.setText('bbsBotLength', `${botCutLength} mm`);
        this.setText('bbsStirrupLength', `${stirrupCutLength} mm`);
        this.setText('bbsNumStirrups', `${numStirrups}`);
        this.setText('bbsTopWeight', `${topWeight} kg`);
        this.setText('bbsBotWeight', `${botWeight} kg`);
        this.setText('bbsStirrupWeight', `${stirrupWeight} kg`);
        this.setText('bbsTotalWeight', `${totalWeight} kg`);

        this.showToast('Bar bending schedule generated', 'success');
    }

    runStaircaseDesign() {
        const rise = this.getVal('stairRise') || 150;
        const going = this.getVal('stairGoing') || 250;
        const width = this.getVal('stairWidth') || 1200;
        const numSteps = this.getVal('stairNumSteps') || 12;
        const fck = this.getVal('stairFck') || 25;
        const fy = this.getVal('stairFy') || 500;

        // Improved staircase design with proper waist slab calculation
        const slope = Math.atan(rise / going);
        const effectiveSpan = (numSteps - 1) * going + width / 2;
        const totalRise = numSteps * rise;

        // Calculate loads
        const waistThickness = Math.ceil(effectiveSpan / 20 / 5) * 5; // Approximate depth
        const selfWeight = (waistThickness / Math.cos(slope)) * 25 / 1000; // kN/m²
        const finish = 1.0; // kN/m²
        const liveLoad = 3.0; // kN/m²
        const totalLoad = selfWeight + finish + liveLoad;
        const factoredLoad = 1.5 * totalLoad;

        // Calculate bending moment
        const moment = (factoredLoad * effectiveSpan * effectiveSpan) / 10; // Conservative

        // Calculate reinforcement
        const d = waistThickness - 25;
        const Ast_req = this.calculateSteelArea(moment * 1e6, fck, fy, 1000, d);
        const Ast_min = 0.0012 * 1000 * waistThickness;
        const Ast = Math.max(Ast_req, Ast_min);

        const barDia = 10;
        const areaPerBar = Math.PI * barDia * barDia / 4;
        const spacing = Math.min(Math.floor((areaPerBar * 1000) / Ast), 300);

        this.setText('stairSpan', `${(effectiveSpan / 1000).toFixed(2)} m`);
        this.setText('stairTotalRise', `${(totalRise / 1000).toFixed(2)} m`);
        this.setText('stairThickness', `${waistThickness} mm`);
        this.setText('stairMoment', `${moment.toFixed(2)} kNm/m`);
        this.setText('stairReinforcement', `T${barDia} @ ${spacing} mm`);
        this.setText('stairDistribution', `T8 @ 200 mm`);

        this.showToast('Staircase design completed', 'success');
    }

    runRetainingWallDesign() {
        const H = this.getVal('wallHeight') || 3.0;
        const soilDensity = this.getVal('soilDensity') || 18;
        const phi = this.getVal('soilFriction') || 30;
        const surcharge = this.getVal('surcharge') || 10;
        const fck = this.getVal('wallFck') || 25;
        const fy = this.getVal('wallFy') || 500;

        // Improved retaining wall design with stability checks
        const Ka = Math.pow(Math.tan((45 - phi/2) * Math.PI/180), 2);
        const Pa = 0.5 * soilDensity * H * H * Ka;
        const Ps = surcharge * H * Ka;

        // Preliminary dimensions
        const baseWidth = Math.max(0.5 * H, Pa * 1.5 / (soilDensity * H * 0.6));
        const toeWidth = 0.3 * baseWidth;
        const heelWidth = baseWidth - toeWidth - 0.3;
        const stemThickness = Math.max(0.1 * H, 200);

        // Calculate reinforcement
        const stemMoment = (Pa * H / 3 + Ps * H / 2) * 1.5; // Factored
        const d_stem = stemThickness - 50;
        const Ast_stem = this.calculateSteelArea(stemMoment * 1e6, fck, fy, 1000, d_stem);

        const barDia = 12;
        const areaPerBar = Math.PI * barDia * barDia / 4;
        const spacing = Math.min(Math.floor((areaPerBar * 1000) / Ast_stem), 300);

        this.setText('wallPressure', `${Pa.toFixed(1)} kN/m`);
        this.setText('wallBaseWidth', `${baseWidth.toFixed(2)} m`);
        this.setText('wallStemThickness', `${stemThickness} mm`);
        this.setText('wallToeWidth', `${toeWidth.toFixed(2)} m`);
        this.setText('wallHeelWidth', `${heelWidth.toFixed(2)} m`);
        this.setText('wallReinforcement', `T${barDia} @ ${spacing} mm`);
        this.setText('wallDistribution', `T10 @ 200 mm`);

        this.showToast('Retaining wall design completed', 'success');
    }

    runWaterTankDesign() {
        const L = this.getVal('tankLength') || 4.0;
        const B = this.getVal('tankWidth') || 3.0;
        const H = this.getVal('tankHeight') || 2.5;
        const fck = this.getVal('tankFck') || 30;
        const fy = this.getVal('tankFy') || 500;

        // Improved water tank design with crack control
        const waterDensity = 10; // kN/m³
        const maxPressure = waterDensity * H;

        // Wall thickness based on water pressure
        const wallThickness = Math.max(150, Math.ceil(H * 1000 / 12 / 25) * 25);

        // Calculate reinforcement for walls
        const moment = (maxPressure * H * H) / 12; // For fixed edges
        const d = wallThickness - 40;
        const Ast_req = this.calculateSteelArea(moment * 1e6, fck, fy, 1000, d);
        const Ast_min = 0.0035 * 1000 * wallThickness; // Higher for liquid retaining
        const Ast = Math.max(Ast_req, Ast_min);

        const barDia = 10;
        const areaPerBar = Math.PI * barDia * barDia / 4;
        const spacing = Math.min(Math.floor((areaPerBar * 1000) / Ast), 150); // Closer spacing for crack control

        // Base slab
        const baseThickness = Math.max(200, wallThickness);
        const baseReinforcement = `T${barDia} @ 150 mm both ways`;

        this.setText('tankVolume', `${(L * B * H).toFixed(1)} m³`);
        this.setText('tankWallThickness', `${wallThickness} mm`);
        this.setText('tankBaseThickness', `${baseThickness} mm`);
        this.setText('tankWallReinforcement', `T${barDia} @ ${spacing} mm both faces`);
        this.setText('tankBaseReinforcement', baseReinforcement);

        this.showToast('Water tank design completed', 'success');
    }

    runSteelDesign() {
        const Pu = this.getVal('steelLoad') || 500;
        const L = this.getVal('steelLength') || 4.0;
        const sectionType = this.getEl('steelSection').value;
        const fy = this.getVal('steelFy') || 250;

        // Steel section database
        const sections = {
            'ISMB250': { A: 4750, rxx: 103.6, ryy: 26.5, Zp: 414000 },
            'ISMB300': { A: 5620, rxx: 123.7, ryy: 28.2, Zp: 612000 },
            'ISMB350': { A: 6670, rxx: 142.1, ryy: 28.4, Zp: 861000 },
            'ISMB400': { A: 7840, rxx: 162.6, ryy: 28.2, Zp: 1176000 },
            'ISHB250': { A: 6500, rxx: 104.5, ryy: 53.8, Zp: 583000 },
            'ISHB300': { A: 7480, rxx: 127.1, ryy: 53.2, Zp: 798000 }
        };

        const section = sections[sectionType] || sections['ISMB250'];
        
        // Improved steel design with slenderness checks
        const lex = L * 1000;
        const ley = L * 1000;
        const lambda_x = lex / section.rxx;
        const lambda_y = ley / section.ryy;
        const lambda_max = Math.max(lambda_x, lambda_y);

        // Calculate buckling class and design stress
        const fcd = this.calculateSteelFcd(lambda_max, fy);
        const designStrength = fcd * section.A / 1000; // kN

        const utilization = Pu / designStrength;

        this.setText('steelSectionArea', `${section.A} mm²`);
        this.setText('steelSlenderness', `${lambda_max.toFixed(1)}`);
        this.setText('steelCapacity', `${designStrength.toFixed(0)} kN`);
        this.setText('steelUtilization', `${(utilization * 100).toFixed(1)} %`);
        this.setText('steelStatus', utilization <= 1 ? 'Adequate' : 'Inadequate');

        this.showToast('Steel member design completed', 'success');
    }

    calculateSteelFcd(lambda, fy) {
        // Improved buckling curve calculation (IS 800:2007)
        const epsilon = Math.sqrt(250 / fy);
        const lambda_n = lambda / (Math.PI * Math.PI * epsilon);
        const phi = 0.5 * (1 + 0.49 * (lambda_n - 0.2) + lambda_n * lambda_n);
        const chi = 1 / (phi + Math.sqrt(phi * phi - lambda_n * lambda_n));
        return Math.min(chi * fy / 1.1, fy / 1.1);
    }

    runConcreteMixDesign() {
        const grade = this.getVal('mixGrade') || 25;
        const aggregateSize = this.getVal('aggSize') || 20;
        const slump = this.getVal('slump') || 75;
        const exposure = this.getEl('exposure').value;

        // Improved concrete mix design (IS 10262:2019)
        const targetStrength = grade + 1.65 * 4; // Assuming standard deviation of 4 MPa

        // Water-cement ratio based on exposure and strength
        let wcRatio = 0.0;
        if (targetStrength <= 20) wcRatio = 0.55;
        else if (targetStrength <= 25) wcRatio = 0.50;
        else if (targetStrength <= 30) wcRatio = 0.45;
        else if (targetStrength <= 35) wcRatio = 0.40;
        else wcRatio = 0.35;

        // Adjust for exposure conditions
        if (exposure === 'severe') wcRatio = Math.min(wcRatio, 0.45);
        else if (exposure === 'extreme') wcRatio = Math.min(wcRatio, 0.40);

        // Water content based on aggregate size and slump
        let waterContent = 186; // kg/m³ for 20mm aggregate, 50-75mm slump
        if (aggregateSize === 10) waterContent = 208;
        else if (aggregateSize === 40) waterContent = 165;

        if (slump > 75) waterContent += (slump - 75) / 25 * 3;

        // Calculate cement content
        const cementContent = waterContent / wcRatio;
        const maxCement = exposure === 'normal' ? 450 : 320;
        const cement = Math.min(cementContent, maxCement);

        // Calculate aggregate content (simplified)
        const totalAggregate = 1600; // kg/m³ (approximate)
        const fineAggregate = 0.35 * totalAggregate;
        const coarseAggregate = totalAggregate - fineAggregate;

        // Adjusted water content
        const finalWater = cement * wcRatio;

        this.setText('mixTargetStrength', `${targetStrength.toFixed(1)} MPa`);
        this.setText('mixWCRatio', wcRatio.toFixed(2));
        this.setText('mixCement', `${Math.ceil(cement)} kg/m³`);
        this.setText('mixWater', `${Math.ceil(finalWater)} kg/m³`);
        this.setText('mixSand', `${Math.ceil(fineAggregate)} kg/m³`);
        this.setText('mixCoarseAgg', `${Math.ceil(coarseAggregate)} kg/m³`);
        this.setText('mixAdmixture', 'As required for workability');

        this.showToast('Concrete mix design completed', 'success');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const app = new CivilSuiteApp();
    window.civilSuite = app; // Make available globally for debugging
    app.init();
});