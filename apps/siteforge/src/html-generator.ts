/**
 * HTML template generator for website components
 */

import { PageComponent, SiteMetadata, ComponentType } from "@sb/schemas";

/**
 * Generate complete HTML page from components and metadata
 */
export function generateHTML(
  metadata: SiteMetadata,
  components: PageComponent[],
  businessName: string
): string {
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  const head = generateHead(metadata);
  const body = generateBody(sortedComponents, businessName);

  return `<!DOCTYPE html>
<html lang="en">
${head}
${body}
</html>`;
}

/**
 * Generate HTML head section
 */
function generateHead(metadata: SiteMetadata): string {
  const keywords = metadata.keywords.join(", ");

  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.title)}</title>
  <meta name="description" content="${escapeHtml(metadata.description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="theme-color" content="${metadata.themeColor}">

  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(metadata.title)}">
  <meta property="og:description" content="${escapeHtml(metadata.description)}">
  ${metadata.ogImage ? `<meta property="og:image" content="${metadata.ogImage}">` : ""}

  <!-- Favicon -->
  ${metadata.favicon ? `<link rel="icon" href="${metadata.favicon}">` : ""}

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    section {
      padding: 60px 20px;
    }

    h1, h2, h3, h4 {
      margin-bottom: 1rem;
      line-height: 1.2;
    }

    h1 {
      font-size: 3rem;
      font-weight: 700;
    }

    h2 {
      font-size: 2.5rem;
      font-weight: 600;
      text-align: center;
      margin-bottom: 1.5rem;
    }

    h3 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    p {
      margin-bottom: 1rem;
      font-size: 1.125rem;
    }

    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: ${metadata.themeColor};
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      font-size: 1rem;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-top: 40px;
    }

    .card {
      padding: 30px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
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
      padding: 100px 20px;
    }

    .hero h1 {
      margin-bottom: 1.5rem;
    }

    .hero p {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      opacity: 0.95;
    }

    .footer {
      background: #1a1a1a;
      color: white;
      text-align: center;
      padding: 40px 20px;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 30px;
      margin-top: 40px;
    }

    .pricing-card {
      padding: 40px 30px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .pricing-card:hover {
      border-color: ${metadata.themeColor};
      transform: scale(1.05);
    }

    .price {
      font-size: 3rem;
      font-weight: 700;
      color: ${metadata.themeColor};
      margin: 20px 0;
    }

    .testimonial {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 12px;
      font-style: italic;
    }

    .testimonial-author {
      margin-top: 15px;
      font-weight: 600;
      font-style: normal;
      color: ${metadata.themeColor};
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
        padding: 60px 20px;
      }

      .hero p {
        font-size: 1.25rem;
      }

      section {
        padding: 40px 20px;
      }
    }
  </style>
</head>`;
}

/**
 * Generate HTML body section
 */
function generateBody(components: PageComponent[], businessName: string): string {
  const componentHtml = components.map((comp) => generateComponent(comp)).join("\n");

  return `<body>
${componentHtml}
</body>`;
}

/**
 * Generate HTML for a single component
 */
function generateComponent(component: PageComponent): string {
  switch (component.type) {
    case "hero":
      return generateHero(component);
    case "about":
      return generateAbout(component);
    case "features":
    case "services":
      return generateFeatures(component);
    case "pricing":
      return generatePricing(component);
    case "testimonials":
      return generateTestimonials(component);
    case "cta":
      return generateCTA(component);
    case "contact":
      return generateContact(component);
    case "footer":
      return generateFooter(component);
    default:
      return "";
  }
}

/**
 * Hero section generator
 */
function generateHero(component: PageComponent): string {
  const { heading, subheading, body, buttonText, buttonLink, backgroundColor, textColor } =
    component.content;

  return `<section class="hero" style="background: ${backgroundColor || "#3B82F6"}; color: ${textColor || "#FFFFFF"};">
  <div class="container">
    <h1>${escapeHtml(heading || "Welcome")}</h1>
    ${subheading ? `<p>${escapeHtml(subheading)}</p>` : ""}
    ${body ? `<p>${escapeHtml(body)}</p>` : ""}
    ${buttonText ? `<a href="${buttonLink || "#"}" class="btn" style="background: white; color: ${backgroundColor || "#3B82F6"};">${escapeHtml(buttonText)}</a>` : ""}
  </div>
</section>`;
}

/**
 * About section generator
 */
function generateAbout(component: PageComponent): string {
  const { heading, subheading, body } = component.content;

  return `<section id="about">
  <div class="container">
    <h2>${escapeHtml(heading || "About Us")}</h2>
    ${subheading ? `<p class="text-center" style="font-size: 1.25rem; margin-bottom: 2rem;">${escapeHtml(subheading)}</p>` : ""}
    ${body ? `<p style="max-width: 800px; margin: 0 auto; text-align: center;">${escapeHtml(body)}</p>` : ""}
  </div>
</section>`;
}

/**
 * Features/Services section generator
 */
function generateFeatures(component: PageComponent): string {
  const { heading, subheading, items } = component.content;

  const itemsHtml = (items || [])
    .map(
      (item) => `
    <div class="card">
      ${item.icon ? `<div style="font-size: 3rem; margin-bottom: 1rem;">${item.icon}</div>` : ""}
      <h3>${escapeHtml(item.title || "")}</h3>
      <p>${escapeHtml(item.description || "")}</p>
    </div>
  `
    )
    .join("");

  return `<section id="features" style="background: #f8f9fa;">
  <div class="container">
    <h2>${escapeHtml(heading || "Features")}</h2>
    ${subheading ? `<p class="text-center" style="font-size: 1.25rem; margin-bottom: 2rem;">${escapeHtml(subheading)}</p>` : ""}
    <div class="grid">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

/**
 * Pricing section generator
 */
function generatePricing(component: PageComponent): string {
  const { heading, subheading, items } = component.content;

  const itemsHtml = (items || [])
    .map(
      (item) => `
    <div class="pricing-card">
      <h3>${escapeHtml(item.title || "")}</h3>
      <div class="price">${escapeHtml(item.price || "")}</div>
      <p>${escapeHtml(item.description || "")}</p>
    </div>
  `
    )
    .join("");

  return `<section id="pricing">
  <div class="container">
    <h2>${escapeHtml(heading || "Pricing")}</h2>
    ${subheading ? `<p class="text-center" style="font-size: 1.25rem; margin-bottom: 2rem;">${escapeHtml(subheading)}</p>` : ""}
    <div class="pricing-grid">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

/**
 * Testimonials section generator
 */
function generateTestimonials(component: PageComponent): string {
  const { heading, items } = component.content;

  const itemsHtml = (items || [])
    .map(
      (item) => `
    <div class="testimonial">
      <p>"${escapeHtml(item.description || "")}"</p>
      <div class="testimonial-author">— ${escapeHtml(item.title || "")}</div>
    </div>
  `
    )
    .join("");

  return `<section id="testimonials" style="background: #f8f9fa;">
  <div class="container">
    <h2>${escapeHtml(heading || "Testimonials")}</h2>
    <div class="grid">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

/**
 * CTA section generator
 */
function generateCTA(component: PageComponent): string {
  const { heading, subheading, buttonText, buttonLink, backgroundColor, textColor } =
    component.content;

  return `<section id="cta" style="background: ${backgroundColor || "#3B82F6"}; color: ${textColor || "#FFFFFF"};">
  <div class="container text-center">
    <h2 style="color: inherit;">${escapeHtml(heading || "Get Started Today")}</h2>
    ${subheading ? `<p style="font-size: 1.5rem; margin-bottom: 2rem;">${escapeHtml(subheading)}</p>` : ""}
    ${buttonText ? `<a href="${buttonLink || "#contact"}" class="btn" style="background: white; color: ${backgroundColor || "#3B82F6"};">${escapeHtml(buttonText)}</a>` : ""}
  </div>
</section>`;
}

/**
 * Contact section generator
 */
function generateContact(component: PageComponent): string {
  const { heading, subheading, body } = component.content;

  return `<section id="contact">
  <div class="container text-center">
    <h2>${escapeHtml(heading || "Contact Us")}</h2>
    ${subheading ? `<p style="font-size: 1.25rem; margin-bottom: 2rem;">${escapeHtml(subheading)}</p>` : ""}
    ${body ? `<p>${escapeHtml(body)}</p>` : ""}
  </div>
</section>`;
}

/**
 * Footer section generator
 */
function generateFooter(component: PageComponent): string {
  const { body } = component.content;

  return `<footer class="footer">
  <div class="container">
    <p>${escapeHtml(body || "")}</p>
  </div>
</footer>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}
