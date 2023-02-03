import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import style from '../styles/user.module.sass';
import Canvas from './Canvas';
import { set } from './store/userSlice';
import { ErrorMessage, Field, Form, Formik } from "formik";

const User = () => {
    const username = useSelector(state => state.user.name);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [ scores, setScores ] = useState(null);
    const socket = useRef(null);

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

    useEffect(() => {
        if(!username) {
            navigate('/login');
        } else {
            if(socket.current === null || socket.current.readyState > 1) {
                socket.current = new WebSocket('ws://localhost:5173/ws');
    
                socket.current.onclose = (ev) => {
                    console.log("closed");
                };
    
                socket.current.onmessage = (ev) => {
                    scoreUpdateHandler(JSON.parse(ev.data));
                };
    
                socket.current.onerror = (ev) => {
                    console.log(ev);
                };
    
                socket.current.onopen = (openEv) => {
                    console.log("opened");
                };
            }
    
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
                socket.current.close()
            };
        }
    }, []);

    const handleLogout = async () => {
        const res = await fetch('/api/logout', {
            method: "POST"
        });

        if(res.ok) {
            dispatch(set(null));
            navigate('/login');
        }
    }

    return (
        <div className={ style.container }>
            <div className={ style.userinfo }>
                <h1>User: { username }</h1>
                <Formik
                    initialValues={{ user: username }}
                    validate={(values) => {
                        const errors = {};
    
                        if(!values.user) {
                            errors.user = "Username is required";
                        } else if(!values.user.trim().match(/^[a-zA-Z0-9_]+$/)) {
                            errors.user = "Invalid username";
                        }
    
                        return errors;
                    }}
                    onSubmit={(values) => {
                        fetch("/api/changeUsername", {
                            method: "POST",
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({username: values.user})
                        })
                        .then(res => {
                            if(res.ok) {
                                dispatch(set(values.user));
                            } else {
                                console.log(res.status);
                            }
                        });
                    }}
                >
                    <Form>
                        <label htmlFor="user">user: </label>
                        <Field name="user" type="text" />
                        <ErrorMessage name="user" component="div" />
                        <button type="submit">Change</button>
                    </Form>
                </Formik>
                <button onClick={handleLogout}>Logout</button>
                <div className={ style.scores }>
                    <p>Top 10 scores: </p>
                    { scores === null ? "Loading" : scores }
                </div>
                <Link to='/scores'><button>All scores</button></Link>
            </div>
            <Canvas/>
        </div>
    );
};

export default User;
