export type SingleFileOptions = Partial<{
  size: number;
  mimetype: false | string | RegExp;
  includeBody: boolean;
  extensions: false | string[];
}>;

export type MultipleFilesOptions = Partial<{
  files: number;
  size: number;
  mimetype: string | RegExp;
  extensions: string[];
  includeBody: boolean;
  mimetypeForEachField: Record<string, any>;
  extensionsForEachField: Record<string, any>;
}>;

export type FileData = {
  tmpPath?: string;
  input: string;
  name: string;
  encoding: string;
  mimetype: string;
  size: number;
  reachedLimit?: boolean;
  expectedInput: string;
  expectedExtensions?: string[];
  expectedMimetype?: string | RegExp;
};

export type FileUploadError = {
  type: "input" | "file" | "size" | "mimetype" | "extension";
  message: string;
  expected?: any;
  received?: string;
};

export type SaveOptions = Partial<{
  name: string;
  overwrite: boolean;
  prependExtension: boolean;
}>;

export type FunctionThatReturnsString<T> = (file: T) => string;
export type FunctionThatReturnsSaveOptions<T> = (file: T) => SaveOptions;
