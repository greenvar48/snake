import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { useState } from 'react';

import style from '../styles/user.module.sass';
import Canvas from './Canvas';
import { Formik } from "formik";

const User = () => {
    const username = useSelector(state => state.user.name);
    const navigate = useNavigate();
    const [ scores, setScores ] = useState(null);

    const scoreUpdateHandler = (data) => {
        setScores(
            <table>
                <tbody>
                {data.reduce((acc, score, i) => [
                    ...acc,
                    <tr key={i}>
                        <td>{i+1}.</td>
                        <td>{score}</td>
                    </tr>
                ], [])}
                </tbody>
            </table>
        );
    };

    useLayoutEffect(() => {
        if(!username) {
            navigate('/login')
        } else {
            const socket = new WebSocket('ws://localhost:5173/ws');

            socket.addEventListener('open', (openEv) => {
                socket.addEventListener('message', (ev) => {
                    scoreUpdateHandler(JSON.parse(ev.data));
                });
            });

            fetch("/api/topScores", {
                method: "GET"
            })
            .then(res => {
                if(res.ok) {
                    res.json()
                    .then(body => {
                        scoreUpdateHandler(body.data);
                    });
                } else {
                    setScores(<p>Scores unavailable</p>);
                }
            });

            return () => {
                socket.close();
            }
        }
    }, []);

    return (
        <div className={ style.container }>
            <div className={ style.userinfo }>
                <h1>User: { username }</h1>
                <div className={ style.scores }>
                    <p>Top 10 scores: </p>
                    { scores === null ? "Loading" : scores }
                </div>
                <Link to='/scores'><button>All scores</button></Link>
            </div>
            <Canvas width={119} height={119} />
        </div>
    );
};

export default User;
