import "xpresser/types/http";
import { UploadedFile, UploadedFiles } from "./types";

declare module "xpresser/types/http" {
  interface Http {
    /**
     * Get file from post request.
     * @return {Promise<UploadedFile>}
     */
    file(
      field: string,
      $options?: {
        size?: number;
        mimetype?: string | RegExp;
        extensions?: string[];
        includeBody?: boolean;
      }
    ): Promise<UploadedFile>;

    /**
     * Get multiple files from post request.
     * @return {Promise<UploadedFiles>}
     */
    files(
      field: string | string[],
      $options?: {
        files?: number;
        size?: number;
        mimetype?: string | RegExp;
        extensions?: string[];
        includeBody?: boolean;
        mimetypeForEachField?: { [field: string]: string | RegExp };
        extensionsForEachField?: { [field: string]: string[] };
      }
    ): Promise<UploadedFiles>;
  }
}
