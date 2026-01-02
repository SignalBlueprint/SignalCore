/**
 * Tests for HTML generation
 */
import { describe, it, expect } from 'vitest';
import { generateHTML } from '../src/html-generator';
import type { SiteMetadata, PageComponent } from '@sb/schemas';

describe('HTML Generator', () => {
  const mockMetadata: SiteMetadata = {
    title: 'Test Site',
    description: 'A test website',
    keywords: ['test', 'demo'],
    author: 'Test Author',
    ogImage: 'https://example.com/og.jpg'
  };

  const mockComponents: PageComponent[] = [
    {
      type: 'hero',
      order: 0,
      content: {
        heading: 'Welcome to Test Site',
        subheading: 'We build amazing things',
        buttonText: 'Get Started',
        buttonLink: '#contact'
      }
    },
    {
      type: 'about',
      order: 1,
      content: {
        heading: 'About Us',
        subheading: 'We are a test company',
        body: 'Our values: Quality, Innovation, Trust'
      }
    }
  ];

  it('should generate valid HTML structure', () => {
    const html = generateHTML(mockMetadata, mockComponents, 'TestBiz');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  it('should include metadata in head', () => {
    const html = generateHTML(mockMetadata, mockComponents, 'TestBiz');

    expect(html).toContain('<title>Test Site</title>');
    expect(html).toContain('A test website');
    expect(html).toContain('test, demo');
  });

  it('should render components in correct order', () => {
    const html = generateHTML(mockMetadata, mockComponents, 'TestBiz');

    const heroIndex = html.indexOf('Welcome to Test Site');
    const aboutIndex = html.indexOf('About Us');

    expect(heroIndex).toBeGreaterThan(-1);
    expect(aboutIndex).toBeGreaterThan(-1);
    expect(heroIndex).toBeLessThan(aboutIndex);
  });

  it('should handle different template styles', () => {
    const modernHtml = generateHTML(mockMetadata, mockComponents, 'TestBiz', 'modern');
    const minimalHtml = generateHTML(mockMetadata, mockComponents, 'TestBiz', 'minimal');
    const boldHtml = generateHTML(mockMetadata, mockComponents, 'TestBiz', 'bold');

    expect(modernHtml).toBeTruthy();
    expect(minimalHtml).toBeTruthy();
    expect(boldHtml).toBeTruthy();
  });

  it('should accept business name parameter', () => {
    // Note: Current implementation doesn't use businessName in output
    // This test just ensures the parameter is accepted
    const html = generateHTML(mockMetadata, mockComponents, 'TestBusiness');

    expect(html).toBeTruthy();
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('should handle empty components array', () => {
    const html = generateHTML(mockMetadata, [], 'TestBiz');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<body>');
  });
});
