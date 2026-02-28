function drawStackedChart() {
    const containerDiv = d3.select("#stacked-chart-container");
    containerDiv.selectAll("*").remove();

    const width = containerDiv.node().getBoundingClientRect().width || 900;
    const height = 350;
    const margin = {top: 40, right: 30, bottom: 30, left: 60}; 

    const shortLabels = {
        "Changement d'utilisation des terres": "Déforestation",
        "Farm gate": "Agriculture (Ferme)",
        "Transformation des aliments": "Transformation",
        "Emballage alimentaire": "Emballage",
        "Transporte des alimentaires": "Transport",
        "Commerce de détail alimentaire": "Supermarchés",
        "Consommation des ménages": "Ménages",
        "Évacuation des déchets des systèmes agroalimentaires": "Déchets"
    };

    const isoToFao = {
        "FRA": "France", "USA": "États-Unis d'Amérique", "CHN": "Chine, continentale", 
        "BRA": "Brésil", "IND": "Inde", "DEU": "Allemagne",
        "GBR": "Royaume-Uni", "CAN": "Canada", "AUS": "Australie", "RUS": "Fédération de Russie"
    };

    let currentData = faoData;
    if (selectedCountries.length > 0) {
        const nomsFao = selectedCountries.map(code => isoToFao[code]).filter(Boolean);
        if (nomsFao.length > 0) {
            currentData = faoData.filter(d => nomsFao.includes(d.country));
        } else {
            currentData = []; 
        }
    }

    const stages = [
        "Changement d'utilisation des terres", "Farm gate", "Transformation des aliments",
        "Emballage alimentaire", "Transporte des alimentaires", "Commerce de détail alimentaire",
        "Consommation des ménages", "Évacuation des déchets des systèmes agroalimentaires"
    ];

    const grouped = d3.rollup(currentData, 
        v => d3.sum(v, d => d.Emission), 
        d => d.Annee, 
        d => d.stage
    );

    const stackData = Array.from(grouped, ([Annee, stageMap]) => {
        const obj = { Annee };
        for (let stage of stages) {
            obj[stage] = stageMap.get(stage) || 0;
        }
        return obj;
    }).sort((a, b) => a.Annee - b.Annee);

    const container = containerDiv.append("div").style("position", "relative");

    const tooltip = container.append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "11px")
        .style("color", "#333")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
        .style("z-index", "100");

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "white")
        .style("border-radius", "8px");

    if (stackData.length === 0) {
        svg.append("text").attr("x", width/2).attr("y", height/2)
           .attr("text-anchor", "middle").attr("fill", "#666").text("Pas de données");
        return;
    }

    const stack = d3.stack().keys(stages);
    const series = stack(stackData);

    const x = d3.scaleLinear().domain([1990, 2015]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(series, d => d3.max(d, d => d[1]))]).nice().range([height - margin.bottom, margin.top]);
    const color = d3.scaleOrdinal().domain(stages).range(["#8c564b", "#2ca02c", "#bcbd22", "#ff7f0e", "#1f77b4", "#7f7f7f", "#e377c2", "#17becf"]);

    const area = d3.area().x(d => x(d.data.Annee)).y0(d => y(d[0])).y1(d => y(d[1]));

    svg.append("g").selectAll("path").data(series).join("path")
        .attr("fill", d => color(d.key)).attr("opacity", 0.9).attr("d", area);

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5, "s"));

    svg.append("text").attr("x", margin.left).attr("y", margin.top - 15)
        .attr("font-size", "16px").attr("font-weight", "bold").attr("fill", "#333")
        .text(selectedCountries.length === 0 ? "Cycle de vie mondial" : `Cycle de vie des pays sélectionnés`);

    const focus = svg.append("g").style("display", "none");

    focus.append("line")
        .attr("class", "hover-line")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom);

    const badge = focus.append("g").attr("class", "hover-badge");
    
    badge.append("rect")
        .attr("fill", "#333")
        .attr("rx", 3)
        .attr("width", 40)
        .attr("height", 20)
        .attr("x", -20)
        .attr("y", margin.top - 20);
    
    badge.append("text")
        .attr("class", "hover-badge-text")
        .attr("fill", "white")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("x", 0)
        .attr("y", margin.top - 6);

    svg.append("rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("fill", "transparent")
        .on("mouseover", () => {
            focus.style("display", null);
            tooltip.style("visibility", "visible");
        })
        .on("mouseout", () => {
            focus.style("display", "none");
            tooltip.style("visibility", "hidden");
        })
        .on("mousemove", function(event) {
            const [mouseX, mouseY] = d3.pointer(event);
            const year = Math.round(x.invert(mouseX));
            
            const bisect = d3.bisector(d => d.Annee).center;
            const i = bisect(stackData, year);
            
            if (i < 0 || i >= stackData.length) return;

            const actualX = x(year);
            
            focus.select(".hover-line").attr("x1", actualX).attr("x2", actualX);
            focus.select(".hover-badge").attr("transform", `translate(${actualX}, 0)`);
            focus.select(".hover-badge-text").text(year);

            const yearData = stackData[i];
            let total = 0;
            
            let htmlContent = `<div style="display:flex; flex-direction:column; gap:4px;">`;
            
            [...stages].reverse().forEach(stage => {
                const value = yearData[stage];
                total += value;
                const frenchName = shortLabels[stage];
                
                htmlContent += `
                    <div style="display:flex; justify-content:space-between; align-items:center; width:180px;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="width:10px; height:10px; background:${color(stage)}; border-radius:2px;"></div>
                            <span style="color:#666;">${frenchName} :</span>
                        </div>
                        <span style="font-weight:bold;">${d3.format(".2s")(value).replace("G", "Md")} t</span>
                    </div>
                `;
            });
            
            htmlContent += `
                <div style="margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:bold; color:#d62728; border-top:1px solid #eee;">
                    <span>TOTAL :</span>
                    <span>${d3.format(".2s")(total).replace("G", "Md")} t</span>
                </div>
            </div>`;
            
            tooltip.html(htmlContent);
            
            const tooltipX = actualX + 15;
            const finalX = tooltipX > width - 240 ? actualX - 220 : tooltipX;
            const finalY = Math.max(margin.top, Math.min(mouseY, height - margin.bottom - 200));
            
            tooltip
                .style("left", finalX + "px")
                .style("top", finalY + "px");
        });
}