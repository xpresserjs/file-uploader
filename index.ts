import { Http } from "xpresser/types/http";
import { MultipleFilesOptions, SingleFileOptions } from "./src/types";

/**
 * Export sizeToString Function
 * @param size
 * @param decimals
 */

export function sizeToString(size: number, decimals: number = 0) {
  const bytes = size;
  if (bytes === 0) return "0Bytes";

  const k = 1024;
  const dm = decimals <= 0 ? 0 : decimals || 2;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

export function uploadFile(http: Http, field: string, options: SingleFileOptions) {
  return http.file(field, options);
}

export function uploadFiles(
  http: Http,
  field: string | string[],
  options: MultipleFilesOptions
) {
  return http.files(field, options);
}
