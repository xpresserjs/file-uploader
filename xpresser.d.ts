import "xpresser/types/http";
import UploadedFile = require("./js/src/UploadedFile");
import UploadedFiles = require("./js/src/UploadedFiles");
import { MultipleFilesOptions, SingleFileOptions } from "./js/src/types";

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
