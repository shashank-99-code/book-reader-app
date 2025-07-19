declare module 'epub-parser' {
  interface EpubSection {
    id: string;
    title: string;
    htmlContent: string;
    order: number;
  }

  interface EpubBook {
    title: string;
    author: string;
    sections: EpubSection[];
    metadata?: {
      title?: string;
      creator?: string;
      language?: string;
      identifier?: string;
      date?: string;
    };
  }

  export function parseEpub(buffer: Buffer): Promise<EpubBook>;
} 