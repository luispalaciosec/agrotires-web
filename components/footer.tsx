import Link from 'next/link';
import { BUSINESS, catHref } from '@/lib/catalog';
import { NewsletterForm } from './chrome';
import { Asset, Icon, eyebrowYellow } from './ui';

export function SiteFooter() {
  return (
    <>
      <section className="newsletter">
        <div className="container newsletter-grid">
          <div>
            <div className="eyebrow" style={eyebrowYellow}>STAY IN THE LOOP</div>
            <h2>Good things grow from here.</h2>
            <p>Agricultural insights and future store updates. Signup will be available at launch.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link href="/" className="footer-brand">
                <Asset className="footer-logo" name="agrotires-logo-web.webp" alt="AGROTIRES logo" sizes="64px" />
                <div><div className="brand-name">AGROTIRES</div><span className="brand-sub">INSTANT SOLUTION</span></div>
              </Link>
              <p>A smarter way to explore agricultural tires, machinery parts, equipment and practical solutions. Built with the farm in mind.</p>
              <span className="tag" style={{ background: '#204a3e', color: '#d7f5df' }}>Storefront preview · USA</span>
            </div>
            <div>
              <h4>EXPLORE</h4>
              <div className="footer-links">
                <Link href="/shop">Shop all products</Link>
                <Link href={catHref('tires')}>Tires &amp; wheels</Link>
                <Link href={catHref('parts')}>Machinery parts</Link>
                <Link href={catHref('equipment')}>Farm equipment</Link>
                <Link href="/finder">Find a part</Link>
              </div>
            </div>
            <div>
              <h4>SUPPORT</h4>
              <div className="footer-links">
                <Link href="/help">Instant Solution Center</Link>
                <Link href="/quote">Request a quote</Link>
                <Link href="/about">About AGROTIRES</Link>
                <Link href="/guides">Knowledge hub</Link>
                <Link href="/account">My account</Link>
              </div>
            </div>
            <div>
              <h4>INFORMATION</h4>
              <div className="footer-links">
                <Link href="/policies/shipping">Shipping information</Link>
                <Link href="/policies/returns">Returns &amp; warranties</Link>
                <Link href="/policies/privacy">Privacy overview</Link>
                <Link href="/setup">Launch checklist</Link>
                <Link href="/help">Contact</Link>
                <a href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
                <span className="footer-domain">Website: {BUSINESS.domain}</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} AGROTIRES. Demonstration website. No live merchandise, payments or fulfillment.</span>
            <div className="foot-pills"><span>Modern agriculture</span><span>Designed for easy shopping</span></div>
          </div>
        </div>
      </footer>
    </>
  );
}
