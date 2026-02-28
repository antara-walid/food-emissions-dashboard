let data = [];
let geoData = {};
let faoData = [];
let foodData = [];

let currentYear = 2015;
let selectedMetric = "Total (tonnes CO₂eq)";
let selectedCountries = ["FRA", "USA", "CHN"];
let lastFocus = null;

const mapContainer = d3.select("#map-container");
const tooltip = d3.select("#tooltip");

Promise.all([
    d3.csv("merged_emissions_and_food_share_data.csv", d3.autoType),
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("fao_cleaned.csv", d3.autoType),
    d3.csv("Food_Production.csv", d3.autoType)
]).then(([csvData, mapData, faoRawData, foodRawData]) => {
    
    data = csvData.map(d => ({
        country: d.Entity,
        id: d.Code,  
        year: d.Year,
        emission_total: d["Greenhouse gas emissions from food"],
        emission_share: d["Share of total greenhouse gas emissions that come from food"]
    })).filter(d => d.id);

    geoData = mapData;
    faoData = faoRawData;
    foodData = foodRawData;

    updateAllCharts();
    drawFoodCharts();
    
    d3.select("#yearSlider").on("input", function() {
        currentYear = +this.value;
        d3.select("#yearDisplay").text(currentYear);
        updateAllCharts();
    });

    d3.selectAll("input[name='metric']").on("change", function() {
        selectedMetric = this.value;
        updateAllCharts();
    });
});

function updateAllCharts() {
    drawMap();
    drawStackedChart();
    drawLineChart();
    drawBarChart();
}