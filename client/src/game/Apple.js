export function Apple() {
    const randomCoord = () => Math.floor(Math.random() * 78 / 6) * 6 + 6;
    this.pos = {x: randomCoord(), y: randomCoord()};

    this.draw = function(ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.pos.x, this.pos.y, 5, 5);
    };
}
