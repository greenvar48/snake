import vector from './VectorsMath';

const drawFrame = (ctx, step, squareSize) => {
    ctx.fillStyle = '#ffffff';
    let dir = {x: step, y: 0};
    let repeat = true;
    const rectSize = {w: squareSize, h: squareSize};

    for (
        let pos = {x: 0, y: 0};
        repeat ||
        JSON.stringify(dir) !== JSON.stringify({x: step, y : 0});
        pos = vector.add(pos, dir)
    ) {
        const nextStep = vector.add(pos, dir);

        if(
            nextStep.x < 0 ||
            nextStep.x > ctx.canvas.width ||
            nextStep.y < 0 ||
            nextStep.y > ctx.canvas.height
        ) {
            dir = vector.rotate90degL(dir);
            repeat = false;
        }
        
        ctx.fillRect(pos.x, pos.y, rectSize.w, rectSize.h);
    }
};

export default drawFrame;