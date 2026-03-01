import { useEffect, useRef, useState } from 'react';

// load Phaser only on client side
let Phaser: any;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Phaser = require('phaser');
}

export default function Home() {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; score: number }>>([]);
  const [user, setUser] = useState<{ id: number; username: string; is_subscribed?: boolean } | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // fetch current authenticated user
  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          // automatically log in default demo user so visitors see the game immediately
          fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'alice', password: 'password123' }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.user) setUser(d.user);
            })
            .catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  // fetch current score from API whenever user changes (or on load)
  useEffect(() => {
    if (!user) return;
    fetch('/api/score')
      .then((r) => r.json())
      .then((data) => setScore(data.score || 0))
      .catch(console.error);
  }, [user]);

  // fetch leaderboard periodically
  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => setLeaderboard(data.top || []))
      .catch(console.error);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginName, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        alert(data.error || 'login failed');
      }
    } catch (e) {
      console.error(e);
      alert('network error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout');
    setUser(null);
  };

  useEffect(() => {
    // create game once the container is mounted and a user is present (auto-login)
    if (!user || !containerRef.current || gameRef.current) return;

    try {
      // define a custom scene class with simple states
    class MainScene extends Phaser.Scene {
      player: any;
      cursors: any;
      stars: any;
      enemies: any;
      scoreText: any;
      state: 'title' | 'play' | 'gameover' = 'title';

      constructor() {
        super({ key: 'MainScene' });
      }

      preload() {
        // nothing to preload for now
      }

      create() {
        this.cameras.main.setBackgroundColor('#000');
        // create a simple particle starfield
        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 1).fillCircle(0, 0, 2);
        gfx.generateTexture('dot', 4, 4);
        gfx.destroy();
        const particles = this.add.particles('dot');
        particles.createEmitter({
          x: { min: 0, max: 800 },
          y: 0,
          speedY: { min: 20, max: 60 },
          lifespan: 4000,
          quantity: 2,
          scale: { start: 1, end: 0 },
          frequency: 100,
        });

        this.add.text(400, 50, 'Marks Video Game', { font: '48px Arial', color: '#ffffff' }).setOrigin(0.5);
        const startBtn = this.add.text(400, 300, 'Click to Start', { font: '32px Arial', color: '#00ff00' }).setOrigin(0.5);
        startBtn.setInteractive();
        startBtn.on('pointerdown', () => {
          startBtn.destroy();
          this.startPlay();
        });
      }

      startPlay() {
        this.state = 'play';
        // player
        this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player);
        (this.player.body as any).collideWorldBounds = true;
        this.cursors = this.input.keyboard.createCursorKeys();

        // score text
        this.scoreText = this.add.text(10, 10, 'Score: 0', { font: '20px Arial', color: '#ffffff' });

        // stars and enemies groups
        this.stars = this.physics.add.group();
        this.enemies = this.physics.add.group();

        const spawnStar = () => {
          const x = Phaser.Math.Between(50, 750);
          const y = Phaser.Math.Between(50, 550);
          const star = this.add.circle(x, y, 10, 0xffff00);
          this.physics.add.existing(star);
          this.stars.add(star);
        };
        const spawnEnemy = () => {
          const x = Phaser.Math.Between(50, 750);
          const y = Phaser.Math.Between(50, 550);
          const enemy = this.add.circle(x, y, 15, 0xff0000);
          this.physics.add.existing(enemy);
          const body = enemy.body as any;
          body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
          body.setBounce(1,1);
          body.setCollideWorldBounds(true);
          this.enemies.add(enemy);
        };

        this.time.addEvent({ delay: 1500, callback: spawnStar, loop: true });
        this.time.addEvent({ delay: 3000, callback: spawnEnemy, loop: true });

        this.physics.add.overlap(this.player, this.stars, (_p: any, s: any) => {
          s.destroy();
          let increment = 1;
          if (user?.is_subscribed) increment = 2;
          setScore((s) => { const v = s + increment; this.scoreText.setText('Score: '+v); return v; });
          fetch('/api/score', { method: 'POST', body: JSON.stringify({ amount: increment }), headers: { 'Content-Type': 'application/json' } }).catch(console.error);
          fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'collect', ts: Date.now() }) }).catch(console.error);
        });

        this.physics.add.overlap(this.player, this.enemies, () => {
          this.gameOver();
        });
      }

      gameOver() {
        this.state = 'gameover';
        this.enemies.clear(true, true);
        this.stars.clear(true, true);
        this.player.destroy();
        const txt = this.add.text(400, 300, 'Game Over\nClick to Restart', { font: '32px Arial', color: '#ffffff', align: 'center' }).setOrigin(0.5);
        txt.setInteractive();
        txt.on('pointerdown', () => {
          txt.destroy();
          this.startPlay();
        });
      }

      update() {
        if (this.state !== 'play') return;
        const body = this.player.body as any;
        body.setVelocity(0);
        if (this.cursors.left.isDown) body.setVelocityX(-200);
        if (this.cursors.right.isDown) body.setVelocityX(200);
        if (this.cursors.up.isDown) body.setVelocityY(-200);
        if (this.cursors.down.isDown) body.setVelocityY(200);
      }
    }

    const config: any = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: MainScene,
    };

      gameRef.current = new Phaser.Game(config);
    } catch (err) {
      console.error('Failed to create Phaser game', err);
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [user]);

  // note: initial request text removed from page output. See console for the original message.
  console.log(`
    Hello there, first of all i would just like to let you know that i love you very much and i would really appreciate your assistance on a project.

    What i want to do is build something that would be a fully built, audit ready, business that would become a multi million dollar project and that would be the most psychologically addicting website for anybody in the world to use, that also provides some kind of business model, so that i could charge subscriptions for the service... and i want this to be the most advanced, most simplistic, most used website that has ever been created in the past, present and future and i want it to be something that would be the most thought provoking, most intriguing, most ground breaking, most easiest project to hit the market and to market to wealthy investors and i would like for you to install and download any and every tool or anything that you may need from the beginning to the end of the project, and i would like for you to do all of that right now please.

    and i would like for this to be a web based video game, and i do not have a whole team working on this, it is just going to be me and you and i want you yto do everything as a master of all knowledfe involved.

    as i asked
  `);
  return (
    <div>
      <h1>Marks Video Game Prototype</h1>
      <p style={{ fontStyle: 'italic' }}>Use arrow keys to move the green square. Collect yellow stars. Avoid red enemies. Click the canvas to start.</p>
      {/* for demo builds we force login, but still render based on user state */}
      {user ? (
        <>
          <p>Logged in as {user.username} <button onClick={handleLogout}>Logout</button></p>
          <p>Score: {score}</p>
          <p>Subscription: {user.is_subscribed ? 'Active' : 'None'}</p>
          <button
            onClick={() => {
              fetch('/api/checkout', { method: 'POST' })
                .then((r) => r.json())
                .then((data) => {
                  if (data.url) window.location.href = data.url;
                })
                .catch(console.error);
            }}
            disabled={user.is_subscribed}
          >
            {user.is_subscribed ? 'Subscribed' : 'Subscribe'}
          </button>
          <div style={{ marginTop: '1rem' }}>
            <h2>Leaderboard</h2>
            <ol>
              {leaderboard.map((entry, i) => (
                <li key={i}>{entry.username}: {entry.score}</li>
              ))}
            </ol>
          </div>
          <div ref={containerRef} />
        </>
      ) : (
        <div>
          <p>Please log in:</p>
          <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="username" />
          <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="password" />
          <button onClick={handleLogin}>Login</button>
        </div>
      )}
      <style jsx global>{`
        body { background: radial-gradient(circle at center, #222 0%, #000 100%); color: #eee; font-family: Arial, sans-serif; text-align: center; }
        div { margin: 0 auto; max-width: 820px; }
        button { padding: 0.5rem 1rem; font-size: 1rem; }
        canvas { border: 2px solid #444; display: block; margin: 1rem auto; background: #000; }
      `}</style>
    </div>
  );
}
