import Link from 'next/link'
import Nav from '@/components/Nav'

export default function HomePage() {
  return (
    <div className="page">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '100px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="animate-fade-up">
          <div className="tag" style={{ marginBottom: 28, fontSize: 11 }}>
            ✦ built for indian developers · UPI native
          </div>
        </div>

        <h1 className="animate-fade-up-2" style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(44px, 8vw, 84px)',
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: '-0.035em',
          maxWidth: 820,
          marginBottom: 28,
        }}>
          sell your{' '}
          <span style={{
            color: 'var(--accent)',
            textShadow: '0 0 60px rgba(34,197,94,0.25)',
          }}>
            dev tools
          </span>
          <br />
          get paid in{' '}
          <span style={{ color: 'var(--accent)' }}>₹</span>
        </h1>

        <p className="animate-fade-up-3" style={{
          fontFamily: 'var(--mono)',
          fontSize: 15,
          color: 'var(--text-muted)',
          maxWidth: 460,
          lineHeight: 1.75,
          marginBottom: 44,
        }}>
          Templates, scripts, boilerplates, CLI tools, UI kits.
          Upload once. Sell forever. Get paid via UPI.
          No dollar conversions. No PayPal nightmares.
        </p>

        <div className="animate-fade-up-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/signup">
            <button className="btn-primary" style={{ fontSize: 14, padding: '13px 28px' }}>
              start selling for free →
            </button>
          </Link>
          <Link href="/explore">
            <button className="btn-ghost" style={{ fontSize: 14, padding: '13px 28px' }}>
              browse products
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fade-up-4" style={{
          display: 'flex',
          gap: 56,
          marginTop: 72,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {[
            { value: '5%', label: 'flat fee only' },
            { value: 'UPI', label: 'native payments' },
            { value: '< 60s', label: 'to go live' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '-0.02em',
              }}>{value}</div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--text-dim)',
                marginTop: 4,
                letterSpacing: '0.05em',
              }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <p className="section-label">// how it works</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 2,
          }}>
            {[
              { step: '01', title: 'Create your store', desc: 'Sign up and get a shareable link at devmarket.in/you in under a minute.' },
              { step: '02', title: 'Upload your product', desc: 'Add a ZIP, PDF, or any file. Set your price in ₹. Write a description.' },
              { step: '03', title: 'Share your link', desc: 'Post it on Twitter, LinkedIn, or anywhere. Buyers pay without an account.' },
              { step: '04', title: 'Get paid via UPI', desc: 'Money hits your Razorpay account. Withdraw to your bank instantly.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{
                padding: '28px 24px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--accent)',
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}>{step}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you can sell ─────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <p className="section-label">// what sells here</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {[
              { icon: '⬡', title: 'React components', desc: 'UI kits, design systems' },
              { icon: '⌘', title: 'Boilerplates', desc: 'Next.js, Express starters' },
              { icon: '◈', title: 'CLI tools', desc: 'Scripts and automation' },
              { icon: '▦', title: 'Notion templates', desc: 'For devs and teams' },
              { icon: '◉', title: 'Cursor rules', desc: 'AI coding prompts' },
              { icon: '⬗', title: 'eBooks & guides', desc: 'Tutorials and docs' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card" style={{ cursor: 'default' }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── vs competitors ────────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <p className="section-label">// why not the others</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { name: 'Gumroad', issue: 'No UPI. Dollar-only. 10% fee. Painful for Indian sellers.' },
              { name: 'Instamojo', issue: 'Outdated UI. Not developer-focused. Clunky setup.' },
              { name: 'SAUCE', issue: 'Good but generic — not built specifically for dev tools.' },
              { name: 'DevMarket ✦', issue: 'Built for devs. UPI native. GitHub-flavored. 5% flat.', highlight: true },
            ].map(({ name, issue, highlight }) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 24,
                padding: '16px 20px',
                background: highlight ? 'var(--accent-dim)' : 'var(--surface)',
                border: `1px solid ${highlight ? 'var(--accent-border)' : 'var(--border)'}`,
              }}>
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: highlight ? 'var(--accent)' : 'var(--text)',
                  whiteSpace: 'nowrap',
                }}>{name}</span>
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: highlight ? 'var(--accent)' : 'var(--text-muted)',
                  textAlign: 'right',
                  lineHeight: 1.5,
                }}>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section style={{
        padding: '100px 24px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <p className="section-label" style={{ justifyContent: 'center', display: 'block' }}>
            // ready to ship?
          </p>
          <h2 style={{
            fontFamily: 'var(--sans)',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            Your store is one<br />
            <span style={{ color: 'var(--accent)' }}>signup away.</span>
          </h2>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            marginBottom: 36,
          }}>
            Free to start. No monthly fees. Pay only when you earn.
          </p>
          <Link href="/signup">
            <button className="btn-primary" style={{ fontSize: 15, padding: '14px 32px' }}>
              create your store →
            </button>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <span>devmarket © 2025</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <span>made in india 🇮🇳</span>
        </div>
      </footer>
    </div>
  )
}
