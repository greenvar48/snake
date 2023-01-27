const vector = () => {
    const len = v =>
        Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));

    const normalize = v => {
        const vLen = len(v);
        return { 'x': v.x / vLen, 'y': v.y / vLen };
    };

    const rotate90degL = (v) =>
        ({'x': v.y * (-1), 'y': v.x });

    const rotate90degR = (v) =>
        ({'x': v.y, 'y': v.x * (-1)});

    const add = (a, b) =>
        ({'x': a.x + b.x, 'y': a.y + b.y});

    return { len, normalize, rotate90degL, rotate90degR, add };
};

export default vector();
