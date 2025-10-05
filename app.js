// Civil Suite App - Main Application Class
class CivilSuiteApp {
    constructor() {
        // Add dependency checks here instead of at the top
        if (typeof UIManager === 'undefined') {
            console.error('UIManager not loaded! Check script order.');
            this.showError('UIManager not loaded! Check script order.');
            return;
        }
        if (typeof window.calculationEngine === 'undefined') {
            console.error('calculationEngine not loaded! Check script order.');
            this.showError('calculationEngine not loaded! Check script order.');
            return;
        }

        this.state = {
            units: this.getUnitConfig('metric'),
            beam: {
                type: 'simply-supported',
                L: 6.0, b: 230, D: 450,
                DL: 10.0, LL: 15.0,
                fck: 25, fy: 500, cover: 25,
            },
            column: {
                type: 'rectangular',
                width: 300, depth: 450, height: 3.0,
                axialLoad: 1000, momentX: 50, momentY: 30,
                fck: 25, fy: 500
            },
            slab: {
                type: 'one-way',
                length: 5.0, width: 4.0, thickness: 150,
                DL: 2.5, LL: 3.0,
                fck: 25, fy: 500, cover: 20
            },
            bbs: {
                bars: [],
                projectName: 'Residential Building',
                element: 'beam'
            },
            history: []
        };
        
        console.log('CivilSuiteApp initializing...');
        
        try {
            // Initialize UI Manager
            this.ui = new UIManager(this.state, this);
            this.init();
        } catch (error) {
            console.error('Error initializing CivilSuiteApp:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async init() {
        try {
            this.ui.showLoading(50, 'Initializing analysis engine...');
            await new Promise(res => setTimeout(res, 800));
            
            // Initialize charts
            if (window.chartManager) {
                // Render initial empty charts
                const emptyData = {
                    labels: ['0', '6'],
                    sfd: [0, 0],
                    bmd: [0, 0]
                };
                window.chartManager.renderBeamCharts(emptyData);
            }
            
            this.runActiveAnalysis();
            this.ui.hideLoading();
            this.ui.showToast('Civil Suite v3.0 Ready!', 'success');
        } catch (error) {
            console.error('Error in init:', error);
            this.ui.hideLoading();
            this.ui.showToast('Error initializing application', 'error');
        }
    }

    onInputChange(id, value) {
        console.log('Input changed:', id, value);
        
        // Handle beam inputs
        if (id.startsWith('beam')) {
            const key = this.getBeamPropertyKey(id);
            if (key && this.state.beam[key] !== undefined) {
                this.state.beam[key] = isNaN(parseFloat(value)) ? value : parseFloat(value);
                
                // Update beam visual if beam type changes
                if (id === 'beamType') {
                    this.ui.renderBeamVisual();
                }
                
                this.runActiveAnalysis();
            }
        }
    }

    getBeamPropertyKey(id) {
        const keyMap = {
            'beamType': 'type',
            'beamLength': 'L',
            'beamWidth': 'b',
            'beamDepth': 'D',
            'beamDL': 'DL',
            'beamLL': 'LL',
            'beamFck': 'fck',
            'beamFy': 'fy',
            'beamCover': 'cover'
        };
        return keyMap[id];
    }

    onUnitChange(newUnitSystem) {
        this.state.units = this.getUnitConfig(newUnitSystem);
        this.ui.updateUnitLabels(this.state.units);
        this.runActiveAnalysis();
    }

    getActiveTabId() {
        const activeTab = document.querySelector('.tab-button.active');
        return activeTab ? activeTab.getAttribute('data-tab') : 'beam-analysis';
    }

    runActiveAnalysis() {
        const activeTab = this.getActiveTabId();
        console.log('Running analysis for tab:', activeTab);
        
        if (activeTab === 'beam-analysis') {
            this.runBeamAnalysis();
        }
    }

    runBeamAnalysis() {
        try {
            const params = this.state.beam;
            const metric = this.convertBeamStateToMetric(params);
            metric.factoredUDL = 1.5 * (metric.DL + metric.LL);

            console.log('Beam parameters:', metric);

            const forces = window.calculationEngine.calculateBeamForces(metric);
            console.log('Calculated forces:', forces);
            
            const d = metric.D - metric.cover - 10; // effective depth (assuming 10mm bar)
            const Ast_req = window.calculationEngine.calculateSteelArea(
                forces.maxMoment * 1e6, // Convert kNm to Nmm
                metric.fck, 
                metric.fy, 
                metric.b, 
                d
            );
            
            const Ast_min = 0.0012 * metric.b * d; // Minimum steel as per IS 456
            const Ast_prov = Math.max(Ast_req, Ast_min);
            
            const momentCapacity = window.calculationEngine.calculateMomentCapacity(
                Ast_prov, metric.fy, metric.fck, metric.b, d
            );
            
            const shearCapacity = window.calculationEngine.calculateShearCapacity(
                metric.fck, metric.b, d, Ast_prov
            );
            
            const utilization = momentCapacity > 0 ? (forces.maxMoment * 1e6) / momentCapacity : 1;
            const deflectionLimit = (metric.L * 1000) / 250; // L/250 as per IS 456
            const isSafe = utilization <= 1.0 && forces.maxDeflection <= deflectionLimit;
            
            const results = {
                isSafe,
                statusMessage: isSafe ? 'PASS - Design is adequate.' : 'FAIL - Section is inadequate.',
                display: this.formatBeamResultsForDisplay({ 
                    ...forces, 
                    Ast_prov, 
                    Ast_min, 
                    momentCapacity, 
                    shearCapacity, 
                    utilization, 
                    deflectionLimit 
                }),
                chartData: this.generateBeamChartData(metric, forces)
            };
            
            this.ui.renderBeamResults(results);
            
            // Add to history
            this.addToHistory(results);
            
        } catch (error) {
            console.error('Error in beam analysis:', error);
            this.ui.showToast('Error in beam analysis calculation', 'error');
        }
    }

    runColumnDesign() {
        try {
            const params = this.state.column;
            
            // Simple column design calculations
            const area = params.width * params.depth;
            const astMin = 0.008 * area; // 0.8% minimum steel
            const astMax = 0.04 * area;  // 4% maximum steel
            
            // Calculate required steel area (simplified)
            const pu = params.axialLoad * 1000; // kN to N
            const factoredLoad = 1.5 * pu;
            const concreteCapacity = 0.4 * params.fck * area;
            const steelAreaRequired = Math.max((factoredLoad - concreteCapacity) / (0.67 * params.fy), astMin);
            const astProvided = Math.min(steelAreaRequired, astMax);
            
            // Calculate capacities
            const axialCapacity = (0.4 * params.fck * area + 0.67 * params.fy * astProvided) / 1000; // kN
            const momentCapacityX = 0.138 * params.fck * params.width * params.depth * params.depth / 1e6; // kNm
            const momentCapacityY = 0.138 * params.fck * params.depth * params.width * params.width / 1e6; // kNm
            
            const utilization = Math.max(
                params.axialLoad / axialCapacity,
                params.momentX / momentCapacityX,
                params.momentY / momentCapacityY
            );
            
            const isSafe = utilization <= 1.0;
            
            const results = {
                isSafe,
                statusMessage: isSafe ? 'PASS - Column design is adequate.' : 'FAIL - Column section is inadequate.',
                display: this.formatColumnResultsForDisplay({
                    axialCapacity,
                    momentCapacityX,
                    momentCapacityY,
                    utilization,
                    astProvided,
                    steelPercentage: (astProvided / area) * 100
                })
            };
            
            this.ui.showColumnResults(results);
            this.addToHistory(results);
            
        } catch (error) {
            console.error('Error in column design:', error);
            this.ui.showToast('Error in column design calculation', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    runSlabDesign() {
        try {
            this.ui.showLoading(30, 'Designing slab...');
            const params = this.state.slab;
            
            // Enhanced calculations
            const effectiveDepth = params.thickness - params.cover - 8;
            const factoredLoad = 1.5 * (params.DL + params.LL);
            
            // Calculate moments and shear
            const forces = window.calculationEngine.calculateSlabMoments(
                params.type, params.length, params.width, factoredLoad
            );
            
            // Calculate required reinforcement
            const astRequired = window.calculationEngine.calculateSlabReinforcement(
                forces.maxMoment * 1e6, params.fck, params.fy, 1000, effectiveDepth
            );
            
            // Minimum and maximum steel checks
            const astMin = 0.0012 * 1000 * params.thickness;
            const astMax = 0.04 * 1000 * effectiveDepth;
            const astProvided = Math.min(Math.max(astRequired, astMin), astMax);
            
            // Calculate spacing
            const barDia = this.getOptimalBarDiameter(astProvided);
            const areaPerBar = Math.PI * barDia * barDia / 4;
            const requiredBars = Math.ceil(astProvided / areaPerBar);
            const spacing = Math.min(1000 / requiredBars, 300);
            
            // Deflection check
            const E = 5000 * Math.sqrt(params.fck);
            const I = (1000 * Math.pow(params.thickness, 3)) / 12;
            const deflection = window.calculationEngine.calculateSlabDeflection(
                forces.maxMoment, E, I, Math.min(params.length, params.width), params.type
            );
            const deflectionLimit = (Math.min(params.length, params.width) * 1000) / 250;
            const deflectionOK = deflection <= deflectionLimit;
            
            // Crack width check
            const stress = 0.87 * params.fy;
            const crackWidth = window.calculationEngine.calculateCrackWidth(
                stress, params.cover, spacing, barDia
            );
            const crackWidthOK = crackWidth <= 0.3;
            
            const utilization = forces.maxMoment / (0.138 * params.fck * 1000 * effectiveDepth * effectiveDepth / 1e6);
            const isSafe = utilization <= 1.0 && deflectionOK && crackWidthOK;
            
            const results = {
                isSafe,
                statusMessage: isSafe ? 
                    'PASS - Slab design meets all requirements.' : 
                    'FAIL - Check thickness, reinforcement, or spans.',
                display: this.formatSlabResultsForDisplay({
                    maxMoment: forces.maxMoment,
                    maxShear: forces.maxShear,
                    utilization,
                    astProvided,
                    spacing,
                    barDia,
                    deflection,
                    deflectionLimit,
                    deflectionOK,
                    crackWidth,
                    crackWidthOK,
                    effectiveDepth
                })
            };
            
            this.ui.showSlabResults(results);
            this.addToHistory(results);
            
        } catch (error) {
            console.error('Error in slab design:', error);
            this.ui.showToast('Error in slab design calculation', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    getOptimalBarDiameter(requiredArea) {
        const bars = [8, 10, 12, 16, 20];
        for (const dia of bars) {
            const areaPerBar = Math.PI * dia * dia / 4;
            if (areaPerBar * (1000 / 300) >= requiredArea) {
                return dia;
            }
        }
        return 16;
    }

    formatSlabResultsForDisplay(data) {
        return {
            maxMoment: `${data.maxMoment.toFixed(2)} kNm/m`,
            shearForce: `${data.maxShear.toFixed(2)} kN/m`,
            deflection: `${data.deflection.toFixed(2)} mm ${data.deflectionOK ? '✓' : '✗'}`,
            utilization: `${(data.utilization * 100).toFixed(1)}%`,
            mainSteelX: `${data.barDia}mm @ ${Math.round(data.spacing)}mm c/c`,
            mainSteelY: `${data.barDia}mm @ ${Math.round(data.spacing * 1.2)}mm c/c`,
            distributionSteel: `8mm @ 200mm c/c`,
            steelSpacing: `${Math.round(data.spacing)} mm c/c`,
            deflectionCheck: `${data.deflection.toFixed(1)}mm < ${data.deflectionLimit.toFixed(1)}mm ${data.deflectionOK ? '(OK)' : '(FAIL)'}`,
            crackWidth: `${data.crackWidth.toFixed(2)} mm ${data.crackWidthOK ? '✓' : '✗'}`
        };
    }

    addBarToSchedule() {
        const barSize = parseInt(document.getElementById('bbsBarSize')?.value || 12);
        const length = parseFloat(document.getElementById('bbsLength')?.value || 6.0);
        const quantity = parseInt(document.getElementById('bbsQuantity')?.value || 1);
        const shape = document.getElementById('bbsShape')?.value || 'straight';
        const description = document.getElementById('bbsDescription')?.value || 'Main reinforcement';
        
        // Validation
        if (length <= 0) {
            this.ui.showToast('Bar length must be positive', 'error');
            return;
        }
        if (quantity <= 0) {
            this.ui.showToast('Quantity must be positive', 'error');
            return;
        }
        
        const barWeightPerMeter = this.getBarWeight(barSize);
        const totalLength = length * quantity;
        const totalWeight = totalLength * barWeightPerMeter;
        
        const bar = {
            id: Date.now(),
            mark: `B${this.state.bbs.bars.length + 1}`,
            diameter: barSize,
            length: length,
            quantity: quantity,
            shape: shape,
            description: description,
            totalLength: totalLength,
            weight: totalWeight
        };
        
        this.state.bbs.bars.push(bar);
        this.updateBBSDisplay();
        this.ui.showToast(`Added ${quantity} bars of ${barSize}mm`, 'success');
    }

    editBarInSchedule(barId) {
        const bar = this.state.bbs.bars.find(b => b.id === barId);
        if (!bar) return;
        
        const newLength = prompt('Enter new length (m):', bar.length);
        const newQuantity = prompt('Enter new quantity:', bar.quantity);
        const newDescription = prompt('Enter new description:', bar.description);
        
        if (newLength && newQuantity) {
            bar.length = parseFloat(newLength);
            bar.quantity = parseInt(newQuantity);
            bar.description = newDescription || bar.description;
            
            const barWeightPerMeter = this.getBarWeight(bar.diameter);
            bar.totalLength = bar.length * bar.quantity;
            bar.weight = bar.totalLength * barWeightPerMeter;
            
            this.updateBBSDisplay();
            this.ui.showToast('Bar updated successfully', 'success');
        }
    }

    deleteBarFromSchedule(barId) {
        if (confirm('Are you sure you want to delete this bar?')) {
            this.state.bbs.bars = this.state.bbs.bars.filter(b => b.id !== barId);
            this.updateBBSDisplay();
            this.ui.showToast('Bar deleted', 'info');
        }
    }

    updateBBSDisplay() {
        const tableBody = document.getElementById('bbs-table-body');
        const tableFooter = document.getElementById('bbs-table-footer');
        const weightSummary = document.getElementById('bbs-weight-summary');
        
        if (!tableBody) return;
        
        if (this.state.bbs.bars.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="border p-4 text-center text-gray-500">No bars added yet</td></tr>';
            tableFooter.classList.add('hidden');
            return;
        }
        
        let totalWeight = 0;
        const weightBySize = {8:0, 10:0, 12:0, 16:0, 20:0, 25:0, 32:0};
        
        this.state.bbs.bars.forEach(bar => {
            totalWeight += bar.weight;
            weightBySize[bar.diameter] = (weightBySize[bar.diameter] || 0) + bar.weight;
        });
        
        tableBody.innerHTML = this.state.bbs.bars.map(bar => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="border p-2">${bar.mark}</td>
                <td class="border p-2">${bar.description}</td>
                <td class="border p-2 text-center">${bar.diameter}</td>
                <td class="border p-2 text-center">${bar.shape}</td>
                <td class="border p-2 text-center">${bar.length.toFixed(2)}</td>
                <td class="border p-2 text-center">${bar.quantity}</td>
                <td class="border p-2 text-center">${bar.totalLength.toFixed(2)}</td>
                <td class="border p-2 text-center">${bar.weight.toFixed(2)}</td>
                <td class="border p-2 text-center">
                    <button onclick="civilSuite.editBarInSchedule(${bar.id})" class="text-blue-600 hover:text-blue-800 mr-2">✏️</button>
                    <button onclick="civilSuite.deleteBarFromSchedule(${bar.id})" class="text-red-600 hover:text-red-800">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        tableFooter.classList.remove('hidden');
        document.getElementById('bbs-total-length').textContent = 
            this.state.bbs.bars.reduce((sum, bar) => sum + bar.totalLength, 0).toFixed(2);
        document.getElementById('bbs-total-weight').textContent = totalWeight.toFixed(2);
        
        if (weightSummary) {
            weightSummary.innerHTML = Object.keys(weightBySize)
                .filter(dia => weightBySize[dia] > 0)
                .map(dia => `
                    <div class="flex justify-between"><span>${dia}mm bars:</span><span>${weightBySize[dia].toFixed(2)} kg</span></div>
                `).join('') + `
                <div class="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total Weight:</span><span>${totalWeight.toFixed(2)} kg</span>
                </div>
            `;
        }
        
        this.updateBBSShapesVisual();
    }

    updateBBSShapesVisual() {
        const svg = document.getElementById('bbs-shapes-svg');
        if (!svg) return;
        
        const shapes = {
            'straight': 'M50,90 L250,90',
            'L': 'M50,90 L150,90 L150,150',
            'U': 'M50,90 L150,90 L150,150 L250,150',
            'circular': 'M150,90 A40,40 0 1,1 150,90.1'
        };
        
        const colors = {'straight': '#3b82f6', 'L': '#ef4444', 'U': '#10b981', 'circular': '#f59e0b'};
        
        svg.innerHTML = '';
        
        const usedShapes = [...new Set(this.state.bbs.bars.map(bar => bar.shape))];
        
        usedShapes.forEach((shape, index) => {
            const y = 40 + (index * 40);
            const path = shapes[shape] || shapes['straight'];
            const color = colors[shape] || '#3b82f6';
            
            svg.innerHTML += `
                <path d="${path}" stroke="${color}" stroke-width="3" fill="none"/>
                <text x="260" y="${y + 5}" fill="#64748b" font-size="10">${shape.charAt(0).toUpperCase() + shape.slice(1)} Bar</text>
            `;
        });
        
        if (usedShapes.length === 0) {
            svg.innerHTML = `<text x="150" y="100" text-anchor="middle" fill="#64748b">Add bars to see shapes</text>`;
        }
    }

    generateBBSReport() {
        if (this.state.bbs.bars.length === 0) {
            this.ui.showToast('No bars to generate report', 'warning');
            return;
        }
        
        const reportData = {
            project: this.state.bbs.projectName,
            element: this.state.bbs.element,
            generated: new Date().toISOString(),
            bars: this.state.bbs.bars,
            totals: {
                totalLength: this.state.bbs.bars.reduce((sum, bar) => sum + bar.totalLength, 0),
                totalWeight: this.state.bbs.bars.reduce((sum, bar) => sum + bar.weight, 0)
            }
        };
        
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `bbs-report-${this.state.bbs.projectName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.ui.showToast('BBS report generated successfully!', 'success');
    }

    formatBeamResultsForDisplay(data) {
        const { units } = this.state;
        const convert = (val, type) => {
            const converted = val * (units.conversions[type] || 1);
            return Math.abs(converted) < 0.01 ? converted.toExponential(2) : converted.toFixed(2);
        };
        
        return {
            maxShear: convert(data.maxShear, 'force') + ' ' + units.force,
            maxMoment: convert(data.maxMoment, 'moment') + ' ' + units.moment,
            maxDeflection: convert(data.maxDeflection, 'deflection') + ' ' + units.deflection,
            momentCapacity: convert(data.momentCapacity / 1e6, 'moment') + ' ' + units.moment,
            shearCapacity: convert(data.shearCapacity / 1000, 'force') + ' ' + units.force,
            utilization: (data.utilization * 100).toFixed(1) + '%',
            bottomSteel: this.formatReinforcement(data.Ast_prov),
            topSteel: this.formatReinforcement(data.Ast_min),
            shearSteel: `T8 @ 200 mm c/c`,
            deflectionCheck: `${data.maxDeflection.toFixed(2)}mm < ${data.deflectionLimit.toFixed(2)}mm (${data.maxDeflection <= data.deflectionLimit ? 'OK' : 'FAIL'})`,
        };
    }
    
    generateBeamChartData(params, forces) {
        const { L, factoredUDL, type } = params;
        const steps = 20;
        const labels = [];
        const sfd = [];
        const bmd = [];

        for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * L;
            let shear = 0, moment = 0;
            
            if (type === 'simply-supported') {
                shear = factoredUDL * (L/2 - x);
                moment = (factoredUDL * x * (L - x)) / 2;
            } else if (type === 'cantilever') {
                shear = factoredUDL * (L - x);
                moment = -factoredUDL * Math.pow(L - x, 2) / 2;
            } else if (type === 'fixed') {
                shear = factoredUDL * (L/2 - x);
                moment = (factoredUDL / 12) * (6 * L * x - 6 * x * x - L * L);
            }
            
            labels.push(x.toFixed(2));
            sfd.push(shear * (this.state.units.conversions.force || 1));
            bmd.push(moment * (this.state.units.conversions.moment || 1));
        }
        
        return { labels, sfd, bmd };
    }
    
    formatReinforcement(area) {
        if (area < 0) return 'N/A';
        
        const bars = [8, 10, 12, 16, 20, 25, 32];
        for (const dia of bars) {
            const areaPerBar = Math.PI * dia * dia / 4;
            const num = Math.ceil(area / areaPerBar);
            if (num <= 8) {
                return `${num}T${dia} (${(num * areaPerBar).toFixed(0)} mm²)`;
            }
        }
        return `${area.toFixed(0)} mm²`;
    }

    getBarWeight(diameter) {
        const weights = {6:0.222, 8:0.395, 10:0.617, 12:0.888, 16:1.58, 20:2.47, 25:3.85, 32:6.31};
        return weights[diameter] || 0;
    }
    
    getUnitConfig(system) {
        if (system === 'imperial') {
            return {
                system: 'imperial',
                length: 'ft', force: 'kips', moment: 'kip-ft',
                deflection: 'in', 'kN/m': 'kips/ft',
                conversions: {
                    length: 3.28084, force: 0.224809, moment: 0.737562,
                    deflection: 39.3701, 'kN/m': 0.0685218,
                },
                toMetric: { L: 0.3048, b: 25.4, D: 25.4, cover: 25.4, DL: 14.5939, LL: 14.5939 }
            };
        }
        return {
            system: 'metric',
            length: 'm', force: 'kN', moment: 'kNm',
            deflection: 'mm', 'kN/m': 'kN/m',
            conversions: {},
            toMetric: { L: 1, b: 1, D: 1, cover: 1, DL: 1, LL: 1 }
        };
    }
    
    convertBeamStateToMetric(params) {
        if (this.state.units.system === 'metric') return { ...params };
        const conv = this.state.units.toMetric;
        const metricParams = {};
        for (const key in params) {
            metricParams[key] = params[key] * (conv[key] || 1);
        }
        return metricParams;
    }

    formatColumnResultsForDisplay(data) {
        return {
            axialCapacity: `${data.axialCapacity.toFixed(0)} kN`,
            momentCapacityX: `${data.momentCapacityX.toFixed(1)} kNm`,
            momentCapacityY: `${data.momentCapacityY.toFixed(1)} kNm`,
            utilization: `${(data.utilization * 100).toFixed(1)}%`,
            mainSteel: this.formatReinforcement(data.astProvided),
            tieSteel: 'T8 @ 200 c/c',
            steelPercentage: `${data.steelPercentage.toFixed(2)}%`,
            slenderness: '15.2',
            minEccentricity: '20 mm',
            designStatus: data.utilization <= 1.0 ? 'Adequate' : 'Inadequate',
            longitudinalBars: '4T16 + 4T12',
            tieSpacing: '200 mm',
            devLength: '720 mm',
            lapLength: '960 mm'
        };
    }

    addToHistory(results) {
        const historyItem = {
            timestamp: new Date().toISOString(),
            parameters: { ...this.state.beam },
            results: results.display,
            isSafe: results.isSafe
        };
        
        this.state.history.unshift(historyItem);
        
        // Keep only last 50 items
        if (this.state.history.length > 50) {
            this.state.history.pop();
        }
        
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        const historyList = document.getElementById('history-list');
        const historyCount = document.getElementById('history-count');
        
        if (historyList && historyCount) {
            historyCount.textContent = this.state.history.length;
            historyCount.classList.toggle('hidden', this.state.history.length === 0);
            
            historyList.innerHTML = this.state.history.map((item, index) => `
                <div class="history-item p-4 border border-gray-200 rounded-lg ${item.isSafe ? 'bg-green-50' : 'bg-red-50'}">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="font-medium">Analysis ${index + 1}</span>
                            <span class="text-sm text-gray-500 ml-2">${new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${item.isSafe ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">
                            ${item.isSafe ? 'PASS' : 'FAIL'}
                        </span>
                    </div>
                    <div class="mt-2 text-sm grid grid-cols-2 gap-2">
                        <div>Moment: ${item.results.maxMoment}</div>
                        <div>Shear: ${item.results.maxShear}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CivilSuiteApp...');
    window.civilSuite = new CivilSuiteApp();
});

// Error handling for failed resources
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});