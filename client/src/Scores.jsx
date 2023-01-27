import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import style from '../styles/scores.module.sass'

const Scores = () => {
    const username = useSelector(state => state.user.name);
    const [ scores, setScores ] = useState(null);
    const msg = useRef(null);
    const [ displayMsg, setDisplayMsg ] = useState(false);
    const [ flip, setFlip ] = useState(false);

    const handleDelete = (scoreId) => () => {
        fetch("/api/scores", {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ scoreId })
        })
        .then(res => {
            if(msg.current !== null) {
                setDisplayMsg(true);
                if(res.ok) {
                    msg.current.innerHTML = "Deleted successfully";
                    setFlip(prev => !prev);
                } else {
                    msg.current.innerHTML = "Unable to delete";
                }
            }
        })
        
    };

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
                                        <td>{score.value}</td>
                                        <td><button onClick={handleDelete(score.id)}>Delete</button></td>
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
    }, [flip]);

    return (
        <>
            <div ref={msg} className={style.msg} style={{ display: displayMsg ? "block" : "none" }}></div>
            <div className={style.scores}>
                { scores === null ? "Loading" : scores }
            </div>
        </>
    );
};

export default Scores;
