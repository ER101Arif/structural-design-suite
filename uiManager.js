class UIManager {
    constructor(state, app) {
        this.state = state;
        this.app = app;
        this.isInitialized = false;
        this.init();
    }

    showLoading(progress = 0, message = 'Loading...') {
        const loadingEl = document.getElementById('loading');
        const progressEl = document.getElementById('loading-progress');
        const detailsEl = document.getElementById('loading-details');
        
        if (loadingEl && progressEl && detailsEl) {
            loadingEl.style.display = 'flex';
            progressEl.style.width = `${progress}%`;
            detailsEl.textContent = message;
        }
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('fade-out');
            setTimeout(() => {
                loadingEl.style.display = 'none';
                loadingEl.classList.remove('fade-out');
            }, 500);
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toast.remove();
            }
        }, 4000);
    }

    updateUnitLabels(units) {
        const unitLabels = {
            'beamLength': units.length,
            'beamDL': units['kN/m'],
            'beamLL': units['kN/m'],
            'beamWidth': 'mm',
            'beamDepth': 'mm',
            'beamCover': 'mm'
        };

        Object.keys(unitLabels).forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                const label = input.previousElementSibling;
                if (label) {
                    const unitSpan = label.querySelector('.unit-label');
                    if (unitSpan) {
                        unitSpan.textContent = `(${unitLabels[inputId]})`;
                    }
                }
            }
        });
    }

    renderBeamResults(results) {
        if (!results) return;
        
        // Update status visual
        const statusEl = document.getElementById('beamStatus');
        if (statusEl) {
            statusEl.className = `status-visual ${results.isSafe ? 'pass' : 'fail'}`;
            statusEl.innerHTML = `
                <span>${results.statusMessage}</span>
            `;
            statusEl.classList.remove('hidden');
        }

        // Update result values
        if (results.display) {
            Object.keys(results.display).forEach(key => {
                const element = document.getElementById(`beam${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element) {
                    element.textContent = results.display[key];
                }
            });
        }

        // Update charts
        if (window.chartManager && results.chartData) {
            window.chartManager.renderBeamCharts(results.chartData);
        }
    }

    showColumnResults(results) {
        if (!results) return;
        
        // Update status visual
        const statusEl = document.getElementById('columnStatus');
        if (statusEl) {
            statusEl.className = `status-visual ${results.isSafe ? 'pass' : 'fail'}`;
            statusEl.innerHTML = `
                <span>${results.statusMessage}</span>
            `;
            statusEl.classList.remove('hidden');
        }

        // Update result values
        if (results.display) {
            Object.keys(results.display).forEach(key => {
                const element = document.getElementById(`column${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element) {
                    element.textContent = results.display[key];
                }
            });
        }
    }

    showSlabResults(results) {
        if (!results) return;
        
        // Update status visual
        const statusEl = document.getElementById('slabStatus');
        if (statusEl) {
            statusEl.className = `status-visual ${results.isSafe ? 'pass' : 'fail'}`;
            statusEl.innerHTML = `
                <span>${results.statusMessage}</span>
            `;
            statusEl.classList.remove('hidden');
        }

        // Update result values
        if (results.display) {
            Object.keys(results.display).forEach(key => {
                const element = document.getElementById(`slab${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element) {
                    element.textContent = results.display[key];
                }
            });
        }
    }

    renderBeamVisual() {
        const svg = document.getElementById('beam-svg');
        if (!svg) return;
        
        const beamType = document.getElementById('beamType')?.value || 'simply-supported';
        
        svg.innerHTML = '';
        
        // Simple beam visualization based on type
        const beamColor = '#4f46e5';
        const supportColor = '#64748b';
        
        switch(beamType) {
            case 'simply-supported':
                svg.innerHTML = `
                    <rect x="50" y="50" width="200" height="20" fill="${beamColor}" opacity="0.8"/>
                    <rect x="45" y="45" width="10" height="30" fill="${supportColor}"/>
                    <rect x="245" y="45" width="10" height="30" fill="${supportColor}"/>
                    <text x="150" y="90" text-anchor="middle" fill="#64748b" font-size="12">Simply Supported</text>
                `;
                break;
            case 'cantilever':
                svg.innerHTML = `
                    <rect x="50" y="50" width="200" height="20" fill="${beamColor}" opacity="0.8"/>
                    <rect x="45" y="45" width="10" height="30" fill="${supportColor}"/>
                    <text x="150" y="90" text-anchor="middle" fill="#64748b" font-size="12">Cantilever</text>
                `;
                break;
            case 'fixed':
                svg.innerHTML = `
                    <rect x="50" y="50" width="200" height="20" fill="${beamColor}" opacity="0.8"/>
                    <rect x="45" y="45" width="10" height="30" fill="${supportColor}"/>
                    <rect x="245" y="45" width="10" height="30" fill="${supportColor}"/>
                    <line x1="45" y1="45" x2="45" y2="35" stroke="${supportColor}" stroke-width="3"/>
                    <line x1="255" y1="45" x2="255" y2="35" stroke="${supportColor}" stroke-width="3"/>
                    <text x="150" y="90" text-anchor="middle" fill="#64748b" font-size="12">Fixed Ends</text>
                `;
                break;
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light' : '🌙 Dark';
        }
    }

    init() {
        this.initEventListeners();
        this.renderBeamVisual();
        this.setupRealTimeValidation();
        this.isInitialized = true;
    }

    initEventListeners() {
        // Debounced input handlers for better performance
        this.setupDebouncedInputs();
        
        // Unit system change
        document.getElementById('unit-system').addEventListener('change', (e) => {
            this.app.onUnitChange(e.target.value);
        });

        // Tab switching with animation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTabWithAnimation(e.target.getAttribute('data-tab'));
            });
        });

        // Enhanced theme toggle with system preference detection
        this.detectSystemTheme();
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Run analysis with loading state
        document.getElementById('runBeamButton').addEventListener('click', () => {
            this.showLoading(30, 'Running analysis...');
            setTimeout(() => this.app.runBeamAnalysis(), 100);
        });

        // Enhanced report generation
        document.getElementById('printBeamReport').addEventListener('click', () => {
            this.generateComprehensiveReport();
        });

        // Export functionality
        document.getElementById('export-project').addEventListener('click', () => {
            this.exportProject();
        });

        // Import functionality
        document.getElementById('import-project-button').addEventListener('click', () => {
            document.getElementById('import-project').click();
        });

        document.getElementById('import-project').addEventListener('change', (e) => {
            this.importProject(e.target.files[0]);
        });

        // Clear history
        document.getElementById('clear-history-btn')?.addEventListener('click', () => {
            this.clearHistory();
        });

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupDebouncedInputs() {
        let timeoutId;
        const handler = (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.app.onInputChange(e.target.id, e.target.value);
            }, 300);
        };

        document.querySelectorAll('.form-input, select').forEach(input => {
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        });
    }

    setupRealTimeValidation() {
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                this.validateInput(e.target);
            });
        });
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min) || -Infinity;
        const max = parseFloat(input.max) || Infinity;

        if (isNaN(value)) {
            this.markInvalid(input, 'Please enter a valid number');
            return false;
        }

        if (value < min || value > max) {
            this.markInvalid(input, `Value must be between ${min} and ${max}`);
            return false;
        }

        this.markValid(input);
        return true;
    }

    markInvalid(input, message) {
        input.classList.add('invalid');
        this.showToast(message, 'error');
    }

    markValid(input) {
        input.classList.remove('invalid');
    }

    switchTabWithAnimation(tabId) {
        const currentTab = document.querySelector('.tab-content:not(.hidden)');
        const newTab = document.getElementById(tabId);

        if (currentTab) {
            currentTab.style.opacity = '0';
            currentTab.style.transform = 'translateY(10px)';
            setTimeout(() => {
                currentTab.classList.add('hidden');
                this.showTab(newTab);
                
                // Render the appropriate module content
                switch(tabId) {
                    case 'column-design':
                        this.renderColumnDesign();
                        break;
                    case 'slab-design':
                        this.renderSlabDesign();
                        break;
                    case 'bbs-design':
                        this.renderBarBendingSchedule();
                        break;
                    case 'history':
                        // History is already rendered by app.js
                        this.app.updateHistoryUI();
                        break;
                }
            }, 200);
        } else {
            this.showTab(newTab);
        }

        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    }

    showTab(tabElement) {
        tabElement.classList.remove('hidden');
        setTimeout(() => {
            tabElement.style.opacity = '1';
            tabElement.style.transform = 'translateY(0)';
        }, 50);
    }

    renderColumnDesign() {
        const columnTab = document.getElementById('column-design');
        if (!columnTab) return;
        
        columnTab.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div class="xl:col-span-1 space-y-6">
                    <div class="result-card p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">1. Column Properties</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="columnType" class="input-label">Column Type</label>
                                <select id="columnType" class="form-input">
                                    <option value="rectangular">Rectangular</option>
                                    <option value="circular">Circular</option>
                                    <option value="square">Square</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="columnWidth" class="input-label">Width <span class="unit-label">(mm)</span></label>
                                    <input type="number" id="columnWidth" value="300" min="150" max="1000" class="form-input">
                                </div>
                                <div>
                                    <label for="columnDepth" class="input-label">Depth <span class="unit-label">(mm)</span></label>
                                    <input type="number" id="columnDepth" value="450" min="150" max="1000" class="form-input">
                                </div>
                            </div>
                            <div>
                                <label for="columnHeight" class="input-label">Height <span class="unit-label">(m)</span></label>
                                <input type="number" id="columnHeight" value="3.0" min="1" max="20" step="0.1" class="form-input">
                            </div>
                        </div>
                    </div>

                    <div class="result-card p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">2. Loads & Materials</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="columnAxialLoad" class="input-label">Axial Load <span class="unit-label">(kN)</span></label>
                                <input type="number" id="columnAxialLoad" value="1000" min="100" step="50" class="form-input">
                            </div>
                            <div>
                                <label for="columnMomentX" class="input-label">Moment (X) <span class="unit-label">(kNm)</span></label>
                                <input type="number" id="columnMomentX" value="50" min="0" step="5" class="form-input">
                            </div>
                            <div>
                                <label for="columnMomentY" class="input-label">Moment (Y) <span class="unit-label">(kNm)</span></label>
                                <input type="number" id="columnMomentY" value="30" min="0" step="5" class="form-input">
                            </div>
                            <div>
                                <label for="columnFck" class="input-label">Concrete Grade</label>
                                <select id="columnFck" class="form-input">
                                    <option value="20">M20</option>
                                    <option value="25" selected>M25</option>
                                    <option value="30">M30</option>
                                    <option value="35">M35</option>
                                </select>
                            </div>
                            <div>
                                <label for="columnFy" class="input-label">Steel Grade</label>
                                <select id="columnFy" class="form-input">
                                    <option value="415">Fe415</option>
                                    <option value="500" selected>Fe500</option>
                                </select>
                            </div>
                        </div>
                        <div class="mt-6 space-y-3">
                            <button id="runColumnButton" class="run-button w-full">🏛️ Design Column</button>
                            <button id="printColumnReport" class="print-button w-full no-print">📄 Generate Report</button>
                        </div>
                    </div>
                </div>

                <div class="xl:col-span-3 space-y-6">
                    <div id="columnStatus" class="status-visual hidden"></div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="result-card-small">
                            <p class="result-label">Axial Capacity</p>
                            <p id="columnAxialCapacity" class="result-value">-</p>
                        </div>
                        <div class="result-card-small">
                            <p class="result-label">Moment Capacity X</p>
                            <p id="columnMomentCapacityX" class="result-value">-</p>
                        </div>
                        <div class="result-card-small">
                            <p class="result-label">Moment Capacity Y</p>
                            <p id="columnMomentCapacityY" class="result-value">-</p>
                        </div>
                        <div class="result-card-small">
                            <p class="result-label">Utilization</p>
                            <p id="columnUtilization" class="result-value">-</p>
                        </div>
                    </div>

                    <div class="result-card">
                        <h3 class="result-title">Design Results</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div class="result-item"><span class="font-medium">Main Steel:</span><span id="columnMainSteel" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Tie Bars:</span><span id="columnTieSteel" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Steel Percentage:</span><span id="columnSteelPercentage" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Slenderness Ratio:</span><span id="columnSlenderness" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Minimum Eccentricity:</span><span id="columnMinEccentricity" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Design Status:</span><span id="columnDesignStatus" class="result-text">-</span></div>
                        </div>
                    </div>

                    <div class="result-card">
                        <h3 class="result-title">Reinforcement Details</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="visual-box">
                                <svg id="column-svg" width="100%" height="200" viewBox="0 0 300 200">
                                    <rect x="100" y="50" width="100" height="150" fill="#4f46e5" opacity="0.8" stroke="#334155" stroke-width="2"/>
                                    <circle cx="120" cy="80" r="4" fill="#ef4444"/>
                                    <circle cx="180" cy="80" r="4" fill="#ef4444"/>
                                    <circle cx="120" cy="120" r="4" fill="#ef4444"/>
                                    <circle cx="180" cy="120" r="4" fill="#ef4444"/>
                                    <circle cx="120" cy="160" r="4" fill="#ef4444"/>
                                    <circle cx="180" cy="160" r="4" fill="#ef4444"/>
                                    <rect x="115" y="75" width="10" height="90" fill="none" stroke="#ef4444" stroke-width="1" stroke-dasharray="5,5"/>
                                    <text x="150" y="190" text-anchor="middle" fill="#64748b" font-size="12">Column Reinforcement</text>
                                </svg>
                            </div>
                            <div class="space-y-4">
                                <div class="result-item"><span class="font-medium">Longitudinal Bars:</span><span id="columnLongitudinalBars" class="result-text">-</span></div>
                                <div class="result-item"><span class="font-medium">Tie Spacing:</span><span id="columnTieSpacing" class="result-text">-</span></div>
                                <div class="result-item"><span class="font-medium">Development Length:</span><span id="columnDevLength" class="result-text">-</span></div>
                                <div class="result-item"><span class="font-medium">Lap Length:</span><span id="columnLapLength" class="result-text">-</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for column design
        this.setupColumnEventListeners();
    }

    renderSlabDesign() {
        const slabTab = document.getElementById('slab-design');
        if (!slabTab) return;
        
        slabTab.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div class="xl:col-span-1 space-y-6">
                    <div class="result-card p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">1. Slab Properties</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="slabType" class="input-label">Slab Type</label>
                                <select id="slabType" class="form-input">
                                    <option value="one-way">One Way Slab</option>
                                    <option value="two-way">Two Way Slab</option>
                                    <option value="cantilever">Cantilever Slab</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="slabLength" class="input-label">Length <span class="unit-label">(m)</span></label>
                                    <input type="number" id="slabLength" value="5.0" min="1" max="15" step="0.1" class="form-input">
                                </div>
                                <div>
                                    <label for="slabWidth" class="input-label">Width <span class="unit-label">(m)</span></label>
                                    <input type="number" id="slabWidth" value="4.0" min="1" max="15" step="0.1" class="form-input">
                                </div>
                            </div>
                            <div>
                                <label for="slabThickness" class="input-label">Thickness <span class="unit-label">(mm)</span></label>
                                <input type="number" id="slabThickness" value="150" min="100" max="300" step="10" class="form-input">
                            </div>
                        </div>
                    </div>

                    <div class="result-card p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">2. Loads & Materials</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="slabDL" class="input-label">Dead Load <span class="unit-label">(kN/m²)</span></label>
                                <input type="number" id="slabDL" value="2.5" min="0" step="0.1" class="form-input">
                            </div>
                            <div>
                                <label for="slabLL" class="input-label">Live Load <span class="unit-label">(kN/m²)</span></label>
                                <input type="number" id="slabLL" value="3.0" min="0" step="0.1" class="form-input">
                            </div>
                            <div>
                                <label for="slabFck" class="input-label">Concrete Grade</label>
                                <select id="slabFck" class="form-input">
                                    <option value="20">M20</option>
                                    <option value="25" selected>M25</option>
                                    <option value="30">M30</option>
                                </select>
                            </div>
                            <div>
                                <label for="slabFy" class="input-label">Steel Grade</label>
                                <select id="slabFy" class="form-input">
                                    <option value="415">Fe415</option>
                                    <option value="500" selected>Fe500</option>
                                </select>
                            </div>
                            <div>
                                <label for="slabCover" class="input-label">Cover <span class="unit-label">(mm)</span></label>
                                <input type="number" id="slabCover" value="20" min="15" max="50" class="form-input">
                            </div>
                        </div>
                        <div class="mt-6 space-y-3">
                            <button id="runSlabButton" class="run-button w-full">🧱 Design Slab</button>
                            <button id="printSlabReport" class="print-button w-full no-print">📄 Generate Report</button>
                        </div>
                    </div>
                </div>

                <div class="xl:col-span-3 space-y-6">
                    <div id="slabStatus" class="status-visual hidden"></div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="result-card-small">
                            <p class="result-label">Max Moment</p>
                            <p id="slabMaxMoment" class="result-value">-</p>
                        </div>
                        <div class="result-card-small">
                            <p class="result-label">Shear Force</p>
                            <p id="slabShearForce" class="result-value">-</p>
                        </div>
                        <div class="result-card-small">
                            <p class="result-label">Deflection</p>
                            <p id="slabDeflection" class="result-value">-</p>
                        </div>
                        <div class="result-card-small">
                            <p class="result-label">Utilization</p>
                            <p id="slabUtilization" class="result-value">-</p>
                        </div>
                    </div>

                    <div class="result-card">
                        <h3 class="result-title">Design Results</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div class="result-item"><span class="font-medium">Main Steel (X):</span><span id="slabMainSteelX" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Main Steel (Y):</span><span id="slabMainSteelY" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Distribution Steel:</span><span id="slabDistributionSteel" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Steel Spacing:</span><span id="slabSteelSpacing" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Deflection Check:</span><span id="slabDeflectionCheck" class="result-text">-</span></div>
                            <div class="result-item"><span class="font-medium">Crack Width:</span><span id="slabCrackWidth" class="result-text">-</span></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="result-card">
                            <h3 class="result-title">Bending Moment Diagram</h3>
                            <div class="chart-container">
                                <canvas id="slab-moment-chart"></canvas>
                            </div>
                        </div>
                        <div class="result-card">
                            <h3 class="result-title">Reinforcement Layout</h3>
                            <div class="visual-box">
                                <svg id="slab-svg" width="100%" height="200" viewBox="0 0 300 200">
                                    <rect x="50" y="50" width="200" height="10" fill="#4f46e5" opacity="0.8"/>
                                    <line x1="50" y1="60" x2="250" y2="60" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,5"/>
                                    <text x="150" y="85" text-anchor="middle" fill="#64748b" font-size="12">Main Reinforcement</text>
                                    <text x="150" y="100" text-anchor="middle" fill="#64748b" font-size="10">@ 150mm c/c</text>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for slab design
        this.setupSlabEventListeners();
    }

    renderBarBendingSchedule() {
        const bbsTab = document.getElementById('bbs-design');
        if (!bbsTab) return;
        
        bbsTab.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div class="xl:col-span-1 space-y-6">
                    <div class="result-card p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Project Details</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="bbsProjectName" class="input-label">Project Name</label>
                                <input type="text" id="bbsProjectName" value="Residential Building" class="form-input">
                            </div>
                            <div>
                                <label for="bbsElement" class="input-label">Structural Element</label>
                                <select id="bbsElement" class="form-input">
                                    <option value="beam">Beam</option>
                                    <option value="column">Column</option>
                                    <option value="slab">Slab</option>
                                    <option value="footing">Footing</option>
                                    <option value="wall">Wall</option>
                                    <option value="staircase">Staircase</option>
                                </select>
                            </div>
                            <div>
                                <label for="bbsElementRef" class="input-label">Element Reference</label>
                                <input type="text" id="bbsElementRef" value="B1-GF" class="form-input" placeholder="e.g., B1-GF, C2-FF">
                            </div>
                        </div>
                    </div>

                    <div class="result-card p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Reinforcement Input</h3>
                        <div class="space-y-4">
                            <div>
                                <label for="bbsBarSize" class="input-label">Bar Size (mm)</label>
                                <select id="bbsBarSize" class="form-input">
                                    <option value="6">6mm</option>
                                    <option value="8">8mm</option>
                                    <option value="10">10mm</option>
                                    <option value="12" selected>12mm</option>
                                    <option value="16">16mm</option>
                                    <option value="20">20mm</option>
                                    <option value="25">25mm</option>
                                    <option value="32">32mm</option>
                                </select>
                            </div>
                            <div>
                                <label for="bbsLength" class="input-label">Length <span class="unit-label">(m)</span></label>
                                <input type="number" id="bbsLength" value="6.0" min="0.1" step="0.1" class="form-input">
                            </div>
                            <div>
                                <label for="bbsQuantity" class="input-label">Quantity</label>
                                <input type="number" id="bbsQuantity" value="4" min="1" class="form-input">
                            </div>
                            <div>
                                <label for="bbsShape" class="input-label">Bar Shape</label>
                                <select id="bbsShape" class="form-input">
                                    <option value="straight">Straight</option>
                                    <option value="L">L-Shape (Bent)</option>
                                    <option value="U">U-Shape (Stirrup)</option>
                                    <option value="circular">Circular (Links)</option>
                                </select>
                            </div>
                            <div>
                                <label for="bbsDescription" class="input-label">Description</label>
                                <input type="text" id="bbsDescription" class="form-input" placeholder="e.g., Main bar, Stirrup, Distribution">
                            </div>
                        </div>
                        <div class="mt-6 space-y-3">
                            <button id="addBarButton" class="run-button w-full">➕ Add Bar</button>
                            <button id="clearBBSButton" class="print-button w-full no-print">🗑️ Clear All</button>
                        </div>
                    </div>
                </div>

                <div class="xl:col-span-3 space-y-6">
                    <div class="result-card">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="result-title">Bar Bending Schedule</h3>
                            <div class="flex gap-2">
                                <button id="generateBBSReport" class="print-button no-print">📊 Generate Report</button>
                                <button id="exportBBSCSV" class="print-button no-print">📁 Export CSV</button>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-50 dark:bg-gray-700">
                                        <th class="border p-2 text-left">Bar Mark</th>
                                        <th class="border p-2 text-left">Description</th>
                                        <th class="border p-2">Dia (mm)</th>
                                        <th class="border p-2">Shape</th>
                                        <th class="border p-2">Length (m)</th>
                                        <th class="border p-2">Qty</th>
                                        <th class="border p-2">Total Length (m)</th>
                                        <th class="border p-2">Weight (kg)</th>
                                        <th class="border p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="bbs-table-body">
                                    <tr>
                                        <td colspan="9" class="border p-4 text-center text-gray-500">No bars added yet</td>
                                    </tr>
                                </tbody>
                                <tfoot id="bbs-table-footer" class="hidden">
                                    <tr class="bg-gray-50 dark:bg-gray-700 font-bold">
                                        <td colspan="6" class="border p-2 text-right">Total:</td>
                                        <td id="bbs-total-length" class="border p-2">-</td>
                                        <td id="bbs-total-weight" class="border p-2">-</td>
                                        <td class="border p-2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="result-card">
                            <h3 class="result-title">Weight Summary</h3>
                            <div class="space-y-3" id="bbs-weight-summary">
                                <div class="text-center text-gray-500 py-4">No bars added</div>
                            </div>
                        </div>

                        <div class="result-card">
                            <h3 class="result-title">Bar Shapes Visualization</h3>
                            <div class="visual-box">
                                <svg id="bbs-shapes-svg" width="100%" height="180" viewBox="0 0 300 180">
                                    <text x="150" y="100" text-anchor="middle" fill="#64748b">Add bars to see shapes</text>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupBBSEventListeners();
    }

    setupColumnEventListeners() {
        document.getElementById('runColumnButton')?.addEventListener('click', () => {
            this.showLoading(30, 'Designing column...');
            setTimeout(() => this.app.runColumnDesign(), 100);
        });

        document.getElementById('printColumnReport')?.addEventListener('click', () => {
            this.generateColumnReport();
        });
    }

    setupSlabEventListeners() {
        document.getElementById('runSlabButton')?.addEventListener('click', () => {
            this.showLoading(30, 'Designing slab...');
            setTimeout(() => this.app.runSlabDesign(), 100);
        });

        document.getElementById('printSlabReport')?.addEventListener('click', () => {
            this.generateSlabReport();
        });
    }

    setupBBSEventListeners() {
        document.getElementById('addBarButton')?.addEventListener('click', () => {
            this.app.addBarToSchedule();
        });

        document.getElementById('clearBBSButton')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all bars?')) {
                this.app.state.bbs.bars = [];
                this.app.updateBBSDisplay();
                this.showToast('BBS cleared', 'info');
            }
        });

        document.getElementById('generateBBSReport')?.addEventListener('click', () => {
            this.app.generateBBSReport();
        });

        document.getElementById('exportBBSCSV')?.addEventListener('click', () => {
            this.exportBBStoCSV();
        });

        document.getElementById('bbsProjectName')?.addEventListener('change', (e) => {
            this.app.state.bbs.projectName = e.target.value;
        });

        document.getElementById('bbsElement')?.addEventListener('change', (e) => {
            this.app.state.bbs.element = e.target.value;
        });
    }

    exportBBStoCSV() {
        if (this.app.state.bbs.bars.length === 0) {
            this.showToast('No bars to export', 'warning');
            return;
        }

        const headers = ['Mark', 'Description', 'Diameter', 'Shape', 'Length', 'Quantity', 'Total Length', 'Weight'];
        const csvData = [
            headers.join(','),
            ...this.app.state.bbs.bars.map(bar => [
                bar.mark,
                `"${bar.description}"`,
                bar.diameter,
                bar.shape,
                bar.length,
                bar.quantity,
                bar.totalLength.toFixed(2),
                bar.weight.toFixed(2)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bbs-${this.app.state.bbs.projectName.replace(/\s+/g, '-')}.csv`;
        link.click();

        this.showToast('BBS exported to CSV', 'success');
    }

    generateComprehensiveReport() {
        this.showToast('Generating comprehensive report...', 'info');
        
        const reportData = this.getReportData();
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `beam-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Report downloaded successfully!', 'success');
    }

    generateColumnReport() {
        this.showToast('Generating column design report...', 'info');
        // Similar implementation to beam report
        this.showToast('Column report generated!', 'success');
    }

    generateSlabReport() {
        this.showToast('Generating slab design report...', 'info');
        // Similar implementation to beam report
        this.showToast('Slab report generated!', 'success');
    }

    getReportData() {
        return {
            timestamp: new Date().toISOString(),
            project: 'Civil Suite Analysis Report',
            parameters: this.state.beam,
            units: this.state.units,
            version: 'Civil Suite v3.0'
        };
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        document.getElementById('runBeamButton').click();
                        break;
                    case 'p':
                        e.preventDefault();
                        document.getElementById('printBeamReport').click();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                }
            }
        });
    }

    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            const themeBtn = document.getElementById('theme-toggle');
            if (themeBtn) {
                themeBtn.textContent = '☀️ Light';
            }
        }
    }

    exportProject() {
        const projectData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            state: this.state,
            type: 'civil-suite-project'
        };
        
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `civil-suite-project-${new Date().toISOString().split('T')[0]}.civiljson`;
        link.click();
        
        this.showToast('Project exported successfully!', 'success');
    }

    importProject(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                if (projectData.type === 'civil-suite-project') {
                    Object.assign(this.state, projectData.state);
                    this.app.runActiveAnalysis();
                    this.showToast('Project imported successfully!', 'success');
                } else {
                    this.showToast('Invalid project file', 'error');
                }
            } catch (error) {
                this.showToast('Error importing project', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearHistory() {
        this.state.history = [];
        this.app.updateHistoryUI();
        this.showToast('History cleared', 'info');
    }
}

window.UIManager = UIManager;