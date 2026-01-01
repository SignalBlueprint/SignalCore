/**
 * EPUB Service - Parse and extract content from EPUB files
 */
import JSZip from 'jszip'
import axios from 'axios'

interface EPUBMetadata {
  title: string
  author: string
  description?: string
  language?: string
  identifier?: string
}

interface EPUBChapter {
  id: string
  title: string
  content: string
  order: number
}

interface EPUBContent {
  metadata: EPUBMetadata
  chapters: EPUBChapter[]
  toc: Array<{ title: string; href: string }>
}

export class EPUBService {
  /**
   * Parse EPUB file from URL and extract content
   */
  async parseEPUBFromUrl(url: string): Promise<EPUBContent> {
    try {
      // Download EPUB file
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })

      return await this.parseEPUBBuffer(response.data)
    } catch (error) {
      console.error('Error downloading EPUB:', error)
      throw new Error('Failed to download EPUB file')
    }
  }

  /**
   * Parse EPUB from buffer
   */
  async parseEPUBBuffer(buffer: Buffer | ArrayBuffer): Promise<EPUBContent> {
    try {
      const zip = await JSZip.loadAsync(buffer)

      // Read container.xml to find content.opf location
      const containerXml = await zip.file('META-INF/container.xml')?.async('text')
      if (!containerXml) {
        throw new Error('Invalid EPUB: missing container.xml')
      }

      // Extract OPF file path
      const opfPathMatch = containerXml.match(/full-path="([^"]+)"/)
      if (!opfPathMatch) {
        throw new Error('Invalid EPUB: could not find OPF path')
      }

      const opfPath = opfPathMatch[1]
      const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)

      // Read content.opf
      const opfContent = await zip.file(opfPath)?.async('text')
      if (!opfContent) {
        throw new Error('Invalid EPUB: missing OPF file')
      }

      // Extract metadata
      const metadata = this.extractMetadata(opfContent)

      // Extract spine (reading order)
      const spine = this.extractSpine(opfContent)

      // Extract manifest (file references)
      const manifest = this.extractManifest(opfContent)

      // Extract table of contents
      const toc = await this.extractTOC(zip, opfDir, opfContent, manifest)

      // Extract chapters in reading order
      const chapters: EPUBChapter[] = []
      for (let i = 0; i < spine.length; i++) {
        const itemId = spine[i]
        const href = manifest[itemId]

        if (href && href.endsWith('.html') || href?.endsWith('.xhtml')) {
          const filePath = opfDir + href
          const content = await zip.file(filePath)?.async('text')

          if (content) {
            // Clean HTML content
            const cleanContent = this.cleanHTML(content)

            chapters.push({
              id: itemId,
              title: toc.find(t => t.href === href)?.title || `Chapter ${i + 1}`,
              content: cleanContent,
              order: i,
            })
          }
        }
      }

      return {
        metadata,
        chapters,
        toc,
      }
    } catch (error) {
      console.error('Error parsing EPUB:', error)
      throw new Error('Failed to parse EPUB file')
    }
  }

  /**
   * Extract metadata from OPF content
   */
  private extractMetadata(opfContent: string): EPUBMetadata {
    const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)
    const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/)
    const descMatch = opfContent.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/)
    const langMatch = opfContent.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/)
    const identMatch = opfContent.match(/<dc:identifier[^>]*>([^<]+)<\/dc:identifier>/)

    return {
      title: titleMatch ? titleMatch[1] : 'Unknown Title',
      author: authorMatch ? authorMatch[1] : 'Unknown Author',
      description: descMatch ? descMatch[1] : undefined,
      language: langMatch ? langMatch[1] : 'en',
      identifier: identMatch ? identMatch[1] : undefined,
    }
  }

  /**
   * Extract spine (reading order) from OPF
   */
  private extractSpine(opfContent: string): string[] {
    const spineMatch = opfContent.match(/<spine[^>]*>(.*?)<\/spine>/s)
    if (!spineMatch) return []

    const itemrefs = spineMatch[1].match(/idref="([^"]+)"/g) || []
    return itemrefs.map(ref => ref.match(/idref="([^"]+)"/)?.[1] || '')
  }

  /**
   * Extract manifest (file references) from OPF
   */
  private extractManifest(opfContent: string): Record<string, string> {
    const manifestMatch = opfContent.match(/<manifest[^>]*>(.*?)<\/manifest>/s)
    if (!manifestMatch) return {}

    const items = manifestMatch[1].match(/<item[^>]*>/g) || []
    const manifest: Record<string, string> = {}

    items.forEach(item => {
      const idMatch = item.match(/id="([^"]+)"/)
      const hrefMatch = item.match(/href="([^"]+)"/)

      if (idMatch && hrefMatch) {
        manifest[idMatch[1]] = hrefMatch[1]
      }
    })

    return manifest
  }

  /**
   * Extract table of contents from NCX or NAV file
   */
  private async extractTOC(
    zip: JSZip,
    opfDir: string,
    opfContent: string,
    manifest: Record<string, string>
  ): Promise<Array<{ title: string; href: string }>> {
    // Try to find NCX file (EPUB 2)
    const ncxId = opfContent.match(/item[^>]*media-type="application\/x-dtbncx\+xml"[^>]*id="([^"]+)"/)?.[1]
    if (ncxId && manifest[ncxId]) {
      const ncxPath = opfDir + manifest[ncxId]
      const ncxContent = await zip.file(ncxPath)?.async('text')

      if (ncxContent) {
        return this.parseNCX(ncxContent)
      }
    }

    // Try to find NAV file (EPUB 3)
    const navId = opfContent.match(/item[^>]*properties="nav"[^>]*id="([^"]+)"/)?.[1]
    if (navId && manifest[navId]) {
      const navPath = opfDir + manifest[navId]
      const navContent = await zip.file(navPath)?.async('text')

      if (navContent) {
        return this.parseNAV(navContent)
      }
    }

    return []
  }

  /**
   * Parse NCX (EPUB 2 navigation)
   */
  private parseNCX(ncxContent: string): Array<{ title: string; href: string }> {
    const navPoints = ncxContent.match(/<navPoint[^>]*>.*?<\/navPoint>/gs) || []
    const toc: Array<{ title: string; href: string }> = []

    navPoints.forEach(point => {
      const labelMatch = point.match(/<text>([^<]+)<\/text>/)
      const srcMatch = point.match(/<content[^>]*src="([^"]+)"/)

      if (labelMatch && srcMatch) {
        // Remove fragment identifier (#...)
        const href = srcMatch[1].split('#')[0]
        toc.push({
          title: labelMatch[1],
          href,
        })
      }
    })

    return toc
  }

  /**
   * Parse NAV (EPUB 3 navigation)
   */
  private parseNAV(navContent: string): Array<{ title: string; href: string }> {
    const links = navContent.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g) || []
    const toc: Array<{ title: string; href: string }> = []

    links.forEach(link => {
      const match = link.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/)
      if (match) {
        const href = match[1].split('#')[0]
        const title = match[2]
        toc.push({ title, href })
      }
    })

    return toc
  }

  /**
   * Clean HTML content for display
   */
  private cleanHTML(html: string): string {
    // Remove XML declaration
    let clean = html.replace(/<\?xml[^>]*\?>/i, '')

    // Remove DOCTYPE
    clean = clean.replace(/<!DOCTYPE[^>]*>/i, '')

    // Extract body content if present
    const bodyMatch = clean.match(/<body[^>]*>(.*)<\/body>/is)
    if (bodyMatch) {
      clean = bodyMatch[1]
    }

    // Remove style tags
    clean = clean.replace(/<style[^>]*>.*?<\/style>/gis, '')

    // Remove script tags
    clean = clean.replace(/<script[^>]*>.*?<\/script>/gis, '')

    return clean.trim()
  }
}
