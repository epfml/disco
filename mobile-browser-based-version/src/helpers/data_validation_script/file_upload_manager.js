export class FileUploadManager {
    /**
     * 
     * @param {Number} nbr_classes 
     * @param {Component} environment 
     * @param {Boolean} multipleClass if True then for each file uploaded we have a label associated other no label associated to the uploaded file
     */
    constructor(nbr_classes, environment, multipleClass) {
        this.nbr_classes = nbr_classes;
        this.environment = environment;
        this.multipleClass = multipleClass

        this.filesList = {}

    }

    // CSV: we associate directly the file 
    // IMAGES: we associate the path to the file 
    addFile(objectURL, file, label) {
        // Add datatype check 
        if (!this.multipleClass) {
            this.filesList[objectURL] = file
        } else {
            this.filesList[objectURL] = {label:label, name: file.name}
        }
    }

    deleteFile(objectURL) {
        delete this.filesList[objectURL]
    }

    getFirstFile() {
        return this.filesList[Object.keys(this.filesList)[0]]
    }

    getFilesList() {
        return this.filesList
    }

    numberOfFiles() {
        return this.filesList.length
    }
} 