import { useLayoutEffect } from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { Formik, Form, Field } from 'formik';
import { useMemo } from "react";

const Admin = () => {
    const [ search, setSearch ] = useState("");
    const username = useSelector(state => state.user.name);
    const navigate = useNavigate();
    const [ users, setUsers ] = useState([]);
    

    useLayoutEffect(() => {
        if(username !== "admin") {
            navigate('/login');
        }
    });

    const usersList = (arr) => {
        console.log(arr);
        return arr.reduce((acc, user, i) => [
            ...acc,
            <Formik
                key={i}
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
                    </tr>
                    </tbody>
                    </table>
                </Form>
            </Formik>
        ], [])};

    const list = useMemo(() => usersList(users), [ users ]);
    
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
                });
            }}>
                <input
                    type="text"
                    value={search} 
                    onChange={(ev) => setSearch(ev.target.value)}
                />
                <input type="submit" value="Search User"/>
            </form>
            { usersList(users) }
        </>
    );
};

export default Admin;