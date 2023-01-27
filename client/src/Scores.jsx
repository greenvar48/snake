import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Scores = () => {
    const username = useSelector(state => state.user.name);
    const [ scores, setScores ] = useState(null);

    useEffect(() => {
        if(!username) {
            navigate('/login')
        } else {
            fetch("/api/scores", {
                method: "GET"
            })
            .then(res => {
                if(res.ok) {
                    res.json()
                    .then(body => {
                        setScores(
                            <table>
                                <tbody>
                                {body.data.reduce((acc, score, i) => [
                                    ...acc,
                                    <tr key={i}>
                                        <td>{i+1}.</td>
                                        <td>{score}</td>
                                    </tr>
                                ], [])}
                                </tbody>
                            </table>
                        );
                    });
                } else {
                    setScores(<p>Scores unavailable</p>);
                }
            });
        }
    }, []);

    const handleDelete = (n) => {
        fetch("/api/scores", {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(values)
        })
    };

    return (
        <>
            { scores === null ? "Loading" : scores }
        </>
    );
};

export default Scores;
