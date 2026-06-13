import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container" style={{textAlign: 'center', padding: '4rem 0'}}>
        <div style={{
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 30px rgba(0,200,255,0.3), 0 0 60px rgba(0,200,255,0.1)',
            background: 'var(--bg2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img src="/img/logo.jpg" alt="WLKOM Logo" style={{width: '70%', height: 'auto'}} />
          </div>
        </div>
        <Heading as="h1" style={{fontFamily: 'var(--font-title)', fontSize: '4rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#fff'}}>
          <span style={{color: 'var(--accent)'}}>WLK</span>OM
        </Heading>
        <p style={{fontFamily: 'var(--font-title)', fontSize: '1.5rem', letterSpacing: '6px', color: 'var(--text2)', textTransform: 'uppercase'}}>
          {siteConfig.tagline}
        </p>
        <div style={{marginTop: '2rem'}}>
          <Link
            className="button button--primary button--lg"
            to="/overview"
            style={{
              fontFamily: 'var(--font-code)', 
              letterSpacing: '2px', 
              textTransform: 'uppercase',
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '0',
              padding: '1rem 2rem'
            }}>
            Accéder à la Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Rootkit`}
      description="Documentation du rootkit LKM WLKOM">
      <HomepageHeader />
      <main style={{background: 'var(--bg)', minHeight: '40vh'}}>
        <div className="container" style={{padding: '4rem 0'}}>
          <div className="row">
            <div className="col col--4">
              <div style={{background: 'var(--bg2)', padding: '2rem', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)'}}>
                <h3 style={{fontFamily: 'var(--font-title)', color: 'var(--accent)', textTransform: 'uppercase'}}>LKM Rootkit</h3>
                <p style={{color: 'var(--text2)'}}>Développé sous la forme d'un Loadable Kernel Module s'exécutant dans le ring 0.</p>
              </div>
            </div>
            <div className="col col--4">
              <div style={{background: 'var(--bg2)', padding: '2rem', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent2)'}}>
                <h3 style={{fontFamily: 'var(--font-title)', color: 'var(--accent2)', textTransform: 'uppercase'}}>Stealth</h3>
                <p style={{color: 'var(--text2)'}}>Masquage des fichiers, processus, et suppression de la liste lsmod.</p>
              </div>
            </div>
            <div className="col col--4">
              <div style={{background: 'var(--bg2)', padding: '2rem', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent3)'}}>
                <h3 style={{fontFamily: 'var(--font-title)', color: 'var(--accent3)', textTransform: 'uppercase'}}>Persistant</h3>
                <p style={{color: 'var(--text2)'}}>Auto-installation et survie aux redémarrages via un daemon systemd furtif.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
