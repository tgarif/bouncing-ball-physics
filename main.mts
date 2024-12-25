// A small vector interface for convenience
interface Vector2 {
  x: number;
  y: number;
}

// Ball class to encapsulate position, velocity, acceleration, mass, etc.
class Ball {
  // Properties
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  private _inverseMass: number; // 1 / mass
  restitution: number;
  radius: number;

  constructor(
    x: number,
    y: number,
    radius: number,
    mass: number,
    restitution: number,
    initialVelocity: Vector2 = { x: 0, y: 0 },
  ) {
    this.position = { x, y };
    this.velocity = { ...initialVelocity };
    this.acceleration = { x: 0, y: 0 };

    // If mass is Infinity => immovable => inverseMass = 0
    if (!isFinite(mass) || mass <= 0) {
      // If you pass 0 or negative, treat as immovable
      this._inverseMass = 0;
    } else {
      this._inverseMass = 1 / mass;
    }

    this.restitution = restitution;
    this.radius = radius;
  }

  get mass(): number {
    if (this._inverseMass === 0) return Infinity;
    return 1 / this._inverseMass;
  }

  get inverseMass(): number {
    return this._inverseMass;
  }

  // F = m * a  => a = F / m => a = F * inverseMass
  applyForce(force: Vector2) {
    if (this.inverseMass <= 0) return; // Immovable
    this.acceleration.x += force.x * this._inverseMass;
    this.acceleration.y += force.y * this._inverseMass;
  }

  applyGravity(g: number) {
    if (this._inverseMass <= 0) return; // Immovable
    const F = (1 / this._inverseMass) * g;
    this.applyForce({ x: 0, y: F });
  }

  // Quadratic air resistance
  applyAirResistance(k: number) {
    if (this._inverseMass <= 0) return; // Immovable

    const vx = this.velocity.x;
    const vy = this.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed < 0.001) return;

    // Force magnitude = k * speed^2
    // but we'll break it down as: F = k * speed * (speed * direction)
    // speed * direction = velocity
    // => F_drag = -k * speed * velocity
    const dragX = -k * speed * vx;
    const dragY = -k * speed * vy;

    // Apply the force
    this.applyForce({ x: dragX, y: dragY });
  }

  // Update physics state (velocity, position) over a time interval dt
  update(dt: number) {
    if (this._inverseMass <= 0) return; // Immovable

    // Position update (semi-implicit Euler variant):
    // velocity += a * dt
    this.velocity.x += this.acceleration.x * dt;
    this.velocity.y += this.acceleration.y * dt;

    // position += velocity * dt
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Reset acceleration (important so forces don't accumulate each frame)
    this.acceleration.x = 0;
    this.acceleration.y = 0;
  }

  // Check collisions with the boundaries of the canvas
  checkCollisions(canvas: HTMLCanvasElement) {
    // Left or right boundary
    if (this.position.x - this.radius < 0) {
      this.position.x = this.radius;
      this.velocity.x = -this.velocity.x * this.restitution;
    } else if (this.position.x + this.radius > canvas.width) {
      this.position.x = canvas.width - this.radius;
      this.velocity.x = -this.velocity.x * this.restitution;
    }

    // Top or bottom boundary
    if (this.position.y - this.radius < 0) {
      this.position.y = this.radius;
      this.velocity.y = -this.velocity.y * this.restitution;
    } else if (this.position.y + this.radius > canvas.height) {
      this.position.y = canvas.height - this.radius;
      this.velocity.y = -this.velocity.y * this.restitution;
    }
  }

  // Draw the ball on the canvas
  draw(ctx: CanvasRenderingContext2D) {
    // Draw the circle
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#3498db";
    ctx.fill();
    ctx.closePath();

    // Draw the mass text in the center of the ball
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const m = this.mass;
    const massText = Number.isFinite(m) ? `m=${m.toFixed(2)}` : "m=∞";
    ctx.fillText(massText, this.position.x, this.position.y);
  }
}

// ----------------------------------------------------------------------------------------------------

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Canvas not supported by your browser.");

// Create a ball
const ball = new Ball(
  50,
  100,
  50, // Radius
  5, // mass
  0.7, // restitution defines elasticity, reduce to 0.5, 0.3, etc. for less bouncy
  { x: 200, y: -50 },
);

// Gravity force (if you want to simulate "downward" gravity)
// Increase or decrease this for a different effect.
const GRAVITY_FORCE = 600; // px/s²

// Drag coefficient
const DRAG_COEFF = 0.001;

// Friction coefficient for simple "sliding friction"
const FRICTION_COEFF = 0.3;
// You will tune this number to get the feel you want.
// Higher => ball slows faster when on ground.

// The game loop: updates physics + renders each frame
let lastTime = 0;

const gameLoop = (timestamp: number) => {
  // Calculate the time elapsed since last frame (in seconds)
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (dt > 0.05) {
    dt = 0.05; // clamp to 0.05s max to fix the weird movement when switching browser tabs
  }

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply gravity each frame
  ball.applyGravity(GRAVITY_FORCE);

  // Apply air resistance
  ball.applyAirResistance(DRAG_COEFF);

  // Ground friction
  // F_fric = mu * mass * g => a_fric = mu*g for all masses
  const isOnGround = ball.position.y + ball.radius >= canvas.height - 0.5;
  if (isOnGround && ball.inverseMass > 0) {
    // friction = mu * (m*g)
    // => a = mu*g  (sliding friction), ignoring rolling
    if (Math.abs(ball.velocity.x) > 0.001) {
      const realMass = ball.mass;
      const frictionForce = FRICTION_COEFF * realMass * GRAVITY_FORCE;
      const signX = Math.sign(ball.velocity.x);
      const frictionForceX = -signX * frictionForce;
      ball.applyForce({ x: frictionForceX, y: 0 });
    } else {
      // If velocity is super small, clamp it to 0 to avoid jitter
      ball.velocity.x = 0;
    }
  }

  // Update the ball's physics
  ball.update(dt);

  // Check for collisions with the walls
  ball.checkCollisions(canvas);

  // Draw the ball
  ball.draw(ctx);

  // Request the next animation frame
  requestAnimationFrame(gameLoop);
};

requestAnimationFrame(gameLoop);
