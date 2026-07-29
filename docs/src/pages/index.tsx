import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Un solo producto',
    description: (
      <>
        Pagos, contabilidad, marketing, WhatsApp, inventario y tienda en un único panel.
        Sin múltiples suscripciones ni datos fragmentados.
      </>
    ),
  },
  {
    title: 'Contabilidad automática',
    description: (
      <>
        Integración nativa con Siigo y Alegra. Cada venta genera factura electrónica DIAN
        con CUFE y QR, sin intervención humana.
      </>
    ),
  },
  {
    title: 'Generador de tiendas con IA',
    description: (
      <>
        El AI Engine genera tiendas personalizadas por sector con catálogo, precios y
        contenido optimizado para Colombia y Latam.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md padding-vert--lg">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro/que-es-goshopping">
            Empezar →
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            style={{marginLeft: '1rem'}}
            to="/docs/guias/setup-local">
            Setup Local
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Middleware inteligente para e-commerce en Colombia y Latam">
      <HomepageHeader />
      <main>
        <section style={{padding: '4rem 0'}}>
          <div className="container">
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
        <section style={{background: 'var(--ifm-color-emphasis-100)', padding: '3rem 0'}}>
          <div className="container text--center">
            <Heading as="h2">Estado del proyecto</Heading>
            <p>Etapa 1 completada — Monorepo, infraestructura, auth, base de datos, event bus</p>
            <div className="row" style={{marginTop: '2rem', justifyContent: 'center'}}>
              {[
                {label: '9 tablas PostgreSQL', status: '✅'},
                {label: 'Auth JWT completo', status: '✅'},
                {label: 'Docker Compose local', status: '✅'},
                {label: 'Terraform AWS', status: '✅'},
                {label: 'CI/CD con OIDC', status: '✅'},
                {label: 'Event Bus SQS', status: '✅'},
              ].map(({label, status}) => (
                <div key={label} className="col col--2" style={{marginBottom: '1rem'}}>
                  <div style={{
                    background: 'var(--ifm-background-color)',
                    borderRadius: '8px',
                    padding: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}>
                    <div style={{fontSize: '1.5rem'}}>{status}</div>
                    <div style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
