class ChartManager {
    constructor() {
        this.sfdChart = null;
        this.bmdChart = null;
        this.init();
    }

    init() {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#64748b';
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
    }

    renderBeamCharts(chartData) {
        this.renderSFDChart(chartData);
        this.renderBMDChart(chartData);
    }

    renderSFDChart(chartData) {
        const ctx = document.getElementById('sfd-chart');
        if (!ctx) return;
        
        if (this.sfdChart) this.sfdChart.destroy();

        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#f1f5f9' : '#1e293b';

        this.sfdChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Shear Force',
                    data: chartData.sfd,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Shear: ${context.parsed.y.toFixed(2)} kN`;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            zeroLine: {
                                type: 'line',
                                scaleID: 'y',
                                value: 0,
                                borderColor: textColor,
                                borderWidth: 2,
                                borderDash: [5, 5]
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Distance along beam (m)',
                            color: textColor,
                            font: { weight: 'bold', size: 12 }
                        },
                        grid: { color: gridColor }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Shear Force (kN)',
                            color: textColor,
                            font: { weight: 'bold', size: 12 }
                        },
                        grid: { color: gridColor }
                    }
                },
                interaction: { intersect: false, mode: 'nearest' },
                animations: {
                    tension: {
                        duration: 1000,
                        easing: 'linear'
                    }
                }
            }
        });
    }

    renderBMDChart(chartData) {
        const ctx = document.getElementById('bmd-chart');
        if (!ctx) return;
        
        if (this.bmdChart) this.bmdChart.destroy();

        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#f1f5f9' : '#1e293b';

        this.bmdChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Bending Moment',
                    data: chartData.bmd,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Moment: ${context.parsed.y.toFixed(2)} kNm`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Distance along beam (m)',
                            color: textColor,
                            font: { weight: 'bold', size: 12 }
                        },
                        grid: { color: gridColor }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Bending Moment (kNm)',
                            color: textColor,
                            font: { weight: 'bold', size: 12 }
                        },
                        grid: { color: gridColor }
                    }
                },
                interaction: { intersect: false, mode: 'nearest' }
            }
        });
    }

    // New: Export charts as image
    exportChartAsPNG(chartId, filename) {
        const chart = chartId === 'sfd' ? this.sfdChart : this.bmdChart;
        if (chart) {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = chart.toBase64Image();
            link.click();
        }
    }
}

window.chartManager = new ChartManager();