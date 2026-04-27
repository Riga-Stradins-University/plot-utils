function makeMultiLinePlot(containerId, data, groups, labelMapping, {
                                                titlePrefix="Sieviešu %",
                                                titleSuffix="vidū",
                                                hoverWomen="sievietes",
                                                hoverUnit="darbinieki", 
                                                yAxisTitle="Darbinieku %",
                                                maleHoverName="vīrieši",
                                                femaleHoverName="sievietes",
                                                plotTitle="",
                                                unitStr="%",
                                                yRange = [0,100],
                                            }) {
    const added_string = groups.map(g => labelMapping[g] || g).join(", ")
    const jitterAmount = 0.1

    const traces = [];
    const allX = new Set(); // collect unique x vals across groups

    const plotTitleStr = plotTitle===""
                ? `${titlePrefix} ${added_string} ${titleSuffix}`
                : plotTitle;

    groups.forEach(group => {
        const groupData = data[group];
        if (!groupData) return;

        groupData.x.forEach(x => allX.add(x)); // collect unique x

        // detect series keys automatically
        const seriesKeys = Object.keys(groupData)
            .filter(k => !["x", "name", "total"].includes(k));

        // case 1: single y series
        if (seriesKeys.length === 1 && seriesKeys[0] === "y"){
            const totals = groupData.total;
            const meanTotal = totals.reduce((a, b) => a + b, 0) / totals.length;
            const markerSizes = totals.map(n => 160 + (((n / meanTotal) - 1) * 400));

            traces.push({
                x: groupData.x.map(Number),
                y: groupData.y,
                mode: "lines+markers",
                name: groupData.name || group,
                marker: {
                    size: markerSizes,
                    sizemode: "area",
                    opacity: 0.5,
                    color: PALETTE[0],
                    line: {width:1, color:"#cccccc"}
                },
                line: {width:4, color:PALETTE[0]},
                customdata: totals,
                hovertemplate: `%{y:.0f} ${unitStr} ${hoverWomen}<br>%{customdata} ${hoverUnit}<extra></extra>`
                });
        }

        // case 2: multiple series with custom names
        else {
            const seriesLabelMap = {
                    female: femaleHoverName,
                    male: maleHoverName
                };
            seriesKeys.forEach((key, keyIndex) => {
                const label = seriesLabelMap[key] || key; 
                const jitteredX = groupData.x.map(x => Number(x) - 0.05 + (keyIndex * jitterAmount));
                const traceClr = PALETTE[keyIndex % PALETTE.length];
                const lineStyle = LINESTYLES[keyIndex % LINESTYLES.length];

                traces.push({
                    x: jitteredX,
                    y: groupData[key],
                    mode: "lines+markers",
                    name: label,
                    marker: {
                        size: 20,
                        opacity: 0.5,
                        color: traceClr,
                        line: {width:1, color:"#cccccc"}
                    },
                    line: {width:4, color:traceClr, dash: lineStyle},
                    hovertemplate: `%{y:.0f} ${unitStr} ${label}<extra></extra>`
                    });
                });
            }
    });

    // deal with the legend
    if (traces.length > 1) {
        annotLayout = traces.map((tr, i) => ({
            x: 0.02,
            y: 0.98 - i * 0.06,
            xref: "paper",
            yref: "paper",
            showarrow: false,
            text: `● ${tr.name}`,
            xanchor: "left",
            align: "left",
            font: {
                size: 16,
                color: tr.line?.color || "#000",
                family: "Arial, sans-serif"
            }
        }));
    } else {
        // hide legend if only one trace
        annotLayout = [];
    }

    const xVals = Array.from(allX).sort();
    const layout = {
        title: {
            text: plotTitleStr, 
            font: {size:16, family:"Arial, sans-serif", color:"#000"}
        },
        xaxis: {
            tickfont:{size:16, family:"Arial, sans-serif"}, 
            type:'linear',
            tickvals: xVals.map(Number),
            ticktext: xVals.map(String),
        },
        yaxis: {
            title:{text:yAxisTitle, font:{size:16, family:"Arial, sans-serif"}}, 
            tickfont:{size:16, family:"Arial, sans-serif"}, 
            range:yRange
        },
        // legend: legendLayout,
        showlegend: false,

        annotations: annotLayout
    };
    
    
    Plotly.react(containerId, traces, layout, {responsive:true});
}

function makeSimpleBarplot(containerId, dataDict, options={}){
    // the following can be edited externally through the options variable
    const {
        orientation = 'h',              // bar orientation ('h' or 'v')
        title = '',
        referenceLines = [],            // num array for vertical (h) or horizontal (v) dashed lines
        highlightLabel = '',            // optionally highlight bars that include this string
        highlightClr = PALETTE[0],      // color for highlighted bars
        barClr = PALETTE[1],            // default bar color
        xRange = null,                  // [min, max] for x-axis
        yRange = null,                  // [min, max] for y-axis
        xLabel = '',
        yLabel = '',
        hoverStr = '',                  // shows min-max
    } = options;

    const labels = Object.keys(dataDict);
    const hoverTemplate = `%{x} – %{y} ${hoverStr}<extra></extra>`

    const traces = labels.map(label => {
        const coords = dataDict[label];  // [min, max]
        const isHighlight = highlightLabel && label.includes(highlightLabel);
        if (orientation === 'h') {
            return {
                x: coords,  // [min, max]
                y: [label, label],
                mode: 'lines',
                line: { width: 8, color: isHighlight ? highlightClr : barClr },
                showlegend: false,
                hovertemplate: hoverTemplate.replace('%{x}', coords[0]).replace('%{y}', coords[1])
            };
        } else {
            return {
                x: [label, label],
                y: coords,
                mode: 'lines',
                line: { width: 10, color: isHighlight ? highlightClr : barClr },
                showlegend: false,
                hovertemplate: hoverTemplate.replace('%{x}', coords[0]).replace('%{y}', coords[1])
            };
        }
    });

    // add reference lines
    const shapes = referenceLines.map(val => orientation === 'h'
        ? { type: 'line', x0: val, x1: val, y0: -0.5, y1: labels.length - 0.5, line: { color: 'grey', width: 1, dash: 'dash' } }
        : { type: 'line', x0: -0.5, x1: labels.length - 0.5, y0: val, y1: val, line: { color: 'grey', width: 1, dash: 'dash' } }
    );

    const layout = {
            title: title,
            xaxis: orientation === 'h' 
                ? { 
                    range: xRange,
                    title:{text:xLabel, font:{size:16, family:"Arial, sans-serif"}},
                    tickfont:{size:16, family:"Arial, sans-serif"}, 
                 } 
                : { 
                    categoryorder: "array", 
                    categoryarray: labels, 
                    range: xRange,
                    title:{text:xLabel, font:{size:16, family:"Arial, sans-serif"}},
                    tickfont:{size:16, family:"Arial, sans-serif"}, 
                 },
            yaxis: orientation === 'h' 
                ? { 
                    categoryorder: "array", 
                    categoryarray: labels, 
                    range: yRange,
                    title:{text:yLabel, font:{size:16, family:"Arial, sans-serif"}},
                    tickfont:{size:16, family:"Arial, sans-serif"}, 
                 } 
                : { 
                    range: yRange,
                    title:{text:yLabel, font:{size:16, family:"Arial, sans-serif"}},
                    tickfont:{size:16, family:"Arial, sans-serif"}, 
                 },
            shapes: shapes,
            margin: { t: 40, b: 80, l: 150, r: 40 },
            plot_bgcolor: 'white'
        };

    // reactive rendering: will create a new plot if container empty, or update if exists
    if (document.getElementById(containerId).data) {
        Plotly.react(containerId, traces, layout, {responsive: true});
    } else {
        Plotly.newPlot(containerId, traces, layout, {responsive: true});
    }
}

function makeBarPlot(containerId, data, group, {femaleHoverName, maleHoverName, plotTitle, ylabel}) {
      // legacy code - not used atm
      const female_trace = {
        x: data[group].x.map(String),
        y: data[group].female,
        type: "bar",
        name: `${femaleHoverName}`,
        marker: {
          color: PALETTE[0]
        },
        hovertemplate: `%{y:.0f} EUR`
      };

      const male_trace = {
        x: data[group].x.map(String),
        y: data[group].male,
        type: "bar",
        name: `${maleHoverName}`,
        marker: {
          color: PALETTE[1]
        },
        hovertemplate: `%{y:.0f} EUR`
      };

      const layout = {
        barmode: 'group',  // this makes bars side-by-side
        bargroupgap: 0.1, // gap between within-group
        title: {text: `${plotTitle}`, font: { size: 16, family: "Arial, sans-serif" }},
        xaxis: {tickfont: {size: 16}},
        yaxis: {title: {text: `${ylabel} (EUR)`, font: {size: 16}}, tickfont: {size: 16}, range: [0, 2800]},
        legend: {
            orientation: 'h',
            x: 0.5,
            y: 1.05,
            xanchor: 'center',
            yanchor: 'bottom',
             font: {                 
                    size: 14,          
                    family: "Arial, sans-serif",
                    color: "#000000"    
                }
        }
    };
      Plotly.react(containerId, [female_trace, male_trace], layout, {responsive: true});
    }


function populateSelect(selectId, labels, defaultValue) {
    const select = document.getElementById(selectId);
    select.innerHTML = ""; // clear existing options

    Object.entries(labels).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    });

    if (defaultValue) {
        select.value = defaultValue;
    }
}

function subsetLabelsByData(data, labels) {
    return Object.fromEntries(
        Object.keys(data)
        .filter(key => labels[key])   
        .map(key => [key, labels[key]])
    );
}
