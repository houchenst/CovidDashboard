// Add your JavaScript code here
const MAX_WIDTH = Math.max(1080, window.innerWidth);
const MAX_HEIGHT = 720;
const margin = {top: 40, right: 100, bottom: 40, left: 175};

let map_width = MAX_WIDTH/2 - 10, map_height = 500;

const GRAPH_COLOR = [7, 31, 184]

let filename = "./data/twitter/clean_tweets.csv"

// ---------------------------Map Setup---------------------------------
// Static elements only
let mapsvg = d3.select("#map")      // svg object for the map
    .append("svg")
    .attr("width", map_width)
    .attr("height", map_height)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

let maptitle = mapsvg.append("text")
    .attr("transform", `translate(${(map_width - margin.left - margin.right) / 2}, ${10})`)
    .style("text-anchor", "middle")
    .style("font-size", 25)
    .text("Just a Blank Map");

var tooltip = d3.select("#map").append("div") 
        .attr("class", "tooltip")       
        .style("opacity", 0);

var worldmap = d3.json("./data/countries.geojson")
var projection = d3.geoEquirectangular()
projection.translate([map_width/2 - margin.left, map_height/2 - margin.top]).scale(120).center([0,0]);
// projection.fitSize([graph_3_width, graph_3_height], worldmap)
var path = d3.geoPath().projection(projection);

d3.csv(filename).then(function(data){
    records = [];
    const bestRecord = Math.max(... records.map((d) => d.record));

    worldmap.then(function(values){    
        // draw map
        mapsvg.selectAll("path")
            .data(values.features)
            .enter()
            .append("path")
            .attr("class","continent")
            .attr("name", (d)=>d.properties.ADMIN)
            .attr("d", path)
            .style("fill", (d)=>countryColor(d.properties.ADMIN, records, bestRecord))
            .on("mouseover", function(d) {    
            tooltip.transition()    
            .duration(200)    
            .style("opacity", .9);    
            tooltip.html(makeToolTipContent(d.properties.ADMIN, records))  
            .style("left", (d3.event.pageX + 10) + "px")   
            .style("top", (d3.event.pageY - 110) + "px")
            .transition()    
            .duration(500)    
            .style("opacity", 1); 
            })          
            .on("mouseout", function(d) {   
                tooltip.transition()    
                .duration(500)    
                .style("opacity", 0); 
            });
            // for (let i = 0; i < values.features.length; i++) {
            //     console.log(values.features[i].properties.ADMIN)
            // }         
        });
});

function countryColor(country, records, max){

    // lowercase and remove whitespace
    country = countryCleaner(country.replace(/\s*/g, "").toLowerCase());

    let color = [161, 160, 157, 0.8]

    for (let i = 0; i < records.length; i++){
        if (country == records[i].country){
            color = [GRAPH_COLOR[0], GRAPH_COLOR[1], GRAPH_COLOR[2], records[i].record/max]
        }
    }
    colorString = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`
    return colorString
}

function makeToolTipContent(country, records){
    var container = document.createElement("div");
    let b = document.createElement("B");
    b.append(country)
    container.append(b);

    var fields = document.createElement("div");
    fields.className += "ttFields"
    country = countryCleaner(country.replace(/\s*/g, "").toLowerCase());
    let found = false
    for (let i =0; i < records.length; i++){
        if (records[i].country == country){
            found = true;
            fields.append(`Win Percentage: ${records[i].record.toFixed(1)}%`);
            fields.append(document.createElement("br"));
            fields.append(`Rank (by Win %): ${records[i].rank}`);
            fields.append(document.createElement("br"));
            fields.append(`Match Record: ${records[i].wins}-${records[i].losses}-${records[i].ties}`);
        }
    }
    if (!found){
        fields.append("No data available")
    }

    container.append(fields);


    return container.innerHTML
}

function countryCleaner(country){
    // if the country names don't line up right, remap them
    let dict = {
    "unitedstatesofamerica":"unitedstates",
    "china":"chinapr",
    "taiwan":"chinesetaipei",
    "unitedrepublicoftanzania":"tanzania",
    "democraticrepublicofthecongo":"drcongo",
    "republicofcongo":"congo",
    "republicofserbia":"serbia",
    "macedonia":"northmacedonia",
    "swaziland":"eswatini",
    "guineabissau":"guinea-bissau",
    "ireland":"republicofireland"
    };
    if (country in dict) {
        return dict[country]
    } else {
        return country
    }
}