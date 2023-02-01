export function Apple(frameSize, fieldSize, squareSize) {
    const randomCoord = () => Math.floor(Math.random() * (frameSize - 2 * fieldSize) / fieldSize) * fieldSize + fieldSize;
    this.pos = {x: randomCoord(), y: randomCoord()};

    this.draw = function(ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.pos.x, this.pos.y, squareSize, squareSize);
    };
}
