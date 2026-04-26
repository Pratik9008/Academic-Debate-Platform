class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initParticles();
    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  initParticles() {
    const count = window.innerWidth < 768 ? 150 : 400;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 1.0,
      vy: -Math.random() * 2.0 - 0.5,
      size: Math.random() * 2.5 + 1,
      color: this.getColor(x, y),
      alpha: Math.random() * 0.8 + 0.2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.05
    };
  }

  getColor(x, y) {
    // Left is blue, right is red/orange, top is lighter
    const normalizedX = x / this.width;
    // Interpolate between blue (#2b58ff) and orange/red (#ff5c2b)
    const r = Math.floor(43 + normalizedX * (255 - 43));
    const g = Math.floor(88 + normalizedX * (92 - 88));
    const b = Math.floor(255 - normalizedX * (255 - 43));
    return `${r}, ${g}, ${b}`;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      
      // Reset if off screen
      if (p.y < -10 || p.x < -10 || p.x > this.width + 10) {
        Object.assign(p, this.createParticle());
        p.y = this.height + 10; // Spawn at bottom
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      // Draw small dash/capsule to look like the image
      this.ctx.beginPath();
      this.ctx.roundRect(-p.size*2, -p.size/2, p.size*4, p.size, p.size/2);
      this.ctx.fill();
      this.ctx.restore();
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("particlesCanvas");
  if (canvas) {
    new ParticleSystem(canvas);
  }
});
