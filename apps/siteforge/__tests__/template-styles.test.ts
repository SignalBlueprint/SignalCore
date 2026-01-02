/**
 * Tests for template styles
 */
import { describe, it, expect } from 'vitest';
import { getTemplateStyles } from '../src/template-styles';
import type { TemplateStyle, IndustryType, ColorScheme } from '@sb/schemas';

describe('Template Styles', () => {
  it('should return valid CSS for modern style', () => {
    const styles = getTemplateStyles({ style: 'modern' });

    expect(styles).toBeTruthy();
    expect(typeof styles).toBe('string');
    expect(styles.length).toBeGreaterThan(0);
  });

  it('should return valid CSS for minimal style', () => {
    const styles = getTemplateStyles({ style: 'minimal' });

    expect(styles).toBeTruthy();
    expect(typeof styles).toBe('string');
  });

  it('should return valid CSS for bold style', () => {
    const styles = getTemplateStyles({ style: 'bold' });

    expect(styles).toBeTruthy();
    expect(typeof styles).toBe('string');
  });

  it('should apply color scheme when provided', () => {
    const colorScheme: ColorScheme = {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#111827'
    };

    const styles = getTemplateStyles({
      style: 'modern',
      colorScheme
    });

    expect(styles).toContain('#3B82F6');
  });

  it('should handle different industry types', () => {
    const industries: IndustryType[] = ['saas', 'ecommerce', 'portfolio', 'general'];

    industries.forEach(industry => {
      const styles = getTemplateStyles({
        style: 'modern',
        industryType: industry
      });

      expect(styles).toBeTruthy();
      expect(styles.length).toBeGreaterThan(0);
    });
  });

  it('should return different styles for different templates', () => {
    const modern = getTemplateStyles({ style: 'modern' });
    const minimal = getTemplateStyles({ style: 'minimal' });
    const bold = getTemplateStyles({ style: 'bold' });

    expect(modern).not.toBe(minimal);
    expect(minimal).not.toBe(bold);
    expect(bold).not.toBe(modern);
  });

  it('should include responsive CSS rules', () => {
    const styles = getTemplateStyles({ style: 'modern' });

    expect(styles).toContain('@media');
  });
});
