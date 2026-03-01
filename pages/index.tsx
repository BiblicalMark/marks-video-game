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
    if (!containerRef.current || gameRef.current) return;

    const config: any = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      scene: {
        preload: function (this: any) {
          this.load.setBaseURL('/');
        },
        create: function (this: any) {
          const text = this.add.text(100, 100, 'Click anywhere', { font: '32px Arial', color: '#ffffff' });

          // register click handler
          this.input.on('pointerdown', () => {
            // increment local score immediately
            setScore((s) => s + 1);

            // notify backend score
            fetch('/api/score', { method: 'POST' })
              .then((r) => r.json())
              .catch(console.error);

            // send analytics event
            fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: 'pointerdown', ts: Date.now() }),
            }).catch(console.error);
          });
        }
      }
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

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
    </div>
  );
}
