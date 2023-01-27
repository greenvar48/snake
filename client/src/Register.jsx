import { ErrorMessage, Field, Form, Formik } from "formik";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom'

import styles from '../styles/form.module.sass'

const Register = () => {
    const navigate = useNavigate();
    const [ submitErrors, setSubmitErrors ] = useState("");

    return (
        <>
            <Link to='/'><img className={styles.back} alt="go back to homepage" src='/leftArrow.svg' width={40} height={40} /></Link>
            <h2 className={styles.heading}>Register</h2>
            <Formik
                initialValues={{username: "", password: ""}}
                validate={(values) => {
                    const errors = {};

                    if(!values.username) {
                        errors.username = "Username is required";
                    } else if(!values.username.trim().match(/^[a-zA-Z0-9_]+$/)) {
                        errors.username = "Invalid username";
                    }

                    if(!values.password) {
                        errors.password = "Password is required";
                    } else if(!values.password.match(/^(?=(.*[0-9]){2,})(?=(.*[a-z]){2,})(?=(.*[A-Z]){2,})(?=(.*[!@#$%^&*()\-__+.]){1,}).{8,}$/)) {
                        errors.password = "Password is not strong enough";
                    }

                    return errors;
                }}
                onSubmit={(values, { resetForm }) => {
                    fetch("/api/register", {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(values)
                    })
                    .then(res => {
                        if(res.ok) {
                            setSubmitErrors('');
                            navigate('/login?success');
                        } else if(res.status === 409) {
                            setSubmitErrors(`Username "${values.username}" is already taken`);
                        } else if(res.status === 400) {
                            setSubmitErrors("Invalid request");
                        } else if(res.status === 500) {
                            setSubmitErrors("Server error");
                        }

                        resetForm();
                    });
                }}
            >
                <Form className={styles.form}>
                    <label htmlFor="username">username: </label>
                    <Field name="username" type="text" />
                    <p>username should contain only alphanumeric characters and underscores</p>
                    <ErrorMessage name="username" className={styles.error} component="div" />
                    <label htmlFor="password">password: </label>
                    <Field name="password" type="password" />
                    <p>password should be at least 8 characters long and it should contain at least 2 digits, 2 lower case letters, 2 upper case letters and 1 special character</p>
                    <ErrorMessage name="password" className={styles.error} component="div" />
                    <button type="submit">register</button>
                </Form>
            </Formik>
            { submitErrors !== "" &&
            <div className={styles.error}>{ submitErrors }</div> }
        </>
    );
};

export default Register;
