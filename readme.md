# Xpresser File Uploader
Note: XpresserJs also supports all express supported file handling libraries.

Built on [busboy](https://npmjs.com/package/busboy), an easy plugin to handle file uploads from form request to your application storage folder.


## Installation
#### NPM
```sh
npm install @xpresser/file-uploader
```
#### YARN
```sh
yarn add @xpresser/file-uploader
```

#### Your Project
Add `npm://@xpresser/file-uploader` to your `plugins.json`,  if you don't have one create a new one in your base folder.
```json
[
  "npm://@xpresser/file-uploader"
]
```

## Single File Upload
In your view
```html
<form action="/upload" enctype="multipart/form-data" method="POST">
    <input type="file" name="avatar" />
    <input type="submit" value="Upload  your avatar"/>
</form>
```

In your controller action
```javascript
$.router.post('/upload', async (http) => {

    // Get File
    const file = await http.file('avatar', {
        size: 1 // size in megabyte
    });
    
    // Check for error
    if(file.error()){
        return http.res.send(file.error())
    }
    
    // Save File
    await file.saveTo('path/to/folder');
    
    // check for save error()
    if(!file.isSaved()){
        return http.res.send(file.saveError());
    }
    
    // return response.
    return http.res.send({
        file: file,
        msg: "File uploaded successfully!."   
    });
});
```

## Multiple Files Upload
In your view
```html
<form action="/multiple_upload" enctype="multipart/form-data" method="POST">
    Select images: <input type="file" accept="image/*" name="images" multiple>
    <button type="submit">Upload your images</button>
</form>
```

In your controller action
```javascript
$.router.post('/multiple_upload', async (http) => {
    // Get Files
    const images = await http.files('images', {
        size: 1, // size in megabytes
        mimetype: 'image'
    });

    // check errors
    if (images.hasFilesWithErrors()) {
        const filesWithErrors = images.filesWithError();

        // Do something with filesWithErrors

        return http.send({
            message: 'Upload encountered some errors'
        })
    }   

    // Save all files to one folder
    await images.saveFiles('path/to/folder');

    // Or save files to specific folder using conditions by passing a function
    await images.saveFiles((file) => {
        return 'path/to/images/' + file.extension();
    });

    // return response
    return http.send({
        message: `${images.files.length} files has been uploaded successfully!.`
    });
});
```

## Form Body
The body of the form is returned by `http.file` and `http.files` function
```javascript
const image = http.file('fieldname');

console.log(image.body)

// OR

const files = http.files(['fieldname1', 'fieldname2']);

console.log(files.body)

```
