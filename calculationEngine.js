// Enhanced Structural calculation functions
const calculationEngine = {
    calculateBeamForces(metric) {
        const { L, factoredUDL, type } = metric;
        
        let maxShear, maxMoment, maxDeflection;
        
        // Improved modulus of elasticity calculation
        const E = 5000 * Math.sqrt(metric.fck); // As per IS 456:2000
        
        // Moment of inertia (mm⁴)
        const I = (metric.b * Math.pow(metric.D, 3)) / 12;
        
        // Convert UDL to N/mm for deflection calculations
        const w = factoredUDL * 1000; // kN/m to N/m
        const w_mm = w / 1000; // N/m to N/mm
        
        switch(type) {
            case 'simply-supported':
                maxShear = factoredUDL * L / 2;
                maxMoment = factoredUDL * L * L / 8;
                maxDeflection = (5 * w * Math.pow(L, 4)) / (384 * E * I);
                break;
            case 'cantilever':
                maxShear = factoredUDL * L;
                maxMoment = factoredUDL * L * L / 2;
                maxDeflection = (w * Math.pow(L, 4)) / (8 * E * I);
                break;
            case 'fixed':
                maxShear = factoredUDL * L / 2;
                maxMoment = factoredUDL * L * L / 12;
                maxDeflection = (w * Math.pow(L, 4)) / (384 * E * I);
                break;
            default:
                maxShear = maxMoment = maxDeflection = 0;
        }
        
        return { 
            maxShear: Math.abs(maxShear), 
            maxMoment: Math.abs(maxMoment), 
            maxDeflection: Math.abs(maxDeflection * 1000) // Convert to mm
        };
    },

    calculateSteelArea(moment, fck, fy, b, d) {
        const momentNmm = moment;
        
        // As per IS 456:2000 - Limit State Method
        const fck_num = fck;
        const fy_num = fy;
        
        // Calculate limiting moment capacity
        const mu_lim = 0.138 * fck_num * b * d * d;
        
        if (momentNmm > mu_lim) {
            // Doubly reinforced section needed
            return this.calculateDoublyReinforcedSteel(momentNmm, fck_num, fy_num, b, d);
        }
        
        // Singly reinforced section
        const R = momentNmm / (b * d * d);
        const pt = (50 * fck_num / fy_num) * (1 - Math.sqrt(1 - (4.6 * R) / fck_num));
        const Ast = (pt * b * d) / 100;
        
        // Check minimum and maximum steel requirements
        const Ast_min = Math.max(0.0012 * b * d, 0.85 * b * d / fy_num);
        const Ast_max = 0.04 * b * d;
        
        return Math.min(Math.max(Ast, Ast_min), Ast_max);
    },

    calculateDoublyReinforcedSteel(moment, fck, fy, b, d) {
        const mu_lim = 0.138 * fck * b * d * d;
        const Ast1 = mu_lim / (0.87 * fy * (d - 0.416 * 0.48 * d));
        const mu2 = moment - mu_lim;
        const Ast2 = mu2 / (0.87 * fy * (d - 25)); // Assuming 25mm cover for compression steel
        
        return Ast1 + Ast2;
    },

    calculateMomentCapacity(Ast, fy, fck, b, d) {
        const xu = (0.87 * fy * Ast) / (0.36 * fck * b);
        const xu_max = 0.48 * d; // For Fe500
        
        if (xu > xu_max) {
            // Over-reinforced section
            return 0.138 * fck * b * d * d;
        }
        
        const mur = 0.36 * fck * b * xu * (d - 0.416 * xu);
        return mur;
    },

    calculateShearCapacity(fck, b, d, Ast = 0) {
        // As per IS 456:2000 - Table 19
        const pt = (Ast * 100) / (b * d); // Percentage of steel
        let tau_c = 0;
        
        // Simplified shear stress values (N/mm²)
        if (pt <= 0.15) tau_c = 0.28;
        else if (pt <= 0.25) tau_c = 0.36;
        else if (pt <= 0.50) tau_c = 0.48;
        else if (pt <= 0.75) tau_c = 0.56;
        else if (pt <= 1.00) tau_c = 0.62;
        else tau_c = 0.67;
        
        // Apply concrete grade modification
        tau_c *= Math.sqrt(fck / 25);
        
        return tau_c * b * d;
    },

    // New: Calculate development length
    calculateDevelopmentLength(fy, fck, barDia) {
        const bondStress = 1.2 * Math.sqrt(fck); // For deformed bars
        return (fy * barDia) / (4 * bondStress);
    },

    // Column capacity calculation
    calculateColumnCapacity(axialLoad, momentX, momentY, fck, fy, width, depth, ast) {
        // Simplified column capacity calculation as per IS 456:2000
        const area = width * depth;
        const concreteCapacity = 0.4 * fck * area;
        const steelCapacity = 0.67 * fy * ast;
        const totalCapacity = (concreteCapacity + steelCapacity) / 1000; // Convert to kN
        
        return {
            axialCapacity: totalCapacity,
            momentCapacityX: 0.138 * fck * width * depth * depth / 1e6, // kNm
            momentCapacityY: 0.138 * fck * depth * width * width / 1e6  // kNm
        };
    },

    // Slab reinforcement calculation
    calculateSlabReinforcement(moment, fck, fy, width, effectiveDepth) {
        // Calculate required reinforcement for slab as per IS 456:2000
        const R = moment / (width * effectiveDepth * effectiveDepth);
        const pt = (50 * fck / fy) * (1 - Math.sqrt(1 - (4.6 * R) / fck));
        
        // Ensure minimum reinforcement
        const astRequired = (pt * width * effectiveDepth) / 100;
        const astMin = 0.0012 * width * effectiveDepth; // Minimum steel for slabs
        
        return Math.max(astRequired, astMin);
    },

    // === ENHANCED SLAB CALCULATION FUNCTIONS ===
    calculateSlabMoments: function(slabType, length, width, factoredLoad) {
        let maxMoment, maxShear;
        
        switch(slabType) {
            case 'one-way':
                const span = Math.min(length, width);
                maxMoment = factoredLoad * span * span / 8;
                maxShear = factoredLoad * span / 2;
                break;
            case 'two-way':
                const ly = Math.max(length, width);
                const lx = Math.min(length, width);
                const ratio = ly / lx;
                
                if (ratio <= 2) {
                    const alpha_x = ratio <= 1 ? 0.062 : 0.062 + (0.055 - 0.062) * (ratio - 1);
                    maxMoment = alpha_x * factoredLoad * lx * lx;
                } else {
                    maxMoment = factoredLoad * lx * lx / 8;
                }
                maxShear = factoredLoad * lx / 3;
                break;
            case 'cantilever':
                maxMoment = factoredLoad * length * length / 2;
                maxShear = factoredLoad * length;
                break;
            default:
                maxMoment = maxShear = 0;
        }
        
        return { maxMoment, maxShear };
    },

    calculateSlabDeflection: function(moment, E, I, span, slabType) {
        let deflectionCoefficient = 0;
        
        switch(slabType) {
            case 'one-way': deflectionCoefficient = 5/384; break;
            case 'two-way': deflectionCoefficient = 1/250; break;
            case 'cantilever': deflectionCoefficient = 1/8; break;
        }
        
        return (deflectionCoefficient * moment * span * span) / (E * I);
    },

    calculateCrackWidth: function(stress, cover, barSpacing, barDia) {
        const acr = Math.sqrt(Math.pow(cover + barDia/2, 2) + Math.pow(barSpacing/2, 2));
        const epsilon = stress / (2 * Math.pow(10, 5));
        return (3 * acr * epsilon) / (1 + 2 * (acr - cover) / (0.85 * 150));
    }
    // === END OF ENHANCED FUNCTIONS ===
};

window.calculationEngine = calculationEngine;