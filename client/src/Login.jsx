import { useState, useLayoutEffect } from 'react';
import { ErrorMessage, Field, Form, Formik } from "formik";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import styles from '../styles/form.module.sass'

import { set } from './store/userSlice';

const Login = () => {
    const [ submitErrors, setSubmitErrors ] = useState("");
    const [ searchParams ] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const username = useSelector(state => state.user.name);

    useLayoutEffect(() => {
        if(!!username) {
            if(username === "admin") {
                navigate('/admin');
            } else {
                navigate('/user');
            }
        }
    });

    return (
        <>
            <Link to='/'><img className={styles.back} alt="go back to homepage" src='/leftArrow.svg' width={40} height={40} /></Link>
            <h2 className={styles.heading}>Login</h2>
            <Formik
                initialValues={{username: "", password: ""}}
                validate={async (values) => {
                    const errors = {};
                    
                    if(!values.username) {
                        errors.username = "Username is required";
                    }

                    if(!values.password) {
                        errors.password = "Password is required";
                    }

                    return errors;
                }}
                onSubmit={(values, { resetForm }) => {
                    fetch("/api/login", {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(values)
                    })
                    .then(res => {
                        if(res.ok) {
                            setSubmitErrors("");
                            dispatch(set(values.username));
                            resetForm();
                            if(values.username.trim() === "admin") {
                                navigate('/admin');
                            } else {
                                navigate('/user');
                            }
                        } else if(res.status === 400) {
                            setSubmitErrors("Invalid request");
                        } else if(res.status === 404) {
                            setSubmitErrors("User not found");
                        } else if(res.status === 401) {
                            setSubmitErrors("Invalid credentials");
                        } else if(res.status === 500) {
                            setSubmitErrors("Server error");
                        };
                    });
                }}
            >
                <Form className={styles.form}>
                    <label htmlFor="username">username: </label>
                    <Field name="username" type="text" />
                    <ErrorMessage className={styles.error} name="username" component="div" />
                    <label htmlFor="password">password: </label>
                    <Field name="password" type="password" />
                    <ErrorMessage className={styles.error} name="password" component="div" />
                    <button type="submit">login</button>
                </Form>
            </Formik>
            { submitErrors !== "" &&
            <div className={styles.error}>{ submitErrors }</div> }
            {searchParams.get('success') !== null && <div className={styles.greenMsg}>Registration successfull</div>}
        </>
    );
};

export default Login;
