import { Routes, Route } from "react-router";

import '../styles/global.sass';

import LandingPage from "./LandingPage";
import Login from './Login';
import Register from './Register';
import ServerError from "./ServerError";
import User from "./User";
import Scores from './Scores';
import Admin from "./Admin";

const App = () => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/*<Route path="/serverError" element={<ServerError />} />*/}
            <Route path="/user" element={<User />} />
            <Route path="/scores" element={<Scores />} />
            <Route path='/admin' element={<Admin />} />
        </Routes>
    );
};

export default App;