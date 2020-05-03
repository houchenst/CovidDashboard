// Add your JavaScript code here
const MAX_WIDTH = Math.max(1080, window.innerWidth);
const MAX_HEIGHT = 720;
const margin = {top: 40, right: 100, bottom: 40, left: 175};
const ONE_DAY = 1000 * 60 * 60 * 24;
const title_text = {"retail_rec": "Retail & Recreation", "grocery_pharmacy": "Grocery & Pharmacy", "parks": "Parks", "transit_stations": "Transit Station", "workplaces": "Workplaces", "residential": "Residential"};
const input_to_field = {"retailrecreation" : "retail_rec", "retailamprecreation" : "retail_rec", "grocerypharmacy":"grocery_pharmacy", "groceryamppharmacy" : "grocery_pharmacy", "parks": "parks", "transitstation" : "transit_stations", "workplace" : "workplaces", "residential" : "residential"};
let map_width = MAX_WIDTH - 50, map_height = 600;

let filename = "./data/Global_Mobility_Report.csv"

// initial field
var curr_field = "workplaces";
var curr_date;
var isWorld = false;

var num_days;
var min_day;

$(document).ready(function(){
    // ---------------------------Map Setup---------------------------------
    // Static elements only
    let mapsvg = d3.select("#map")      // svg object for the map
        .append("svg")
        .attr("width", map_width)
        .attr("height", map_height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let maptitle = mapsvg.append("text")
        .attr("transform", `translate(${(map_width - margin.left - margin.right) / 2}, ${-10})`)
        .style("text-anchor", "middle")
        .style("font-size", 25);

    var tooltip = d3.select("#map").append("div") 
            .attr("class", "tooltip")       
            .style("opacity", 0);
    
    var sliderDate = d3.select("#map-slider-box")
            .append("svg")
            .attr("width", MAX_WIDTH*0.8)
            .attr("height", "80px")
            .append("text")

    let dateX = d3.scaleLinear()
    .range([25, MAX_WIDTH*0.8 - 55]);

    var usmap = d3.json("./data/states.geojson");
    var usprojection = d3.geoAlbersUsa()
				   .translate([map_width/2-150, map_height/2])    // translate to center of screen
                   .scale([1000]);        // scale things down so see entire US
    var uspath = d3.geoPath().projection(usprojection);

    var worldmap = d3.json("./data/countries.geojson")
    var worldprojection = d3.geoEquirectangular()
    worldprojection.translate([map_width/2 - margin.left, map_height/2 - margin.top]).scale(200).center([0,10]);
    // projection.fitSize([graph_3_width, graph_3_height], worldmap)
    var worldpath = d3.geoPath().projection(worldprojection);


    // -----------Redraw the map with a given field------------------------
    function updateMap(){
        d3.csv(filename).then(function(data){
            maptitle.text(`Percent Change in Visitation to ${title_text[curr_field]} Locations`);
            let records = cleanMobilityData(data);
            // const bestRecord = Math.min(... records.map((d) => d[field]));
            (isWorld ? worldmap : usmap).then(function(values){
                let countries = mapsvg.selectAll("path")
                .data(values.features);
                // draw map
                    countries.enter()
                    .append("path")
                    .merge(countries)
                    .attr("class","continent")
                    .attr("name", isWorld ? (d)=>d.properties.ADMIN : (d)=>d.properties.name)
                    .attr("d", isWorld ? worldpath : uspath)
                    .style("fill", (d)=>countryColor(( isWorld ? d.properties.ISO_A2 : d.properties.name), records, curr_field))
                    .on("mouseover", (d) => ttOn(d, records))          
                    .on("mouseout", ttOff);
                    // for (let i = 0; i < values.features.length; i++) {
                    //     console.log(values.features[i].properties.ADMIN)
                    // }         
                });
        });
    }

    function ttOn(d, records){  
            // tooltip width is 340 px
            let xMod = 10;
            // console.log("event".concat(String(d3.event.pageX)))
            if (d3.event.pageX > map_width - 350){
                xMod = -350;
            }
            tooltip.transition()
            .duration(100)
            .style("background-color", "rgba(240,240,240,0.8");    
            tooltip.html(makeToolTipContent(isWorld ? d.properties.ADMIN : d.properties.name, isWorld ? d.properties.ISO_A2 : d.properties.name, records))  
            .style("left", (d3.event.pageX + xMod) + "px")   
            .style("top", (d3.event.pageY - 160) + "px")
            .style("opacity", 1);
    }

    function ttOff(d){ 
            tooltip.transition()    
            .duration(100)    
            .style("opacity", 0)
            // tooltip.html("")
            .style("left", 0)
            .style("top", 0);
    }

    function cleanMobilityData(data){
        let output = []
        // retail_and_recreation_percent_change_from_baseline	grocery_and_pharmacy_percent_change_from_baseline	parks_percent_change_from_baseline	transit_stations_percent_change_from_baseline	workplaces_percent_change_from_baseline	residential_percent_change_from_baseline
        for (let i=0; i < data.length; i++){
            let dp = data[i];
            if (((isWorld && dp["sub_region_1"] === "") || (!isWorld && dp["country_region_code"] === "US" && dp["sub_region_1"] != "" && dp["sub_region_2"] === "")) && (dp["date"] === curr_date)){
                new_point = {}
                new_point["country_code"] = dp["country_region_code"].replace(/[^A-z]*/g, "").toLowerCase();
                new_point["state"] = dp["sub_region_1"].replace(/[^A-z]*/g, "").toLowerCase();
                new_point["retail_rec"] = dp["retail_and_recreation_percent_change_from_baseline"];
                new_point["grocery_pharmacy"] = dp["grocery_and_pharmacy_percent_change_from_baseline"];
                new_point["parks"] = dp["parks_percent_change_from_baseline"];
                new_point["transit_stations"] = dp["transit_stations_percent_change_from_baseline"];
                new_point["workplaces"] = dp["workplaces_percent_change_from_baseline"];
                new_point["residential"] = dp["residential_percent_change_from_baseline"];
                output.push(new_point);
            }
        }
        return output;
    }

    function countryColor(country, records, field){
        // lowercase and remove whitespace
        country = country.replace(/[^A-z]*/g, "").toLowerCase();
        const goodColor = [7, 31, 184]
        const badColor = [255,104,0]

        let noData = [161, 160, 157, 0.8]
        let color = noData

        for (let i = 0; i < records.length; i++){
            if ((isWorld && country === records[i].country_code) || (!isWorld && country === records[i].state)){
                if (records[i][field] <= 0){
                    color = [goodColor[0], goodColor[1], goodColor[2], (-records[i][field]*0.9 + 10)/100];
                } else{
                    color = [badColor[0], badColor[1], badColor[2], (records[i][field]*0.9 + 10)/100];
                }
            }
        }
        colorString = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`
        return colorString
    }

    // function to make the tool tip html
    function makeToolTipContent(country, country_code, records){
        // create tooltip container
        country_code = country_code.replace(/[^A-z]*/g, "").toLowerCase();
        var container = document.createElement("div");
        let b = document.createElement("B");
        b.append(country)
        container.append(b);

        // list of fields to display
        let all_fields = [["retail_rec", "Retail & Recreation"], ["grocery_pharmacy", "Grocery & Pharmacy"], ["parks", "Parks"], ["transit_stations", "Transit Station"], ["workplaces", "Workplaces"], ["residential", "Residential"]];
        
        // populate with info about country
        var fields = document.createElement("div");
        fields.className =  "map-tt-fields";

        let found = false
        for (let i =0; i < records.length; i++){
            console.log()
            if ((isWorld && country_code === records[i].country_code) || (!isWorld && country_code === records[i].state)){
                found = true;
                //display date
                let date_el = document.createElement("div");
                date_el.className = "map-tt-row";
                date_el.innerHTML = curr_date;
                fields.append(date_el);

                // create header for the info fields
                let fieldHead = document.createElement("div");
                fieldHead.className =  "map-tt-row map-tt-head";
                let fieldHeadLeftft = document.createElement("div");
                let fieldHeadRight = document.createElement("div");
                fieldHeadImBoxPlaceholder = document.createElement("div");
                fieldHeadLeftft.className =  "map-tt-left-col";
                fieldHeadLeftft.innerHTML = "Location Type";
                fieldHeadRight.className = "map-tt-right-col";
                fieldHeadRight.innerHTML = "Change in Visitation";
                fieldHeadImBoxPlaceholder.className = "map-tt-im-box";

                fieldHead.append(fieldHeadLeftft);
                fieldHead.append(fieldHeadRight);
                fieldHead.append(fieldHeadImBoxPlaceholder);
                fields.append(fieldHead);

                // add plot image
                let imBox = document.createElement("div");
                imBox.className = "map-tt-im-box"

                // add all the fields
                for (loc_type of all_fields){
                    let bo = "Blue";
                    let ud = "Down";
                    if (records[i][loc_type[0]] > 0){
                        bo = "Orange";
                        ud = "Up";
                    }
                    let new_row = makeToolTipRow(bo, ud, loc_type[0], loc_type[1], records[i][loc_type[0]])
                    fields.append(new_row)
                }
            }
        }
        // If no data is available, say so
        if (!found){
            fields.append("No data available")
        }
        // add the fields to the container
        container.append(fields);

        return container.innerHTML;
    }

    // helper function to make tool tip elements
    function makeToolTipRow(blueOrOrange, upOrDown, field, display_name, change){
        let rowLeft = document.createElement("div");
        let rowRight = document.createElement("div");
        let rowImBox = document.createElement("div");
        rowLeft.className = "map-tt-left-col";
        rowLeft.innerHTML = display_name;
        rowRight.className =  "map-tt-right-col".concat((blueOrOrange === "Blue") ? " blue-text" : " orange-text");
        rowRight.innerHTML = (change > 0 ? "+" : "").concat(String(change),"%");
        // add the image
        rowImBox.className = "map-tt-im-box";
        let rowIm = document.createElement("img");
        rowIm.className = "map-tt-im"
        rowIm.src = "./images/".concat(blueOrOrange, upOrDown, "arrow.png");
        rowImBox.append(rowIm);
        // add elts to row container div
        let newRow = document.createElement("div");
        newRow.className =  "map-tt-row";
        newRow.append(rowLeft);
        newRow.append(rowRight);
        newRow.append(rowImBox);

        return newRow;
    }

    // gets the date given an offset from the start date (min_day)
    function daysToDate(days){
        let newDate = new Date(min_day.getTime() + parseInt($("#mapDate").val())*ONE_DAY);
        return `${newDate.getMonth()+1}/${newDate.getDate()}/${newDate.getFullYear() % 100}`;
    }


    // Create slider and make update map call
    d3.csv(filename).then(function(data){
        date_strings = data.map((d)=>d["date"]);
        data = data.map(function(d){
            let elts = d["date"].split("/");
            return new Date(2000 + parseInt(elts[2]), parseInt(elts[0]) - 1, parseInt(elts[1]));
        });

        let len = data.length;
        let min_mills = Infinity;
        let max_mills = -Infinity;
        
        while (len--) {
            max_mills = data[len].getTime() > max_mills ? data[len].getTime() : max_mills;
            min_mills = data[len].getTime() < min_mills ? data[len].getTime() : min_mills;
        }


        min_day = new Date(min_mills);
        num_days = Math.round((max_mills - min_mills)/ONE_DAY);

        // update the scale for the num days
        dateX.domain([0, num_days]);
        
        $("#mapDate").attr({
            "max": num_days,
            "min": 0,
            "step": 1,
            "value": num_days,
        });
        updateDateAndMap();
    });

    // bind callback to slider
    $(document).on('input', '#mapDate', updateDateAndMap);

    function updateDateAndMap(){
        let days = $("#mapDate").val();
        curr_date = daysToDate(days);
        sliderDate.attr("transform", `translate(${dateX(days)}, ${30}) rotate(-45)`)
        .style("text-anchor", "middle")
        .text(curr_date);
        updateMap(curr_field, curr_date);
    }

    // bind actions to field buttons in dropdown #1
    $( ".field-opt" ).each(function(index) {
        $(this).on("click", function(){
            // change the dropdown value to reflect new stat
            $("#statDropdown").html($(this).html());
            curr_field = input_to_field[$(this).html().replace(/[^A-z]*/g, "").toLowerCase()];
            updateDateAndMap();
        });
    });

    //bind actions to map toggling dropdown
    // bind actions to field buttons in dropdown #1
    $( ".map-toggle" ).each(function(index) {
        $(this).on("click", function(){
            // change the dropdown value to reflect new stat
            $("#regionDropdown").html($(this).html());
            let old_status = isWorld;
            isWorld = $(this).html().replace(/[^A-z]*/g, "").toLowerCase() === "world";
            if (isWorld != old_status){
                mapsvg.selectAll("path").remove();
                updateDateAndMap();
            }
        });
    });

});