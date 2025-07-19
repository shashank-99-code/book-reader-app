declare module 'adm-zip' {
  interface IZipEntry {
    entryName: string;
    getData(): Buffer;
    getDataAsync(callback: (data: Buffer) => void): void;
    isDirectory: boolean;
  }

  class AdmZip {
    constructor(file?: Buffer | string);
    getEntries(): IZipEntry[];
    getEntry(name: string): IZipEntry | null;
    extractAllTo(targetPath: string, overwrite?: boolean): void;
    readAsText(fileName: string, encoding?: string): string;
  }

  export = AdmZip;
} 