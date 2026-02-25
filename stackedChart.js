function drawStackedChart() {
    const containerDiv = d3.select("#stacked-chart-container");
    containerDiv.selectAll("*").remove();

    const width = 900;
    const height = 350;
    const margin = {top: 40, right: 150, bottom: 30, left: 60}; 

    const shortLabels = {
        "Changement d'utilisation des terres": "Déforestation",
        "Farm gate": "Agriculture (Ferme)",
        "Transformation des aliments": "Transformation",
        "Emballage alimentaire": "Emballage",
        "Transporte des alimentaires": "Transport",
        "Commerce de détail alimentaire": "Vente & Supermarchés",
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
        .style("border", "1px solid #ccc")
        .style("padding", "5px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("color", "#333")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
        .style("z-index", "100");

    const svg = container.append("svg")
        .attr("viewBox", [0, 0, width, height])
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
        .text(selectedCountries.length === 0 ? "🌍 Cycle de vie mondial" : `📍 Cycle de vie : ${selectedCountries.join(", ")}`);

    const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);
    [...stages].reverse().forEach((key, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
        row.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(key)).attr("rx", 2);
        row.append("text").attr("x", 20).attr("y", 10).attr("font-size", "11px").attr("fill", "#333").text(shortLabels[key]);
    });

    svg.append("rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("fill", "transparent")
        .on("mousemove", function(event) {
            const [mouseX, mouseY] = d3.pointer(event);
            
            const year = Math.round(x.invert(mouseX));
            
            const bisect = d3.bisector(d => d.Annee).center;
            const i = bisect(stackData, year);
            
            if (i < 0 || i >= stackData.length) { tooltip.style("visibility", "hidden"); return; }
            
            const yValue = y.invert(mouseY);
            const layer = series.find(s => {
                const point = s[i];
                return point && point[0] <= yValue && point[1] >= yValue;
            });

            if (layer) {
                const stageName = layer.key;
                const value = stackData[i][stageName];
                const frenchName = shortLabels[stageName];
                
                tooltip
                    .style("visibility", "visible")
                    .html(`
                        <div style="font-weight:bold;">${frenchName}</div>
                        <div>${d3.format(".2s")(value)} t (${year})</div>
                    `)
                    .style("left", (mouseX + 15) + "px")
                    .style("top", (mouseY + 15) + "px");
            } else {
                tooltip.style("visibility", "hidden");
            }
        })
        .on("mouseleave", () => tooltip.style("visibility", "hidden"));
}