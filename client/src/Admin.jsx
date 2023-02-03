import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { Formik, Form, Field } from 'formik';
import { v4 as uuidv4 } from 'uuid';

const Admin = () => {
    const [ search, setSearch ] = useState("");
    const username = useSelector(state => state.user.name);
    const navigate = useNavigate();
    const [ users, setUsers ] = useState([]);
    const [ checkMark, setCheckMark ] = useState({i: null, ok: null});

    useEffect(() => {
        if(username !== "admin") {
            navigate('/login');
        }
    });

    const usersList = (arr) =>
        arr.reduce((acc, user, i) => [
            ...acc,
            <Formik
                key={uuidv4()}
                initialValues={{
                    username: user.username,
                    color: user.color,
                    canvasSize: user.canvasSize
                }}
                onSubmit={(values) => {
                    fetch('/api/userMod', {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ user: values, name: user.username })
                    })
                    .then(res => {
                        setCheckMark({i, ok: res.ok});
                    });
                }}
            >
                <Form>
                    <table>
                        <thead>
                            <tr>
                                <td>username</td>
                                <td>color</td>
                                <td>canvas size</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><Field name="username" type="text" /></td>
                                <td><Field name="color" type="color" /></td>
                                <td><Field name="canvasSize" type="number" /></td>
                                <td><button type="submit">save</button></td>
                                <td>{ checkMark.i === i ? checkMark.ok ? "\u2713" : "\u274C" : null }</td>
                            </tr>
                        </tbody>
                    </table>
                </Form>
            </Formik>
        ], []);
    
    const list = useMemo(() => usersList(users), [users, checkMark]);

    return (
        <>
            <form onSubmit={(ev) => {
                ev.preventDefault();
                
                fetch('/api/search', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ search })
                })
                .then(res => res.json())
                .then(body => {
                    setUsers(body.users);
                    setCheckMark({i: null, ok: null});
                });
            }}>
                <input
                    type="text"
                    value={search}
                    onChange={(ev) => setSearch(ev.target.value)}
                />
                <input type="submit" value="Search User"/>
            </form>
            { list }
        </>
    );
};

export default Admin;
