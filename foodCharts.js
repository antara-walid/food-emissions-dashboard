async function drawFoodCharts() {
    const barContainer = d3.select("#food-bar-container");
    const donutContainer = d3.select("#food-donut-container");
    const legendContainer = d3.select("#food-donut-legend");
    
    barContainer.selectAll("*").remove();
    donutContainer.selectAll("*").remove();
    legendContainer.html("");

    let data;
    try {
        data = await d3.csv("Food_Production.csv");
        data.forEach(d => { d.Total_emissions = +d.Total_emissions; });
        data.sort((a, b) => b.Total_emissions - a.Total_emissions);
    } catch (e) {
        console.error("Erreur de chargement du CSV", e);
        barContainer.append("text").text("Fichier Food_Production.csv introuvable.");
        return;
    }

    const topFoods = data.slice(0, 15);
    let activeFood = topFoods[0]; 

    const stages = ["Land use change", "Animal Feed", "Farm", "Processing", "Transport", "Packging", "Retail"];
    
  
    const stageLabels = {
        "Land use change": "Déforestation", 
        "Animal Feed": "Alimentation animale",
        "Farm": "À la Ferme", 
        "Processing": "Transformation",
        "Transport": "Transport", 
        "Packging": "Emballage", 
        "Retail": "Supermarché"
    };

    const color = d3.scaleOrdinal()
        .domain(stages)
        .range(["#8D6E63", "#EC407A", "#43A047", "#C0CA33", "#1E88E5", "#9E9E9E", "#FF8F00"]);

    // --- GRAPHE BARRES ---
    const vWidthBar = 600;
    const vHeightBar = 500;
    const barMargin = { top: 20, right: 60, bottom: 40, left: 140 };

    const svgBar = barContainer.append("svg")
        .attr("viewBox", `0 0 ${vWidthBar} ${vHeightBar}`)
        .style("width", "100%")
        .style("height", "100%");

    const xBar = d3.scaleLinear().domain([0, d3.max(topFoods, d => d.Total_emissions)]).range([barMargin.left, vWidthBar - barMargin.right]);
    const yBar = d3.scaleBand().domain(topFoods.map(d => d["Food product"])).range([barMargin.top, vHeightBar - barMargin.bottom]).padding(0.2);

    function updateBarStyles(hoveredFood) {
        bars.attr("opacity", d => (d === hoveredFood || (!hoveredFood && d === activeFood)) ? 1 : 0.3)
            .attr("fill", d => (d === hoveredFood || (!hoveredFood && d === activeFood)) ? "#e74c3c" : "#ced4da"); 
    }

    const bars = svgBar.append("g").selectAll("rect").data(topFoods).join("rect")
        .attr("x", xBar(0)).attr("y", d => yBar(d["Food product"]))
        .attr("width", d => Math.max(0, xBar(d.Total_emissions) - xBar(0)))
        .attr("height", yBar.bandwidth())
        .style("cursor", "pointer")
        .attr("rx", 3)
        .on("mouseenter", function(event, d) { updateBarStyles(d); drawDonut(d); })
        .on("mouseleave", function() { updateBarStyles(null); drawDonut(activeFood); })
        .on("click", function(event, d) { activeFood = d; updateBarStyles(null); drawDonut(activeFood); });

    updateBarStyles(null);

    svgBar.append("g").selectAll("text.val").data(topFoods).join("text").attr("class", "val")
        .attr("x", d => xBar(d.Total_emissions) + 5).attr("y", d => yBar(d["Food product"]) + yBar.bandwidth() / 2).attr("dy", "0.35em")
        .text(d => d3.format(".1f")(d.Total_emissions)).style("font-size", "11px").style("fill", "#666");

    svgBar.append("g").attr("transform", `translate(0,${vHeightBar - barMargin.bottom})`).call(d3.axisBottom(xBar).ticks(5))
          .append("text").attr("x", vWidthBar - barMargin.right).attr("y", 30).attr("fill", "#666").attr("text-anchor", "end").text("kg CO₂eq / kg");
    svgBar.append("g").attr("transform", `translate(${barMargin.left},0)`).call(d3.axisLeft(yBar).tickSize(0)).select(".domain").remove();
    svgBar.selectAll(".tick text").style("font-size", "11px").style("font-weight", "bold");

    // --- GRAPHE DONUT ---
    const vWidthDonut = 400;
    const vHeightDonut = 350;
    const radius = Math.min(vWidthDonut, vHeightDonut) / 2 - 10;

    const svgDonut = donutContainer.append("svg")
        .attr("viewBox", `0 0 ${vWidthDonut} ${vHeightDonut}`)
        .style("width", "100%")
        .style("height", "100%")
        .append("g").attr("transform", `translate(${vWidthDonut / 2},${vHeightDonut / 2})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
    const arcLabel = d3.arc().innerRadius(radius * 0.75).outerRadius(radius * 0.75);

    const arcsGroup = svgDonut.append("g");
    const centerTextGroup = svgDonut.append("g");

    const titleText = centerTextGroup.append("text").attr("text-anchor", "middle").attr("y", -10).attr("font-size", "16px").attr("font-weight", "bold").attr("fill", "#333");
    const valueText = centerTextGroup.append("text").attr("text-anchor", "middle").attr("y", 20).attr("font-size", "26px").attr("font-weight", "bold").attr("fill", "#e74c3c");
    centerTextGroup.append("text").attr("text-anchor", "middle").attr("y", 40).attr("font-size", "12px").attr("fill", "#666").text("kg CO₂eq");

    function drawDonut(foodItem) {
        const pieData = stages.map(stage => ({ key: stage, value: +foodItem[stage] || 0 }));
        titleText.text(foodItem["Food product"]);
        valueText.text(d3.format(".1f")(foodItem.Total_emissions));

        arcsGroup.selectAll("path").data(pie(pieData)).join("path")
            .attr("fill", d => color(d.data.key)).attr("d", arc).attr("stroke", "white").attr("stroke-width", "2px");

        arcsGroup.selectAll("text.slice-label").data(pie(pieData)).join("text")
            .attr("class", "slice-label")
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "11px").style("font-weight", "bold").style("fill", "white").style("pointer-events", "none")
            .text(d => d.data.value > (foodItem.Total_emissions * 0.05) ? d3.format(".1f")(d.data.value) : "");

        
        legendContainer.html(""); 
        stages.forEach(stage => {
            const val = +foodItem[stage] || 0;
            const valStr = val > 0 ? d3.format(".2f")(val) : "0.00"; // Toujours 2 décimales (ex: 16.30 kg)
            
            legendContainer.node().innerHTML += `
                <div style="display: flex; align-items: center; gap: 6px; background: #ffffff; padding: 6px 14px; border-radius: 20px; border: 1px solid #dcdcdc;">
                    <div style="width: 12px; height: 12px; background-color: ${color(stage)}; border-radius: 50%;"></div>
                    <span style="color: #444;">${stageLabels[stage]}: <b style="color:#222;">${valStr} kg</b></span>
                </div>
            `;
        });
    }

    drawDonut(activeFood);
}