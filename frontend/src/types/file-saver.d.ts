declare module "file-saver" {
  export function saveAs(data: BlobPart | Blob | File | string, filename?: string, options?: unknown): void;
}
