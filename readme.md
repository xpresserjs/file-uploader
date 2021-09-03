# Xpresser File Uploader Plugin

![Alt text](https://cdn.jsdelivr.net/npm/xpresser/xpresser-logo-black.png "Xpresser Logo")

Built on [busboy](https://npmjs.com/package/busboy), an easy plugin to handle file uploads from form request to your
application storage folder.

Documentation: [xpresserjs.com](https://xpresserjs.com/plugins/@xpresser/file-uploader/)

# Next
**NPM:** `npm i @xpresser/file-uploader@next`

**YARN:** `yarn i @xpresser/file-uploader@next`

This package has been converted to TypeScript.

## New Features
While converting to TypeScript, we decided to chip in a few Features.

### files.errorMessages()
This function returns an array of error messages when handling multiple files upload.
```typescript
const photos = http.files("photos", {
  size: 0.0001 // intentional to make error.
})

if(photos.hasFilesWithErrors()){
  return photos.errorMessages() // [ 'File size is too large.']
}
```

### Custom Error
The example below shows how the default error messages are defined.
<br/>
**Note:** This applies to both `single` and `multi-file` uploads
```typescript
import { Http } from "xpresser/types/http";

export function upload(http: Http){
  return http.file("photo",  {
    size: 1,
    customErrors: {
      field: (err) =>  `field not found: ${err.field}`,
      file: (err) => `No file found for field: ${err.field}`,
      size: "File is too large", // can also be plain string.
      mimetype: (err) => `File: "${err.filename}" mimetype does not match the expected mimetype: ${err.expected}`,
      extension: (err) => `File: "${err.filename}" has unsupported file extension`
    }
  });
}
```

## Breaking Changes
Converting to typescript came with a few breaking changes listed below

### UploadedFile private properties.

The properties belonging to the `UploadedFile` class listed below have been made private using typescript.
They are for internal error checking.

```typescript
[
  "stats",
  "customErrors",
  "cachedError",
  "expectedField",
  "expectedMimetype",
  "reachedLimit",
  "expectedExtensions"
]
```

