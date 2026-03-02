function drawStackedChart() {
    const containerDiv = d3.select("#stacked-chart-container");
    containerDiv.selectAll("*").remove();
    d3.selectAll(".stacked-tooltip").remove(); 

    let width = containerDiv.node().clientWidth || 1200; 
    let height = containerDiv.node().clientHeight || 280; 
    
    
    const margin = {top: 30, right: 220, bottom: 25, left: 50};

    const isoToFao = {
        "FRA": "France", "USA": "États-Unis d'Amérique", "CHN": "Chine, continentale", 
        "BRA": "Brésil", "IND": "Inde", "DEU": "Allemagne", "GBR": "Royaume-Uni de Grande-Bretagne et d'Irlande du Nord",
        "CAN": "Canada", "AUS": "Australie", "RUS": "Fédération de Russie"
    };

    let curData = faoData;
    if (selectedCountries.length > 0) {
        const nomsFao = selectedCountries.map(code => isoToFao[code]).filter(Boolean);
        curData = faoData.filter(d => nomsFao.includes(d.country));
    }

    const stages = [
        "Changement d'utilisation des terres", "Farm gate", "Transformation des aliments",
        "Emballage alimentaire", "Transporte des alimentaires", "Commerce de détail alimentaire",
        "Consommation des ménages", "Évacuation des déchets des systèmes agroalimentaires"
    ];

    const grouped = d3.rollup(curData, v => d3.sum(v, d => d.Emission), d => d.Annee, d => d.stage);
    const stackData = Array.from(grouped, ([Annee, stageMap]) => {
        const obj = { Annee };
        for (let stage of stages) obj[stage] = stageMap.get(stage) || 0;
        return obj;
    }).sort((a, b) => a.Annee - b.Annee);

    const svg = containerDiv.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "white")
        .style("border-radius", "8px");

    if (stackData.length === 0) {
        svg.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").attr("fill", "#e74c3c")
           .text("Pas de données détaillées pour cette sélection.");
        return;
    }

    const tooltip = d3.select("body").append("div")
        .attr("class", "stacked-tooltip")
        .style("position", "absolute").style("visibility", "hidden")
        .style("background", "rgba(255, 255, 255, 0.95)").style("border", "1px solid #ccc")
        .style("padding", "10px").style("border-radius", "8px").style("box-shadow", "0 4px 10px rgba(0,0,0,0.15)")
        .style("pointer-events", "none").style("font-size", "12px").style("z-index", "9999");

    const series = d3.stack().keys(stages)(stackData);
    const x = d3.scaleLinear().domain([1990, 2015]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(series, d => d3.max(d, d => d[1]))]).nice().range([height - margin.bottom, margin.top]);
    const color = d3.scaleOrdinal().domain(stages).range(["#8c564b", "#2ca02c", "#bcbd22", "#ff7f0e", "#1f77b4", "#7f7f7f", "#e377c2", "#17becf"]);

    const area = d3.area().x(d => x(d.data.Annee)).y0(d => y(d[0])).y1(d => y(d[1]));

    svg.append("g").selectAll("path").data(series).join("path").attr("fill", d => color(d.key)).attr("opacity", 0.9).attr("d", area); 
    
    //  L'AXE Y (Axe vertical des émissions)
    svg.append("g")
       .attr("transform", `translate(${margin.left},0)`)
       .call(d3.axisLeft(y).ticks(5, "s"));

    // L'AXE X (Axe horizontal des années)
    svg.append("g")
       .attr("transform", `translate(0,${height - margin.bottom})`)
       .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickSizeOuter(0));

    svg.append("text").attr("x", margin.left).attr("y", 15).attr("font-size", "14px").attr("font-weight", "bold")
       .text("Émissions liées à l’alimentation selon les étapes du cycle de vie");

    const cursorGroup = svg.append("g");
    const safeYear = typeof currentYear !== 'undefined' ? currentYear : 2015;
    
    cursorGroup.append("line").attr("x1", x(safeYear)).attr("x2", x(safeYear)).attr("y1", margin.top).attr("y2", height - margin.bottom)
               .attr("stroke", "#333").attr("stroke-width", 2).attr("stroke-dasharray", "4,4");
    cursorGroup.append("rect").attr("x", x(safeYear) - 20).attr("y", margin.top - 20).attr("width", 40).attr("height", 20).attr("fill", "#333").attr("rx", 3);
    cursorGroup.append("text").attr("x", x(safeYear)).attr("y", margin.top - 6).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", "11px").attr("font-weight", "bold").text(safeYear);

    const shortLabels = {"Changement d'utilisation des terres": "Déforestation", "Farm gate": "Agriculture (Ferme)", "Transformation des aliments": "Transformation", "Emballage alimentaire": "Emballage", "Transporte des alimentaires": "Transport", "Commerce de détail alimentaire": "Supermarchés", "Consommation des ménages": "Ménages", "Évacuation des déchets des systèmes agroalimentaires": "Déchets"};
    
    const hoverLine = svg.append("line").attr("y1", margin.top).attr("y2", height - margin.bottom).attr("stroke", "#999").attr("stroke-width", 1).attr("stroke-dasharray", "3").style("opacity", 0);

    svg.append("rect").attr("width", width - margin.left - margin.right).attr("height", height - margin.top - margin.bottom).attr("x", margin.left).attr("y", margin.top).attr("fill", "transparent").style("cursor", "crosshair")
        .on("mouseenter", () => { tooltip.style("visibility", "visible"); hoverLine.style("opacity", 1); })
        .on("mouseleave", () => { tooltip.style("visibility", "hidden"); hoverLine.style("opacity", 0); })
        .on("mousemove", (event) => {
            const [mouseX] = d3.pointer(event);
            const hoveredYear = Math.round(x.invert(mouseX));
            if (hoveredYear < 1990 || hoveredYear > 2015) return;
            
            hoverLine.attr("x1", x(hoveredYear)).attr("x2", x(hoveredYear));
            const yearData = stackData.find(d => d.Annee === hoveredYear);
            if (!yearData) return;

            let total = 0;
            let htmlContent = `<div style="font-size:13px; font-weight:bold; border-bottom:1px solid #ddd; margin-bottom:6px; padding-bottom:4px;">Année ${hoveredYear}</div>`;
            
            [...stages].reverse().forEach(stage => {
                const val = yearData[stage];
                total += val;
                if (val > 0) {
                    htmlContent += `<div style="display:flex; justify-content:space-between; margin-bottom:2px; gap: 15px;"><span style="color:${color(stage)};">■ <span style="color:#555;">${shortLabels[stage]}</span></span><span style="font-weight:bold;">${d3.format(".2s")(val)}t</span></div>`;
                }
            });
            
            htmlContent += `<div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:6px; border-top:1px solid #ddd; padding-top:4px; color:#e74c3c;"><span>TOTAL</span><span>${d3.format(".2s")(total)}t</span></div>`;
            
            tooltip.html(htmlContent);

            const tNode = tooltip.node();
            const tWidth = tNode ? tNode.offsetWidth : 200;
            const tHeight = tNode ? tNode.offsetHeight : 250;

            let leftPos = event.pageX + 15;
            let topPos = event.pageY - 20;

            if (leftPos + tWidth > window.innerWidth) leftPos = event.pageX - tWidth - 15;
            if (topPos + tHeight > window.innerHeight) topPos = window.innerHeight - tHeight - 15;

            tooltip.style("left", `${leftPos}px`).style("top", `${topPos}px`);
        });

    const currentYearData = stackData.find(d => d.Annee === safeYear) || {};
    let totalYear = 0;
    stages.forEach(s => totalYear += (currentYearData[s] || 0));

    const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);
    
    [...stages].reverse().forEach((key, i) => {
        const val = currentYearData[key] || 0;
        const valStr = val > 0 ? d3.format(".2s")(val) + " t" : "0 t";
        const yPos = i * 22; 
        
        legend.append("rect").attr("y", yPos).attr("width", 10).attr("height", 10).attr("fill", color(key)).attr("rx", 2);
        legend.append("text").attr("x", 16).attr("y", yPos + 9).attr("font-size", "11px").attr("fill", "#333")
              .text(`${shortLabels[key]} : `).append("tspan").style("font-weight", "bold").text(valStr);
    });
    
    legend.append("text").attr("x", 0).attr("y", stages.length * 22 + 15).attr("font-size", "12px").attr("font-weight", "bold").attr("fill", "#e74c3c").text(`TOTAL : ${d3.format(".2s")(totalYear)} t`);
}