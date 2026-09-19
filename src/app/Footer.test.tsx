import { render, screen, within } from '@testing-library/react';
import { Footer } from './Footer';
import { footerCredits, footerLinks } from './content-pages';
import { site } from './site';

it('keeps support, creator, artwork, and utility links visible without the legal notice', () => {
  render(<Footer showWordmarkCredit />);
  const footer = screen.getByRole('contentinfo');
  expect(
    within(footer).getByRole('link', { name: 'Buy me a coffee' }),
  ).toHaveAttribute('href', site.supportUrl);
  expect(footer).toHaveTextContent(site.authorName);
  expect(
    within(footer).getByRole('link', { name: site.authorName }),
  ).toHaveAttribute('href', 'https://itai.rave.dev');
  expect(
    within(footer).getByRole('link', { name: 'Contact me' }),
  ).toHaveAttribute('href', `mailto:${site.contactEmail}`);
  for (const { href, label } of footerLinks) {
    expect(within(footer).getByRole('link', { name: label })).toHaveAttribute(
      'href',
      href,
    );
  }
  for (const { href, name } of footerCredits) {
    expect(within(footer).getByRole('link', { name })).toHaveAttribute(
      'href',
      href,
    );
  }
  expect(
    within(footer).getByRole('link', { name: 'TextStudio' }),
  ).toBeVisible();
  expect(footer).not.toHaveTextContent(/Nintendo|unofficial|GAME FREAK/);
});

it('limits the wordmark credit to screens displaying the wordmark', () => {
  render(<Footer />);
  expect(
    screen.queryByRole('link', { name: 'TextStudio' }),
  ).not.toBeInTheDocument();
});
