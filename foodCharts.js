function drawFoodCharts() {
    const foodTranslations = {
        "Beef (beef herd)": "Bœuf (viande)",
        "Beef (dairy herd)": "Bœuf (laitier)",
        "Lamb & Mutton": "Agneau & Mouton",
        "Cheese": "Fromage",
        "Pig Meat": "Porc",
        "Poultry Meat": "Volaille",
        "Eggs": "Œufs",
        "Rice": "Riz",
        "Milk": "Lait",
        "Tomatoes": "Tomates",
        "Potatoes": "Pommes de terre",
        "Wheat & Rye (Bread)": "Blé & Seigle",
        "Maize (Meal)": "Maïs",
        "Peas": "Pois",
        "Cassava": "Manioc",
        "Tofu": "Tofu",
        "Dark Chocolate": "Chocolat noir",
        "Coffee": "Café",
        "Prawns (farmed)": "Crevettes (élevage)",
        "Fish (farmed)": "Poisson (élevage)",
        "Soymilk": "Lait de soja",
        "Oatmeal": "Flocons d'avoine",
        "Apples": "Pommes",
        "Citrus Fruit": "Agrumes",
        "Nuts": "Fruits à coque",
        "Palm Oil": "Huile de palme",
        "Olive Oil": "Huile d'olive",
        "Sunflower Oil": "Huile de tournesol",
        "Rapeseed Oil": "Huile de colza",
        "Cane Sugar": "Sucre de canne",
        "Beet Sugar": "Sucre de betterave",
        "Wine": "Vin",
        "Beer": "Bière"
    };

    const topFoods = foodData.filter(d => d.Total_emissions > 0)
        .sort((a, b) => b.Total_emissions - a.Total_emissions)
        .slice(0, 15)
        .map(d => ({
            ...d,
            "Food product": foodTranslations[d["Food product"]] || d["Food product"]
        }));

    if (topFoods.length === 0) return;

    const stages = ["Land use change", "Animal Feed", "Farm", "Processing", "Transport", "Packging", "Retail"];
    const stageLabels = {
        "Land use change": "Occupation des sols", 
        "Animal Feed": "Alimentation animale", 
        "Farm": "Production agricole", 
        "Processing": "Transformation", 
        "Transport": "Transport", 
        "Packging": "Emballage", 
        "Retail": "Distribution"
    };
    
    const color = d3.scaleOrdinal()
        .domain(stages)
        .range(["#8c564b", "#e377c2", "#2ca02c", "#bcbd22", "#1f77b4", "#7f7f7f", "#ff7f0e"]);

    let activeFood = topFoods[0];

    const barContainer = d3.select("#food-bar-container");
    barContainer.selectAll("*").remove();

    const barWidth = barContainer.node().getBoundingClientRect().width || 450;
    const barHeight = 400;
    const barMargin = {top: 20, right: 40, bottom: 40, left: 140};

    const svgBar = barContainer.append("svg")
        .attr("viewBox", [0, 0, barWidth, barHeight])
        .attr("width", "100%")
        .attr("height", "100%");
    
    const xBar = d3.scaleLinear()
        .domain([0, d3.max(topFoods, d => d.Total_emissions)])
        .range([barMargin.left, barWidth - barMargin.right]);
        
    const yBar = d3.scaleBand()
        .domain(topFoods.map(d => d["Food product"]))
        .range([barMargin.top, barHeight - barMargin.bottom])
        .padding(0.2);

    const bars = svgBar.append("g").selectAll("rect")
        .data(topFoods)
        .join("rect")
        .attr("x", xBar(0))
        .attr("y", d => yBar(d["Food product"]))
        .attr("width", d => Math.max(0, xBar(d.Total_emissions) - xBar(0)))
        .attr("height", yBar.bandwidth())
        .style("cursor", "pointer")
        .attr("rx", 3);

    function updateBarStyles(hoveredFood) {
        bars.attr("opacity", d => (d === hoveredFood || (!hoveredFood && d === activeFood)) ? 1 : 0.3)
            .attr("fill", d => (d === hoveredFood || (!hoveredFood && d === activeFood)) ? "#e74c3c" : "#34495e");
    }

    bars.on("mouseenter", function(event, d) {
        updateBarStyles(d); 
        drawDonut(d);       
    })
    .on("mouseleave", function() {
        updateBarStyles(null); 
        drawDonut(activeFood); 
    })
    .on("click", function(event, d) {
        activeFood = d;        
        updateBarStyles(null); 
        drawDonut(activeFood); 
    });

    updateBarStyles(null); 

    svgBar.append("g").selectAll("text.val")
        .data(topFoods)
        .join("text")
        .attr("class", "val")
        .attr("x", d => xBar(d.Total_emissions) + 5)
        .attr("y", d => yBar(d["Food product"]) + yBar.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => d3.format(".1f")(d.Total_emissions))
        .style("font-size", "11px")
        .style("fill", "#333");

    svgBar.append("g")
        .attr("transform", `translate(0,${barHeight - barMargin.bottom})`)
        .call(d3.axisBottom(xBar).ticks(5))
        .append("text")
        .attr("x", barWidth - barMargin.right)
        .attr("y", 30)
        .attr("fill", "#666")
        .attr("text-anchor", "end")
        .text("kg CO₂eq / kg");

    svgBar.append("g")
        .attr("transform", `translate(${barMargin.left},0)`)
        .call(d3.axisLeft(yBar).tickSize(0))
        .select(".domain").remove();

    svgBar.selectAll(".tick text")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    const donutContainer = d3.select("#food-donut-container");
    donutContainer.selectAll("svg").remove();

    const dWidth = 350;
    const dHeight = 300;
    const radius = Math.min(dWidth, dHeight) / 2 - 10;

    const svgDonut = donutContainer.insert("svg", ":first-child")
        .attr("viewBox", [-dWidth / 2, -dHeight / 2, dWidth, dHeight])
        .attr("width", "100%")
        .attr("height", "100%");

    const pie = d3.pie().value(d => Math.max(0, d.value)).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
    const arcLabel = d3.arc().innerRadius(radius * 0.8).outerRadius(radius * 0.8);

    const centerTextGroup = svgDonut.append("g").attr("text-anchor", "middle");
    const titleText = centerTextGroup.append("text").attr("y", -10).style("font-size", "14px").style("font-weight", "bold").style("fill", "#333");
    const valueText = centerTextGroup.append("text").attr("y", 15).style("font-size", "22px").style("font-weight", "bold").style("fill", "#e74c3c");
    centerTextGroup.append("text").attr("y", 32).style("font-size", "11px").style("fill", "#666").text("kg CO₂eq");

    const arcsGroup = svgDonut.append("g");

    function drawDonut(foodItem) {
        const pieData = stages.map(stage => ({ key: stage, value: +foodItem[stage] || 0 }));
        
        titleText.text(foodItem["Food product"]);
        valueText.text(d3.format(".1f")(foodItem.Total_emissions));

        const paths = arcsGroup.selectAll("path").data(pie(pieData));
        paths.join("path")
            .attr("fill", d => color(d.data.key))
            .attr("d", arc)
            .attr("stroke", "white")
            .attr("stroke-width", "2px")
            .each(function(d) {
                d3.select(this).selectAll("title").remove();
                d3.select(this).append("title").text(`${stageLabels[d.data.key]} : ${d3.format(".2f")(d.data.value)} kg CO₂`);
            });

        arcsGroup.selectAll("text.slice-label")
            .data(pie(pieData))
            .join("text")
            .attr("class", "slice-label")
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "white")
            .style("pointer-events", "none")
            .text(d => d.data.value > (foodItem.Total_emissions * 0.05) ? d3.format(".1f")(d.data.value) : "");

        const legendContainer = d3.select("#food-donut-legend");
        legendContainer.html(""); 
        
        stages.forEach(stage => {
            const val = +foodItem[stage] || 0;
            const valStr = val > 0 ? d3.format(".2f")(val) + " kg" : "0 kg";
            
            const legendHtml = `
                <div style="display: flex; align-items: center; gap: 5px; background: #f8f9fa; padding: 4px 8px; border-radius: 12px; border: 1px solid #e0e0e0;">
                    <div style="width: 10px; height: 10px; background-color: ${color(stage)}; border-radius: 50%;"></div>
                    <span>${stageLabels[stage]}: <b style="color:#333;">${valStr}</b></span>
                </div>
            `;
            legendContainer.node().insertAdjacentHTML('beforeend', legendHtml);
        });
    }

    drawDonut(activeFood);
}