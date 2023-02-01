import vector from './VectorsMath';

export function Player(dir, squareSize, color) {
    this.head = null;
    this.tail = null;
    this.dir = dir;
    this.allowTurn = true;

    this.addHead = function(val) {
        const oldHead = this.head;
        const oldTail = this.tail;
        
        this.head = { 'val': val };
        
        if(oldHead !== null) {
            this.head.next = oldHead;
            oldHead.prev = this.head;
        } else {
            this.head.next = this.head;
        }

        if(oldTail !== null) {
            this.head.prev = oldTail;
            oldTail.next = this.head;
        } else {
            this.head.prev = this.head;
            this.tail = this.head;
        }
    },

    this.popTail = function() {
        if(this.tail !== null) {
            if(this.tail === this.head) {
                this.head = null;
                this.tail = null;
            } else {
                const newTail = this.tail.prev;

                newTail.next = this.head;
                this.head.prev = newTail;
                this.tail = newTail;
            }
        } else {
            throw new Error("Can't pop the tail, it's null");
        }
    },

    this.toString = function() {
        let result = "";

        if(this.head !== null) {
            let currentNode = this.head;
            do {
                result += currentNode.val.toString();
                if(currentNode.next !== this.head) {
                    result += ", "
                }

                currentNode = currentNode.next;
            } while(currentNode !== this.head);
        }

        return result;
    },
    
    this.draw = function(ctx) {
        if(this.head !== null) {
            let currentNode = this.head;
            ctx.fillStyle = color;
            
            do {
                ctx.fillRect(currentNode.val.x, currentNode.val.y, squareSize, squareSize);

                currentNode = currentNode.next;
            } while(currentNode !== this.head);
        } else {
            throw new Error("Can't draw an empty snake!");
        }
    },

    this.turnLeft = function() {
        this.dir = vector.rotate90degR(this.dir);
    },
    this.turnRight = function() {
        this.dir = vector.rotate90degL(this.dir);
    },

    this.turn = function(left) {
        if(this.allowTurn) {
            if(left) {
                this.turnLeft();
            } else {
                this.turnRight();
            }

            this.allowTurn = false;
        }
    };

    this.move = function(canvas, applePos) {
        const nextPos = vector.add(this.head.val, this.dir);
        const collidingWithSelf = (() => {
            let result = false;
            let currentNode = this.head;

            do {
                result = JSON.stringify(currentNode.val) === JSON.stringify(nextPos);
                currentNode = currentNode.next;
            } while(currentNode != this.tail && !result);

            return result;
        })();

        const moveIsValid = 
            nextPos.x > squareSize &&
            nextPos.x < canvas.width - squareSize &&
            nextPos.y > squareSize &&
            nextPos.y < canvas.width - squareSize &&
            !collidingWithSelf;

        let appleWasEaten;
        if(moveIsValid) {
            this.addHead(nextPos);
            appleWasEaten = JSON.stringify(applePos) === JSON.stringify(this.head.val);
            if(!appleWasEaten) this.popTail();
            this.allowTurn = true;
        }

        return [moveIsValid, appleWasEaten];
    }
};
