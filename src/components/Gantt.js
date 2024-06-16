import React, {useEffect, useRef, useState} from "react";

import * as vis from 'vis'
import '../../node_modules/vis/dist/vis.css'
import parser from 'any-date-parser'
import './GeoMap.css'
import {ships_array, nodes} from "./utils";
import {useWindowDimensions} from "./GeoMap";

let data = ships_array.map(e => ({...e, start: parser.fromString(e.start), end: parser.fromString(e.end)}))
let max = Math.max(...data.map(e => e.end))
let min = Math.min(...data.map(e => e.start))
let groups = new vis.DataSet();
let items = new vis.DataSet();
console.log(nodes)
for (const ship of data) {
    groups.add({
        id: ship.name,
        content: ship.name,
    });
    items.add({
        id: ship.name,
        group: ship.name,
        start: ship.start,
        end: ship.end,
        type: "range",
        content: nodes[ship.source+1].name + " -> " + nodes[ship.target+1].name,
        className: 'red'
    });


}

const Gantt = ({setShips}) => {
    let ref = useRef()
    let {width, height} = useWindowDimensions()
    const [currentHeight, setCurrentHeight] = useState(0)
    const [timeline, setTimeline] = useState({})

    const [currentIds, setCurrentIds] = useState([]);

    useEffect(() => {
        setShips(currentIds)
    }, [currentIds])

    useEffect(() => {
        console.log(currentHeight)
        let options = {

            locale: 'ru',
            multiselect: true,
            zoomMin: 1000 * 60 * 60 * 12,
            stack: true,
            height: currentHeight ,
            horizontalScroll: true,
            verticalScroll: true,
            zoomKey: "ctrlKey",
            // start: Date.now() - 1000 * 60 * 60 * 24 * 0, // minus 3 days
            // end: Date.now() + 1000 * 60 * 60 * 24 * 21, // plus 1 months aprox.
            orientation: {
                axis: "both",
                item: "top",
            },
            max: max + 1000 * 60 * 60 * 60,
            min,
            end: max + 1000 * 60 * 60 * 60
        };

        let timeline = new vis.Timeline(ref.current, null, options);
        timeline.setGroups(groups);
        timeline.setItems(items);

        function onSelect(properties) {
            setCurrentIds(properties.items);
        }

        timeline.on('select', onSelect);
        setTimeline(timeline)
        return () => ref.current.children[0] ? ref.current.removeChild(ref.current.children[0]) : ''
    }, []);

    useEffect(() => {
            if (timeline.setOptions) {
                timeline.setOptions({height: currentHeight})
            }
        }, [timeline, currentHeight]
    )


    useEffect(() => {
        var btn = document.getElementById("btn");

        function drag(e) {
            setCurrentHeight(Math.min(height, Math.max(0, e.pageY)))
            btn.style.transform = `translate(${width / 2 - 100}px,${Math.max(0, e.pageY)}px)`;
        }

        btn.addEventListener("mousedown", () =>
            document.addEventListener("mousemove", drag)
        );
        btn.addEventListener("mouseup", () =>
            document.removeEventListener("mousemove", drag)
        );
    }, []);

    return <div
        style={{position: "absolute", height: currentHeight, width: '100%', background: 'rgba(255,255,255,0.69)'}}>
        <div ref={ref}></div>
        <button id="btn" style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: '200px',
            transform: `translate(${width / 2 - 100}px, 0px)`
        }}>потяни
        </button>

    </div>
};

export default Gantt;