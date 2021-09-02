import "xpresser/types/http";
import UploadedFile = require("./src/UploadedFile");
import UploadedFiles = require("./src/UploadedFiles");
import { MultipleFilesOptions, SingleFileOptions } from "./src/types";

declare module "xpresser/types/http" {
  interface Http {
    /**
     * Check if request if od type multipart/form-data"
     */
    isMultiPartFormData(): boolean;

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
