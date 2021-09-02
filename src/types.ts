import UploadedFile from "./UploadedFile";

export type FileUploadError = {
  type: "field" | "file" | "size" | "mimetype" | "extension";
  field: string;
  filename: string;
  message: string;
  expected?: any;
  received?: string;
};

export type CustomErrors = {
  [key in FileUploadError["type"]]?: string | ((err: FileUploadError) => string);
};

export type SingleFileOptions = Partial<{
  size: number;
  mimetype: string | RegExp;
  includeBody: boolean;
  extensions: string[];
  customErrors: CustomErrors;
}>;

export type MultipleFilesOptions = Partial<{
  files: number;
  size: number;
  mimetype: string | RegExp;
  extensions: string[];
  includeBody: boolean;
  mimetypeForEachField: Record<string, string | RegExp>;
  extensionsForEachField: Record<string, string[]>;
  customErrors: CustomErrors;
}>;

export type FileData = {
  tmpPath?: string;
  field: string;
  name: string;
  encoding: string;
  mimetype: string;
  size: number;
  reachedLimit?: boolean;
  expectedField: string;
  expectedExtensions?: string[];
  expectedMimetype?: string | RegExp;
};

export type SaveOptions = Partial<{
  name: string;
  overwrite: boolean;
  prependExtension: boolean;
}>;

export type FunctionThatReturnsString<T> = (file: T) => string;
export type FunctionThatReturnsSaveOptions<T> = (file: T) => SaveOptions;
