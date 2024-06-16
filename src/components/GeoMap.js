import {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import {russia, ship_by_name, nodes, points} from "./utils";
import hexbin from './hexbin'
import * as topojson from "topojson-client";
import './GeoMap.css'

let clickedId = -1

function getWindowDimensions() {
    const {innerWidth: width, innerHeight: height} = window;
    return {
        width,
        height
    };
}

export function useWindowDimensions() {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

    useEffect(() => {
        function handleResize() {
            setWindowDimensions(getWindowDimensions());
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowDimensions;
}

function splitArray(input) {
    let output = [];

    for (let i = 0; i < input.length - 1; i += 1) {
        output[output.length] = {cor: input.slice(i, i + 2), i: i}
    }

    return output;
}

export default function GeoMap({ships}) {
    const {height, width} = useWindowDimensions();
    const [{svg, projection}, setSvg] = useState({svg: null, projection: null})
    const [borders, setBorders] = useState([-width / 4.5, height / 2.5])
    const [{x, y, k}, setTransform] = useState({x: 0, y: 0, k: 1.15})
    const ref = useRef()

    useEffect(() => {
        setBorders([-width / 4.5, height / 2.5])
    }, [height, width])

    useEffect(() => {
            if (borders.length) {
                console.log(nodes)
                let svg = d3.select(ref.current)
                    .attr("viewBox", [0, 0, width, height])
                    .attr("width", width)
                    .attr("height", height)
                    .attr("style", `max-width: 100%; height: auto; background: ${'rgba(0,232,255,0)'};`)

                function zoomed(event) {
                    const {transform} = event;
                    let {x, y, k} = transform
                    setTransform({x, y, k})
                    x = Math.max(Math.min(x, borders[0] * k), borders[0] - width * k + width * 1.15)
                    y = Math.max(Math.min(y, borders[1] * k), borders[1] - height * k + height * 1.15)
                    transform.x = x
                    transform.y = y
                    // g.attr("transform", transform)
                    svg.select('path.russia').attr("transform", transform)
                    svg.selectAll(".node").attr("transform",
                        d => {
                            let pro = projection([...d.coordinates])
                            return `translate(${[x, y]}),scale(${k}),translate(${[(pro[0]), (pro[1])]})`
                        });
                    // gp1.attr("transform",
                    //     d => {
                    //         return `translate(${[x, y]}),scale(${k}),translate(${[d[0], d[1]]})`
                    //     });
                    svg.selectAll('path.hexagon').attr("transform",
                        d => {
                            return `translate(${[x, y]}),scale(${k}),translate(${[(d.x), (d.y)]})`
                        });
                    svg.selectAll("line").attr("transform", transform)
                }

                const zoom = d3.zoom()
                    .scaleExtent([1.15, 8])
                    .on("zoom", zoomed);

                var projection = d3.geoTransverseMercator()
                    .rotate([-105, 0])
                    .center([0, 0])
                    .fitExtent([[0, 0], [width, height]], topojson.feature(russia, russia.objects.russia))
                // .precision(.5);


                svg.call(zoom);

                let path = d3.geoPath()
                    .projection(projection);


                function clicked(event, d) {
                    if (d.id === clickedId) {
                        svg.transition().duration(750).call(
                            zoom.transform,
                            d3.zoomIdentity.scale(1.15),
                            d3.pointer(event)
                        );
                    } else {
                        clickedId = d.id
                        let f = projection([...d.coordinates])
                        // event.stopPropagation();
                        svg.transition().duration(750).call(
                            zoom.transform,
                            d3.zoomIdentity.translate(width / 2, height / 2).scale(3).translate(-f[0], -f[1]),
                            d3.pointer(event)
                        );
                    }
                }


                let pointsForGrid = points.map(p => [...projection([p[0], p[1]]), p[2]])

                let allX = pointsForGrid.map(p => p[0])
                let allY = pointsForGrid.map(p => p[1])
                let b = [[Math.min(...allX), Math.min(...allY)], [Math.max(...allX), Math.max(...allY)]]

                let p = []

                let n = 10
                let d = (b[1][0] - b[0][0]) / (n - 1)

                let m = Math.floor((b[1][1] - b[0][1]) / d) + 1


                let x0 = b[0][0];
                let y0 = b[0][1];

                // let array = Array(n).fill(0).map(() => Array(m).fill(-10))

                // for (let k = 0; k < pointsForGrid.length; k++) {
                //     let [x, y, v] = pointsForGrid[k];
                //     let i = Math.round((x - x0) / d)
                //     let j = Math.round((y - y0) / d)
                //     array[i][j] = [x0 + d * i, y0 + j * d, v]
                // }
                // let newArray = array[0].map((_, colIndex) => array.map(row => row[colIndex]));


                // let contours = d3.contours().size([n, m]).thresholds([-10, 0, 10, 20]);
                // const polygons = contours(newArray.flat().map(e => (e === -10 ? e : e[2])));

                //  371.6153564453125
                //  394
                // console.log(height/projection.scale()/1.15)

                // let pv = p.map(p => p[2])


                // console.log(array.flat().filter(e => e!==-10))

                const gp1 = svg.selectAll(".pin")
                    // .data(array.flat().filter(e => e !== -10))
                    .enter().append("circle", ".pin")
                    .attr("r", 2)
                    .attr("transform", d => "translate(" + d[0], d[1] + ")")
                    .attr("fill", (d) => color2(d[2]))


                function color2(v) {
                    if (v < 0) return 'rgba(255,255,255,0)'
                    if (v < 10) return 'rgb(255,255,255)'
                    if (v < 12) return 'rgb(227,238,255)'
                    if (v < 20) return 'rgb(186,222,255)'
                    return 'rgb(147,206,255)'
                }


                const hex = hexbin()
                    .x(d => d[0])
                    .y(d => d[1])
                    .radius(7)

                pointsForGrid = hex(pointsForGrid.filter(e => e[2] > 10))
                    .map(b => {
                        b.color = color2(b.map(e => e[2]).reduce((a, b) => a + b, 0) / b.length);
                        return b
                    })

                console.log(width / n)

                svg.append("g")
                    .selectAll("path")
                    .data(pointsForGrid)
                    .enter().append("path")
                    .attr('class', 'hexagon')
                    .attr("transform", d => `translate(${d.x},${d.y})`)
                    .attr("d", hex.hexagon())
                    .attr("fill", b => b.color)
                    .attr("stroke", b => b.color);

                svg.append("path")
                    .attr('class', 'russia')
                    .datum(topojson.feature(russia, russia.objects.russia))
                    .attr("d", path)
                    .attr("fill", 'rgb(208,208,208)');


                svg.selectAll("line")
                    .enter().append("g")
                    // .data(edges)
                    .join("line")
                    .attr("stroke", "rgb(255,255,255)")
                    .attr("stroke-opacity", 1)
                    .attr("x1", d => projection([nodes[d.source].coordinates[0], nodes[d.source].coordinates[1]])[0])
                    .attr("y1", d => projection([nodes[d.source].coordinates[0], nodes[d.source].coordinates[1]])[1])
                    .attr("x2", d => projection([nodes[d.target].coordinates[0], nodes[d.target].coordinates[1]])[0])
                    .attr("y2", d => projection([nodes[d.target].coordinates[0], nodes[d.target].coordinates[1]])[1]);

                svg.selectAll(".node")
                    .data(nodes)
                    .enter().append("g")
                    .attr("class", "node")
                    .attr("transform", d => "translate(" + projection([...d.coordinates]) + ")")
                    .on('mouseover', (e, d) => {
                        d3.select(`#node_circle_${d.id}`).attr("r", 4)
                        d3.select(`#node_text_${d.id}`).style("opacity", "1").text(d => d.name);
                    })
                    .on('mouseout', (e, d) => {
                        d3.select(`#node_circle_${d.id}`).select("circle").attr("r", 3)
                        d3.select(`#node_text_${d.id}`).style("opacity", "0").text(d => "");
                    })
                    .attr("id", (d) => d.id)
                    .on("click", clicked);

                svg.selectAll(".node").append("circle")
                    .attr("id", d => `node_circle_${d.id}`)
                    .attr("r", 3)
                    .attr("fill", '#000000')

                svg.selectAll(".node").append("text")
                    .attr("id", d => `node_text_${d.id}`)
                    .style("font-size", "10px")
                    .style("opacity", "1")
                    .attr("dx", 5)
                    .attr("dy", -10)
                    .text(d => "");


                svg.call(
                    zoom.transform,
                    d3.zoomIdentity
                        .translate(...borders).scale(1.15)
                );

                setSvg({svg, projection})
                return () => svg.selectAll("*").remove();
            }
        },
        [height, width]
    );


    useEffect(() => {
        let line = d3.line().curve(d3.curveBundle.beta(1))
        let path1 = ships.map(e => ship_by_name[e])

        let nodes_by_name = {}
        nodes.map(n => nodes_by_name[n.id] = n)
        d3.selectAll('.node').select('circle').attr("r", 3);
        d3.selectAll('.node').select('text').style("opacity", "0").text("");
        if (svg !== null && path1[0]) {
            let bounds = path1.map(p => p.path.map(e => projection([...e].reverse()))).flat()
            let allX = bounds.map(p => p[0])
            let allY = bounds.map(p => p[1])
            let db = 50
            let [[x0, y0], [x1, y1]] = [[Math.min(...allX) - db, Math.min(...allY) - db], [Math.max(...allX) + db, Math.max(...allY) + db]]
            console.log([[x0, y0], [x1, y1]])

            function zoomed(event) {
                const {transform} = event;
                let [xz, yz, kz] = [transform.x, transform.y, transform.k]
                setTransform({x: xz, y: yz, k: kz})
                xz = Math.max(Math.min(xz, borders[0] * kz), borders[0] - width * kz + width * 1.15)
                yz = Math.max(Math.min(yz, borders[1] * kz), borders[1] - height * kz + height * 1.15)
                transform.x = xz
                transform.y = yz
                svg.select('path.russia').attr("transform", transform)
                svg.selectAll("path.ship").attr("transform", transform)
                svg.selectAll(".node").attr("transform",
                    d => {
                        let pro = projection([...d.coordinates])
                        return `translate(${[xz, yz]}),scale(${kz}),translate(${[(pro[0]), (pro[1])]})`
                    });
                console.log(svg.selectAll('path.hexagon'))
                d3.selectAll('path.hexagon').attr("transform",
                    d => {
                        return `translate(${[xz, yz]}),scale(${kz}),translate(${[(d.x), (d.y)]})`
                    });
                svg.selectAll("line").attr("transform", transform)
            }

            function clicked(event, d) {
                if (d.id === clickedId) {
                    svg.transition().duration(750).call(
                        zoom.transform,
                        d3.zoomIdentity.scale(1.15),
                        d3.pointer(event)
                    );
                } else {
                    clickedId = d.id
                    let f = projection([...d.coordinates])
                    svg.transition().duration(750).call(
                        zoom.transform,
                        d3.zoomIdentity.translate(width / 2, height / 2).scale(3).translate(-f[0], -f[1]),
                        d3.pointer(event)
                    );
                }
            }

            const zoom = d3.zoom()
                .scaleExtent([1.15, 8])
                .on("zoom", zoomed);


            svg.call(zoom);
            svg.selectAll(".node").remove()

            const color = d3.scaleSequential([0, path1[0].path.length - 1], d3.interpolateBlues);

            let {source, target} = path1[0];
            source = nodes_by_name[source]
            target = nodes_by_name[target]
            svg.selectAll("path")
                .enter().append("g")
                .data(path1)
                .join("path")
                .attr("class", "ship")
                .attr("d", d => {
                    return line(d.path.map(e => projection([...e].reverse())))
                })
                .attr("stroke-width", 3)
                .attr("fill", "transparent")
                .attr("stroke", d => color(2000))

            svg.selectAll(".node")
                .data(nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => "translate(" + projection([...d.coordinates]) + ")")
                .on('mouseover', (e, d) => {
                    d3.select(`#node_circle_${d.id}`).attr("r", 4);
                    d3.select(`#node_text_${d.id}`).style("opacity", "1").text(d => d.name);
                })
                .on('mouseout', (e, d) => {
                    d3.select(`#node_circle_${d.id}`).attr("r", 3)
                    d3.select(`#node_text_${d.id}`).style("opacity", "0").text("");
                })
                .attr("id", (d) => d.id)
                .on("click", clicked);

            svg.selectAll(".node").append("circle")
                .attr("id", d => `node_circle_${d.id}`)
                .attr("r", 3)
                .attr("fill", '#000000')

            svg.selectAll(".node").append("text")
                .attr("id", d => `node_text_${d.id}`)
                .style("font-size", "10px")
                .style("opacity", "1")
                .attr("dx", 5)
                .attr("dy", -10)
                .text(d => "");

            if (source) {
                d3.select(`#node_circle_${source.id}`).attr("r", 3).attr('fill', '#006002');
                d3.select(`#node_text_${source.id}`).style("opacity", "1").text(d => d.name);
            }
            if (target) {
                d3.select(`#node_circle_${target.id}`).attr("r", 3).attr('fill', '#700000');
                d3.select(`#node_text_${target.id}`).style("opacity", "1").text(d => d.name);
            }



            // console.log(x, y, k)

            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
            );
        }
        return () => svg !== null ? svg.selectAll("path.ship").remove() : ""
    }, [svg, ships])


    return <svg ref={ref}/>
}

