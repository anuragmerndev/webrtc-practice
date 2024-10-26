import "./App.css";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import { Sender } from "./components/Sender";
import { Receiver } from "./components/Receiver";

function App() {
  return (
    <BrowserRouter>
    Hello this is new
      <Routes>
        <Route path="/reciever" element={<Receiver />} />
        <Route path="/sender" element={<Sender />} />
        <Route />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
