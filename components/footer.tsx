import Link from 'next/link';
import { BUSINESS, catHref } from '@/lib/catalog';
import { localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { NewsletterForm } from './chrome';
import { Asset, Icon, eyebrowYellow } from './ui';

export function SiteFooter({ locale }: { locale: Locale }) {
  const f = messages[locale].footer;
  const href = (p: string) => localePath(locale, p);
  return (
    <>
      <section className="newsletter">
        <div className="container newsletter-grid">
          <div>
            <div className="eyebrow" style={eyebrowYellow}>{f.eyebrow}</div>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link href={href('/')} className="footer-brand">
                <Asset className="footer-logo" name="agrotires-logo-web.webp" alt={f.logoAlt} sizes="64px" />
                <div><div className="brand-name">AGROTIRES</div><span className="brand-sub">INSTANT SOLUTION</span></div>
              </Link>
              <p>{f.about}</p>
              <span className="tag" style={{ background: '#204a3e', color: '#d7f5df' }}>{f.tag}</span>
            </div>
            <div>
              <h4>{f.explore}</h4>
              <div className="footer-links">
                <Link href={href('/shop')}>{f.shopAll}</Link>
                <Link href={href(catHref('tires'))}>{f.tires}</Link>
                <Link href={href(catHref('parts'))}>{f.parts}</Link>
                <Link href={href(catHref('equipment'))}>{f.equipment}</Link>
                <Link href={href('/finder')}>{f.findPart}</Link>
              </div>
            </div>
            <div>
              <h4>{f.support}</h4>
              <div className="footer-links">
                <Link href={href('/help')}>{f.center}</Link>
                <Link href={href('/quote')}>{f.quote}</Link>
                <Link href={href('/track')}>{f.track}</Link>
                <Link href={href('/about')}>{f.aboutLink}</Link>
                <Link href={href('/guides')}>{f.hub}</Link>
                <Link href={href('/account')}>{f.account}</Link>
              </div>
            </div>
            <div>
              <h4>{f.information}</h4>
              <div className="footer-links">
                <Link href={href('/policies/shipping')}>{f.shipping}</Link>
                <Link href={href('/policies/returns')}>{f.returns}</Link>
                <Link href={href('/policies/privacy')}>{f.privacy}</Link>
                <Link href={href('/setup')}>{f.checklist}</Link>
                <Link href={href('/help')}>{f.contact}</Link>
                <a href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
                <span className="footer-domain">{f.website} {BUSINESS.domain}</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {f.rights}</span>
            <div className="foot-pills"><span>{f.pill1}</span><span>{f.pill2}</span></div>
          </div>
        </div>
      </footer>
    </>
  );
}
