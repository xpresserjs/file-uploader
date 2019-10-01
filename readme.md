# Xpresser File Uploader
Note: Xpresser also supports all express supported file handling libraries.

Built on [busboy](https://npmjs.com/package/busboy), an easy plugin to handle file uploads from form request to your application storage folder.


## Install
```sh
npm install @xpresser/file-uploader

// OR

yarn add @xpresser/file-uploader
```

Add `npm://@xpresser/file-uploader` to your `plugins.json`,  if you don't have one create a new one in your base folder.
```json
[
  ...
  "npm://@xpresser/file-uploader"
]
```

## Usage
In your view
```html
<form action="/upload" enctype="multipart/form-data" method="POST">
    <input type="file" name="avatar" />
    <input type="submit" value="Upload  your avatar"/>
</form>
```
In your controller action

```javascript
$.router.post('/upload', async (x) => {

    // Get File
    const file = await x.file('avatar', {
        size: 1 // size in megabyte
    });
    
    // Check for error
    if(file.error()){
        return x.res.send(file.error())
    }
    
    // Save File
    await file.saveTo();
    
    // check for save error()
    if(!file.isSaved()){
        return x.res.send(file.saveError());
    }
    
    // return file.
    return x.res.send({
        file: file,
        msg: "File uploaded successfully!."   
    });
});
```
