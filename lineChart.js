function drawLineChart() {
    const containerDiv = d3.select("#line-chart-container");
    containerDiv.selectAll("*").remove();
    d3.selectAll(".line-tooltip").remove(); 

    // Calcul dynamique
    const rect = containerDiv.node().getBoundingClientRect();
    const width = rect.width || 500; 
    const height = rect.height || 300;
    
    // Marges optimisées
    const margin = {top: 30, right: 20, bottom: 25, left: 45}; 

    const isTotal = selectedMetric === "Total (tonnes CO₂eq)";
    const getValue = d => isTotal ? d.emission_total : d.emission_share;
    const formatValue = isTotal ? d3.format(".2s") : d => d3.format(".1f")(d) + "%";
    const titleText = isTotal ? "Évolution des émissions totales" : "Évolution de la part liées à l’alimentation (%)";

    const tooltip = d3.select("body").append("div")
        .attr("class", "line-tooltip")
        .style("position", "absolute").style("visibility", "hidden")
        .style("background", "rgba(255,255,255,0.95)").style("border", "1px solid #ccc")
        .style("padding", "8px").style("border-radius", "4px").style("pointer-events", "none")
        .style("font-size", "12px").style("z-index", "9999").style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)");

    const svg = containerDiv.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "white");

    const filteredData = data.filter(d => selectedCountries.includes(d.id));

    if (selectedCountries.length === 0) {
        svg.append("text").attr("x", width/2).attr("y", height/2)
           .attr("text-anchor", "middle").attr("fill", "#666").text("Sélectionnez des pays sur la carte");
        return;
    }

    const x = d3.scaleLinear().domain([1990, 2015]).range([margin.left, width - margin.right]);
    const maxY = d3.max(filteredData, getValue) || (isTotal ? 1e6 : 100);
    const y = d3.scaleLinear().domain([0, maxY]).nice().range([height - margin.bottom, margin.top]);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(selectedCountries);

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
       .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(5));
    
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
       .call(d3.axisLeft(y).ticks(5, isTotal ? "s" : null));

    const groupedData = d3.group(filteredData, d => d.id);
     
    svg.append("g").selectAll("path")
       .data(groupedData).join("path")
       .attr("fill", "none").attr("stroke", d => color(d[0]))
       .attr("stroke-width", 2.5)
       .attr("d", d => d3.line().x(v => x(v.year)).y(v => y(getValue(v)))(d[1]));

    svg.append("text").attr("x", margin.left).attr("y", 15)
        .style("font-weight", "bold").style("font-size", "13px")
        .text(titleText);

    const verticalLine = svg.append("line").attr("stroke", "#999").attr("stroke-width", 1).attr("stroke-dasharray", "4")
        .attr("y1", margin.top).attr("y2", height - margin.bottom).style("opacity", 0);

    const mouseG = svg.append("g").style("opacity", 0);
    const mouseDots = mouseG.selectAll("circle")
        .data(selectedCountries).join("circle")
        .attr("r", 4).attr("fill", "white").attr("stroke", d => color(d)).attr("stroke-width", 2);

    svg.append("rect")
        .attr("width", width - margin.left - margin.right).attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left).attr("y", margin.top).attr("fill", "transparent")
        .on("mouseenter", () => { verticalLine.style("opacity", 1); mouseG.style("opacity", 1); tooltip.style("visibility", "visible"); })
        .on("mouseleave", () => { verticalLine.style("opacity", 0); mouseG.style("opacity", 0); tooltip.style("visibility", "hidden"); })
        .on("mousemove", (event) => {
            const [mouseX] = d3.pointer(event);
            const yearHovered = Math.round(x.invert(mouseX));
            if (yearHovered < 1990 || yearHovered > 2015) return;

            const yearData = filteredData.filter(d => d.year === yearHovered);
            verticalLine.attr("x1", x(yearHovered)).attr("x2", x(yearHovered));

            mouseDots.attr("cx", x(yearHovered)).attr("cy", id => {
                const countryData = yearData.find(d => d.id === id);
                return countryData ? y(getValue(countryData)) : -1000;
            });

            yearData.sort((a, b) => getValue(b) - getValue(a));
            
            let htmlContent = `<strong>${yearHovered}</strong><br/>`;
            yearData.forEach(d => { htmlContent += `<span style="color:${color(d.id)}">■ ${d.country}:</span> ${formatValue(getValue(d))}<br/>`; });

            tooltip.html(htmlContent).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px");
        });
}