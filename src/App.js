import './App.css';
import GeoMap from "./components/GeoMap";
import Gantt from "./components/Gantt";
import {useState} from "react";

function App() {
    const [ships, setShips] = useState([])

    return <div>
        <Gantt setShips={setShips}/>
        <GeoMap ships={ships}/>
    </div>
}

export default App;
