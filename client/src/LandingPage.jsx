import styles from '../styles/homepage.module.sass';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className={styles.container}>
            <h1>Snake</h1>
            <img alt="snake" src="/snake.svg" width={400} height={100} />
            <span>Image by <a href="https://pixabay.com/users/openclipart-vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=145409">OpenClipart-Vectors</a> from <a href="https://pixabay.com//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=145409">Pixabay</a></span>
            <div>
                <Link to="/login"><button>Login</button></Link>
                <Link to="/register"><button>Register</button></Link>
            </div>
        </div>
    );
}

export default LandingPage;
