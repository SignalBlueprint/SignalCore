/**
 * Template style variations for SiteForge
 */

import { TemplateStyle, IndustryType, ColorScheme } from "@sb/schemas";

export interface TemplateConfig {
  style: TemplateStyle;
  industryType?: IndustryType;
  colorScheme?: ColorScheme;
}

/**
 * Default color schemes for each industry type
 */
export const industryColorSchemes: Record<IndustryType, ColorScheme> = {
  saas: {
    primary: "#3B82F6", // Blue
    secondary: "#8B5CF6", // Purple
    accent: "#10B981", // Green
    background: "#FFFFFF",
    text: "#1F2937",
  },
  ecommerce: {
    primary: "#EC4899", // Pink
    secondary: "#F59E0B", // Amber
    accent: "#EF4444", // Red
    background: "#FFFFFF",
    text: "#111827",
  },
  portfolio: {
    primary: "#6366F1", // Indigo
    secondary: "#8B5CF6", // Purple
    accent: "#06B6D4", // Cyan
    background: "#FFFFFF",
    text: "#0F172A",
  },
  general: {
    primary: "#3B82F6", // Blue
    secondary: "#6B7280", // Gray
    accent: "#10B981", // Green
    background: "#FFFFFF",
    text: "#1F2937",
  },
};

/**
 * Get the color scheme for a project
 */
export function getColorScheme(
  customScheme?: ColorScheme,
  industryType?: IndustryType
): ColorScheme {
  const defaultScheme = industryType
    ? industryColorSchemes[industryType]
    : industryColorSchemes.general;

  return {
    ...defaultScheme,
    ...customScheme,
  };
}

/**
 * Generate CSS styles for the Modern template
 */
export function generateModernStyles(colors: ColorScheme): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${colors.text};
      background: ${colors.background};
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    section {
      padding: 80px 24px;
    }

    h1, h2, h3, h4 {
      margin-bottom: 1rem;
      line-height: 1.2;
      font-weight: 700;
    }

    h1 {
      font-size: 3.5rem;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 2.75rem;
      text-align: center;
      margin-bottom: 1.5rem;
      letter-spacing: -0.01em;
    }

    h3 {
      font-size: 1.75rem;
      font-weight: 600;
    }

    p {
      margin-bottom: 1rem;
      font-size: 1.125rem;
      line-height: 1.75;
    }

    .btn {
      display: inline-block;
      padding: 14px 36px;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary || colors.primary} 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      font-size: 1.0625rem;
      box-shadow: 0 4px 14px 0 rgba(0,0,0,0.1);
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 32px;
      margin-top: 48px;
    }

    .card {
      padding: 36px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.06);
      transition: all 0.3s ease;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.08);
      border-color: ${colors.primary};
    }

    .text-center {
      text-align: center;
    }

    .hero {
      min-height: 600px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 120px 24px;
    }

    .hero h1 {
      margin-bottom: 1.5rem;
    }

    .hero p {
      font-size: 1.5rem;
      margin-bottom: 2.5rem;
      opacity: 0.95;
      line-height: 1.6;
    }

    .footer {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: white;
      text-align: center;
      padding: 48px 24px;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      margin-top: 48px;
    }

    .pricing-card {
      padding: 48px 36px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      text-align: center;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .pricing-card:hover {
      border-color: ${colors.primary};
      transform: scale(1.03);
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
    }

    .price {
      font-size: 3.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent || colors.primary} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 24px 0;
    }

    .testimonial {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 36px;
      border-radius: 16px;
      font-style: italic;
      border-left: 4px solid ${colors.primary};
    }

    .testimonial-author {
      margin-top: 16px;
      font-weight: 600;
      font-style: normal;
      color: ${colors.primary};
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 2.25rem;
      }

      h2 {
        font-size: 2rem;
      }

      .hero {
        min-height: 500px;
        padding: 80px 24px;
      }

      .hero p {
        font-size: 1.25rem;
      }

      section {
        padding: 60px 24px;
      }
    }
  `;
}

/**
 * Generate CSS styles for the Minimal template
 */
export function generateMinimalStyles(colors: ColorScheme): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.8;
      color: ${colors.text};
      background: ${colors.background};
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 32px;
    }

    section {
      padding: 100px 32px;
    }

    h1, h2, h3, h4 {
      margin-bottom: 1.5rem;
      line-height: 1.3;
      font-weight: 400;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }

    h1 {
      font-size: 3rem;
      letter-spacing: 0.02em;
    }

    h2 {
      font-size: 2.25rem;
      text-align: center;
      margin-bottom: 2rem;
      letter-spacing: 0.01em;
    }

    h3 {
      font-size: 1.5rem;
      font-weight: 500;
    }

    p {
      margin-bottom: 1.25rem;
      font-size: 1.125rem;
      line-height: 1.9;
    }

    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: ${colors.text};
      color: ${colors.background};
      text-decoration: none;
      border-radius: 0;
      font-weight: 500;
      transition: all 0.2s ease;
      border: 2px solid ${colors.text};
      cursor: pointer;
      font-size: 0.9375rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .btn:hover {
      background: transparent;
      color: ${colors.text};
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 48px;
      margin-top: 64px;
    }

    .card {
      padding: 0;
      background: transparent;
      border: none;
      transition: opacity 0.2s ease;
    }

    .card:hover {
      opacity: 0.8;
    }

    .text-center {
      text-align: center;
    }

    .hero {
      min-height: 500px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 140px 32px;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }

    .hero h1 {
      margin-bottom: 2rem;
    }

    .hero p {
      font-size: 1.375rem;
      margin-bottom: 3rem;
      opacity: 0.9;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }

    .footer {
      background: transparent;
      color: ${colors.text};
      text-align: center;
      padding: 64px 32px;
      border-top: 1px solid rgba(0,0,0,0.1);
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 48px;
      margin-top: 64px;
    }

    .pricing-card {
      padding: 48px 32px;
      background: transparent;
      border: 1px solid rgba(0,0,0,0.15);
      text-align: center;
      transition: all 0.2s ease;
    }

    .pricing-card:hover {
      border-color: ${colors.text};
    }

    .price {
      font-size: 2.5rem;
      font-weight: 400;
      color: ${colors.text};
      margin: 32px 0;
      font-family: 'Georgia', 'Times New Roman', serif;
    }

    .testimonial {
      background: transparent;
      padding: 32px 0;
      border-left: 2px solid ${colors.text};
      padding-left: 32px;
      font-style: italic;
      font-size: 1.0625rem;
    }

    .testimonial-author {
      margin-top: 20px;
      font-weight: 500;
      font-style: normal;
      color: ${colors.text};
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 2rem;
      }

      h2 {
        font-size: 1.75rem;
      }

      .hero {
        min-height: 400px;
        padding: 100px 32px;
      }

      .hero p {
        font-size: 1.125rem;
      }

      section {
        padding: 80px 32px;
      }
    }
  `;
}

/**
 * Generate CSS styles for the Bold template
 */
export function generateBoldStyles(colors: ColorScheme): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Impact', 'Arial Black', sans-serif;
      line-height: 1.5;
      color: ${colors.text};
      background: ${colors.background};
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 40px;
    }

    section {
      padding: 80px 40px;
    }

    h1, h2, h3, h4 {
      margin-bottom: 1.25rem;
      line-height: 1.1;
      font-weight: 900;
      text-transform: uppercase;
    }

    h1 {
      font-size: 4.5rem;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent || colors.primary} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    h2 {
      font-size: 3.5rem;
      text-align: center;
      margin-bottom: 2rem;
      letter-spacing: -0.02em;
    }

    h3 {
      font-size: 2rem;
      font-weight: 800;
    }

    p {
      margin-bottom: 1rem;
      font-size: 1.25rem;
      line-height: 1.7;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-weight: 500;
    }

    .btn {
      display: inline-block;
      padding: 18px 48px;
      background: ${colors.primary};
      color: white;
      text-decoration: none;
      border-radius: 0;
      font-weight: 900;
      transition: all 0.2s ease;
      border: 4px solid ${colors.primary};
      cursor: pointer;
      font-size: 1.125rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      box-shadow: 8px 8px 0 ${colors.accent || colors.secondary || '#000'};
    }

    .btn:hover {
      transform: translate(4px, 4px);
      box-shadow: 4px 4px 0 ${colors.accent || colors.secondary || '#000'};
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 40px;
      margin-top: 60px;
    }

    .card {
      padding: 40px;
      background: white;
      border: 4px solid ${colors.text};
      box-shadow: 12px 12px 0 ${colors.primary};
      transition: all 0.2s ease;
    }

    .card:hover {
      transform: translate(6px, 6px);
      box-shadow: 6px 6px 0 ${colors.primary};
    }

    .text-center {
      text-align: center;
    }

    .hero {
      min-height: 700px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 120px 40px;
      position: relative;
    }

    .hero h1 {
      margin-bottom: 2rem;
      text-shadow: 4px 4px 0 rgba(0,0,0,0.1);
    }

    .hero p {
      font-size: 1.75rem;
      margin-bottom: 3rem;
      font-weight: 700;
      color: ${colors.text};
    }

    .footer {
      background: ${colors.text};
      color: ${colors.background};
      text-align: center;
      padding: 60px 40px;
      border-top: 8px solid ${colors.primary};
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 40px;
      margin-top: 60px;
    }

    .pricing-card {
      padding: 50px 40px;
      background: white;
      border: 4px solid ${colors.text};
      text-align: center;
      transition: all 0.2s ease;
      box-shadow: 12px 12px 0 ${colors.accent || colors.primary};
    }

    .pricing-card:hover {
      transform: translate(6px, 6px);
      box-shadow: 6px 6px 0 ${colors.accent || colors.primary};
    }

    .price {
      font-size: 4rem;
      font-weight: 900;
      color: ${colors.primary};
      margin: 28px 0;
      text-transform: uppercase;
    }

    .testimonial {
      background: ${colors.primary};
      color: white;
      padding: 40px;
      font-style: italic;
      border: 4px solid ${colors.text};
      box-shadow: 8px 8px 0 ${colors.accent || colors.secondary || '#000'};
      font-size: 1.125rem;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }

    .testimonial-author {
      margin-top: 20px;
      font-weight: 800;
      font-style: normal;
      color: ${colors.background};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 2.5rem;
      }

      h2 {
        font-size: 2rem;
      }

      .hero {
        min-height: 550px;
        padding: 100px 40px;
      }

      .hero p {
        font-size: 1.25rem;
      }

      section {
        padding: 60px 40px;
      }

      .btn {
        padding: 16px 40px;
        font-size: 1rem;
      }
    }
  `;
}

/**
 * Get the appropriate CSS styles based on template configuration
 */
export function getTemplateStyles(config: TemplateConfig): string {
  const colors = getColorScheme(config.colorScheme, config.industryType);

  switch (config.style) {
    case "modern":
      return generateModernStyles(colors);
    case "minimal":
      return generateMinimalStyles(colors);
    case "bold":
      return generateBoldStyles(colors);
    default:
      return generateModernStyles(colors);
  }
}
