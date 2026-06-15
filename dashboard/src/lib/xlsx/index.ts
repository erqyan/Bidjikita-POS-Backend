// SheetJS vendored ESM module (xlsx 0.20.3 from CDN)
// https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs

// @ts-expect-error - xlsx.mjs has no type declarations (vendored from CDN)
import _XLSX from './xlsx.mjs';

type XLSXType = {
  version: string;
  utils: {
    book_new(ws?: unknown, wsname?: string): unknown;
    json_to_sheet(data: unknown[], opts?: unknown): unknown;
    book_append_sheet(wb: unknown, ws: unknown, name?: string): string;
    sheet_add_aoa(ws: unknown, data: unknown[][], opts?: unknown): unknown;
    sheet_add_json(ws: unknown, data: unknown[], opts?: unknown): unknown;
    decode_range(range: string): unknown;
    encode_range(range: unknown): string;
  };
  writeFile(wb: unknown, filename: string, opts?: unknown): void;
  read(data: unknown, opts?: unknown): unknown;
  readFile(filename: string, opts?: unknown): unknown;
  write(wb: unknown, opts?: unknown): unknown;
};

const XLSX: XLSXType = _XLSX;
export default XLSX;
