class Ball {
    position;
    velocity;
    acceleration;
    _inverseMass;
    restitution;
    radius;
    constructor(x, y, radius, mass, restitution, initialVelocity = { x: 0, y: 0 }) {
        this.position = { x, y };
        this.velocity = { ...initialVelocity };
        this.acceleration = { x: 0, y: 0 };
        if (!isFinite(mass) || mass <= 0) {
            this._inverseMass = 0;
        }
        else {
            this._inverseMass = 1 / mass;
        }
        this.restitution = restitution;
        this.radius = radius;
    }
    get mass() {
        if (this._inverseMass === 0)
            return Infinity;
        return 1 / this._inverseMass;
    }
    get inverseMass() {
        return this._inverseMass;
    }
    applyForce(force) {
        if (this.inverseMass <= 0)
            return;
        this.acceleration.x += force.x * this._inverseMass;
        this.acceleration.y += force.y * this._inverseMass;
    }
    applyGravity(g) {
        if (this._inverseMass <= 0)
            return;
        const F = (1 / this._inverseMass) * g;
        this.applyForce({ x: 0, y: F });
    }
    applyAirResistance(k) {
        if (this._inverseMass <= 0)
            return;
        const vx = this.velocity.x;
        const vy = this.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < 0.001)
            return;
        const dragX = -k * speed * vx;
        const dragY = -k * speed * vy;
        this.applyForce({ x: dragX, y: dragY });
    }
    update(dt) {
        if (this._inverseMass <= 0)
            return;
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }
    checkCollisions(canvas) {
        if (this.position.x - this.radius < 0) {
            this.position.x = this.radius;
            this.velocity.x = -this.velocity.x * this.restitution;
        }
        else if (this.position.x + this.radius > canvas.width) {
            this.position.x = canvas.width - this.radius;
            this.velocity.x = -this.velocity.x * this.restitution;
        }
        if (this.position.y - this.radius < 0) {
            this.position.y = this.radius;
            this.velocity.y = -this.velocity.y * this.restitution;
        }
        else if (this.position.y + this.radius > canvas.height) {
            this.position.y = canvas.height - this.radius;
            this.velocity.y = -this.velocity.y * this.restitution;
        }
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#3498db";
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const m = this.mass;
        const massText = Number.isFinite(m) ? `m=${m.toFixed(2)}` : "m=∞";
        ctx.fillText(massText, this.position.x, this.position.y);
    }
}
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
if (!ctx)
    throw new Error("Canvas not supported by your browser.");
const ball = new Ball(50, 100, 50, 5, 0.7, { x: 200, y: -50 });
const GRAVITY_FORCE = 600;
const DRAG_COEFF = 0.001;
const FRICTION_COEFF = 0.3;
let lastTime = 0;
const gameLoop = (timestamp) => {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.05) {
        dt = 0.05;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ball.applyGravity(GRAVITY_FORCE);
    ball.applyAirResistance(DRAG_COEFF);
    const isOnGround = ball.position.y + ball.radius >= canvas.height - 0.5;
    if (isOnGround && ball.inverseMass > 0) {
        if (Math.abs(ball.velocity.x) > 0.001) {
            const realMass = ball.mass;
            const frictionForce = FRICTION_COEFF * realMass * GRAVITY_FORCE;
            const signX = Math.sign(ball.velocity.x);
            const frictionForceX = -signX * frictionForce;
            ball.applyForce({ x: frictionForceX, y: 0 });
        }
        else {
            ball.velocity.x = 0;
        }
    }
    ball.update(dt);
    ball.checkCollisions(canvas);
    ball.draw(ctx);
    requestAnimationFrame(gameLoop);
};
requestAnimationFrame(gameLoop);
export {};
//# sourceMappingURL=main.mjs.map