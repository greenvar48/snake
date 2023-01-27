import { useRef, useEffect, useState } from 'react';
import drawFrame from './game/Frame';
import { Player } from './game/Player.js';
import { Apple } from './game/Apple.js';

import style from '../styles/game.module.sass';

const Canvas = (props) => {
    const canvasRef = useRef(null);
    const frameId = useRef(null);

    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [ play, setPlay ] = useState(false);

    useEffect(() => {
        const gameInit = () => {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            const player = new Player({ x: 0, y: 6 });

            const handleKeydown = (ev) => {
                const left =
                    ev.code === 'ArrowLeft'
                    ? true
                    : (
                        ev.code === 'ArrowRight'
                        ? false
                        : null
                    );
                
                if(left !== null) player.turn(left);
            };

            let lastFrameTimestamp = null;
            let speed = 1000;

            let apple = null;

            if(player.head === null) {
                player.addHead({x: 36, y: 36});
            }

            window.addEventListener('keydown', handleKeydown);

            const draw = (timestamp) => {
                if(lastFrameTimestamp === null) {
                    lastFrameTimestamp = timestamp - speed;
                }

                const elapsedTime = timestamp - lastFrameTimestamp;

                if(elapsedTime >= speed) {
                    lastFrameTimestamp = timestamp;
                    
                    while(apple === null) {
                        apple = new Apple();
                        let conflict = false;
                        let currentNode = player.head;

                        do {
                            conflict = JSON.stringify(currentNode.val) === JSON.stringify(apple.pos);
                            currentNode = currentNode.next;
                        } while(!conflict && currentNode !== player.head);

                        if(conflict) {
                            apple = null;
                        }
                    }

                    const [moveIsValid, appleWasEaten] = player.move(canvas, apple.pos);
                    if(!moveIsValid) setGameOver(true);

                    
                    if(appleWasEaten) {
                        apple = null;
                        setScore(prev => prev + 1);
                        if(speed > 51) speed -= 50;
                    }

                    context.fillStyle = '#000000';
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    drawFrame(context);
                    player.draw(context);
                    if(apple !== null) apple.draw(context);
                }

                frameId.current = window.requestAnimationFrame(draw);
            }

            return [handleKeydown, draw];
        }

        if(!gameOver && frameId.current === null && play) {
            const [handleKeydown, draw] = gameInit();
            frameId.current = window.requestAnimationFrame(draw);

            return () => {
                window.cancelAnimationFrame(frameId.current);
                window.removeEventListener('keydown', handleKeydown);

                frameId.current = null;
                setPlay(false);
            }
        } else if(gameOver && frameId.current === null && !play) {
            fetch("/api/score", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ score })
            })
        }
    }, [gameOver, play]);

    return (
        <div className={style.container} >
            <span>Score: {score}</span>
            <canvas ref={canvasRef} {...props}></canvas><br/>
            {
                gameOver
                ?
                <>
                    Game Over
                    <button onClick={() => {
                        setScore(0);
                        setGameOver(false);
                        setPlay(true);
                    }}>
                        Restart
                    </button>
                </>
                : null
            }
            {
                !gameOver && !play ?
                <button onClick={() => setPlay(true)}>Play</button>
                : null
            }
            
        </div>
    );
};

export default Canvas;
