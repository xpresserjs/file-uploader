import "xpresser/types/http";
import UploadedFile = require("./src/UploadedFile");
import UploadedFiles = require("./src/UploadedFiles");
import { MultipleFilesOptions, SingleFileOptions } from "./src/types";

declare module "xpresser/types/http" {
  interface Http {
    /**
     * Get Single Field
     * @param field
     * @param $options
     */
    file(field: string, $options?: SingleFileOptions): Promise<UploadedFile>;

    /**
     * Get Multiple Fields
     * @param field
     * @param $options
     */
    files(
      field: string | string[],
      $options?: MultipleFilesOptions
    ): Promise<UploadedFiles>;
  }
}
