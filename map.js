function drawMap() {
    mapContainer.selectAll("svg").remove();

    const width = 800;
    const height = 400;
    const legendHeight = 20;
    const legendWidth = 300;

    const svg = mapContainer.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto")
        .style("background", "#f9f9f9")
        .style("border-radius", "8px");

    const isTotal = selectedMetric === "Total (tonnes CO₂eq)";
    const getValue = d => isTotal ? d.emission_total : d.emission_share;

    const projection = d3.geoMercator()
        .scale(100)
        .center([0, 20])
        .translate([width / 2, (height - 100) / 2]);
    const path = d3.geoPath().projection(projection);

    const currentData = data.filter(d => d.year === currentYear);
    const dataMap = new Map(currentData.map(d => [d.id, getValue(d)]));

    let domain = d3.extent(currentData, getValue);
    if (isTotal) {
        domain[0] = Math.max(100000, domain[0] || 100000); 
    } else {
        domain[0] = Math.max(0, domain[0]); 
        domain[1] = Math.min(100, domain[1]);
    }

    const colorScale = isTotal
        ? d3.scaleLog().domain(domain).range(["#e0f3db", "#0868ac"]).interpolate(d3.interpolateHcl)
        : d3.scaleLinear().domain([0,100]).range(["#feedde", "#a63603"]).clamp(true).interpolate(d3.interpolateHcl);

    const gMap = svg.append("g");

    gMap.selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const val = dataMap.get(d.id);
            return val != null ? colorScale(val) : "#e0e0e0";
        })
        .attr("stroke", d => selectedCountries.includes(d.id) ? "#333" : "white")
        .attr("stroke-width", d => selectedCountries.includes(d.id) ? 2 : 0.5)
        .style("cursor", "pointer")
        .on("mouseenter", function() {
            d3.select(this).style("opacity", 0.7);
            tooltip.style("visibility", "visible");
        })
        .on("mousemove", function(event, d) {
            const val = dataMap.get(d.id);
            const name = d.properties.name;
            
            let textVal = "Pas de données";
            if (val != null) {
                if (isTotal) {
                    textVal = `${d3.format(".2s")(val).replace("G", "Md")} t CO₂eq`;
                } else {
                    textVal = `${d3.format(".1f")(val)} %`;
                }
            }

            const [mouseX, mouseY] = d3.pointer(event, mapContainer.node());
            
            tooltip.html(`<strong>${name}</strong><br/>${textVal}`)
                    .style("left", (mouseX + 15) + "px")
                    .style("top", (mouseY + 15) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).style("opacity", 1);
            tooltip.style("visibility", "hidden");
        })
        .on("click", (event, d) => {
            const val = dataMap.get(d.id);
            const name = d.properties.name;
            const code = d.id;

            if (selectedCountries.includes(code)) {
                selectedCountries = selectedCountries.filter(c => c !== code);
            } else {
                selectedCountries.push(code);
            }
            
            lastFocus = { id: code, name: name, value: val };
            
            updateAllCharts();
        });

    const infoGroup = svg.append("g").attr("transform", `translate(20, 20)`);
    const infoTitle = infoGroup.append("text").attr("font-weight", "bold").attr("font-size", "18px").attr("fill", "#333").text("Sélectionnez un pays...");
    const infoValue = infoGroup.append("text").attr("y", 25).attr("font-size", "14px").attr("fill", "#333").text("");

    function drawInfo(name, value) {
        infoTitle.text(name);
        if (value != null) {
            if (isTotal) {
                const formatted = d3.format(".2s")(value).replace("G", "Md");
                infoValue.text(`Émissions : ${formatted} tonnes CO₂eq`);
            } else {
                infoValue.text(`Part agricole : ${d3.format(".1f")(value)} %`);
            }
        } else {
            infoValue.text("Pas de données pour cette année");
        }
    }

    const legendGroup = svg.append("g").attr("transform", `translate(${(width - legendWidth) / 2}, ${height - 60})`);
    const getGradientValue = (pct) => isTotal 
        ? domain[0] * Math.pow(domain[1]/domain[0], pct)
        : domain[0] + pct * (domain[1] - domain[0]);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "grad");
    linearGradient.selectAll("stop").data(d3.range(0, 1.1, 0.1)).enter().append("stop")
        .attr("offset", d => d).attr("stop-color", d => colorScale(getGradientValue(d)));

    legendGroup.append("rect").attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#grad)").attr("rx", 5);

    const legendScalePos = isTotal 
        ? d3.scaleLog().domain(domain).range([0, legendWidth])
        : d3.scaleLinear().domain(domain).range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScalePos).ticks(5, isTotal ? ".0s" : ".0f");
    legendGroup.append("g").attr("transform", `translate(0, ${legendHeight})`).call(legendAxis).select(".domain").remove();

    const cursor = legendGroup.append("g").attr("opacity", 0);
    cursor.append("path").attr("d", d3.symbol().type(d3.symbolTriangle).size(100)).attr("transform", "rotate(180)").attr("fill", "#333").attr("stroke", "white");
    const cursorText = cursor.append("text").attr("y", -10).attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold").attr("fill", "#333");

    function drawCursor(value, name) {
        if (value == null) { cursor.attr("opacity", 0); return; }
        let safeValue = value;
        if (!isTotal) { safeValue = Math.max(0, Math.min(100, value)); }
        else { safeValue = Math.max(domain[0], Math.min(domain[1], value)); }

        const x = legendScalePos(safeValue);
        cursor.attr("opacity", 1).attr("transform", `translate(${x}, 0)`);
        cursorText.text(name);
    }

    if (lastFocus) {
        const currentVal = dataMap.get(lastFocus.id);
        drawInfo(lastFocus.name, currentVal);
        drawCursor(currentVal, lastFocus.name);
    }
}