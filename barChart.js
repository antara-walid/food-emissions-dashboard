function drawBarChart() {
    const containerDiv = d3.select("#bar-chart-container");
    containerDiv.selectAll("*").remove();

    const containerWidth = containerDiv.node().getBoundingClientRect().width || 400;

    const isTotal = selectedMetric === "Total (tonnes CO₂eq)";
    const getValue = d => isTotal ? d.emission_total : d.emission_share;
    const formatValue = isTotal ? d3.format(".2s") : d => d3.format(".1f")(d) + "%";

    let barData = data.filter(d => d.year === currentYear && selectedCountries.includes(d.id));
    
    barData.sort((a, b) => getValue(b) - getValue(a));

    const margin = {top: 30, right: 60, bottom: 10, left: 100};
    const width = containerWidth; 
    const contentHeight = Math.max(50, barData.length * 35); 
    const height = contentHeight + margin.top + margin.bottom;

    const svg = containerDiv.append("svg")
        .attr("width", width).attr("height", height)
        .style("background", "white").style("border-radius", "8px");

    if (barData.length === 0) {
        svg.append("text").attr("x", width/2).attr("y", height/2)
           .attr("text-anchor", "middle").attr("fill", "#999")
           .text("Pas de données");
        return;
    }

    const x = d3.scaleLinear()
        .domain([0, d3.max(barData, getValue)]) 
        .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
        .domain(barData.map(d => d.country))
        .range([margin.top, height - margin.bottom])
        .padding(0.3);

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(selectedCountries);

    svg.append("g").selectAll("rect")
       .data(barData).join("rect")
       .attr("x", x(0))
       .attr("y", d => y(d.country))
       .attr("width", d => Math.abs(x(getValue(d)) - x(0)))
       .attr("height", y.bandwidth())
       .attr("fill", d => color(d.id))
       .attr("rx", 3);

    svg.append("g").selectAll("text")
       .data(barData).join("text")
       .attr("x", d => x(getValue(d)) + 5)
       .attr("y", d => y(d.country) + y.bandwidth() / 2)
       .attr("dy", "0.35em")
       .text(d => formatValue(getValue(d)))
       .style("font-size", "11px").style("fill", "#333");

    svg.append("g").attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
     
    svg.append("text")
        .attr("x", margin.left)
        .attr("y", 20)
        .style("font-weight", "bold").style("font-size", "14px")
        .text(`Classement en ${currentYear}`);
}