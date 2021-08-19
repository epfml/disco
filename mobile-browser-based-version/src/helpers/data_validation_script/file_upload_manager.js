export class FileUploadManager {
  /**
   *
   * @param {Number} nbrClasses number of classes associated to the task
   * @param {Component} environment the component in which the fileUploadManager is created from
   */
  constructor(nbrClasses, environment) {
    this.nbrClasses = nbrClasses;
    this.environment = environment;
    this.multipleClass = nbrClasses > 1;
    this.filesList = {};
  }

  /**
   * Add a file to the file's list.
   * For CSV file, we associate the objectURL directly the file, for images we associated
   * for images we associated the label and the path to the file
   * @param {Object} objectURL
   * @param {Object} file
   * @param {String} label the label
   */
  addFile(objectURL, file, label) {
    // Add datatype check
    if (!this.multipleClass) {
      this.filesList[objectURL] = file;
    } else {
      this.filesList[objectURL] = { label: label, name: file.name };
    }
  }

  /**
   * Deletes the files at position objectURL
   * @param {Object} objectURL
   */
  deleteFile(objectURL) {
    delete this.filesList[objectURL];
  }

  /**
   * Getter function for the first file in the file's list
   * @returns the first file in the file's list
   */
  getFirstFile() {
    console.log(this.filesList);
    return this.filesList[Object.keys(this.filesList)[0]];
  }

  /**
   * Getter function for the file's list
   * @returns the file's list
   */
  getFilesList() {
    return this.filesList;
  }

  /**
   *
   * @returns the number of files in the file's list
   */
  numberOfFiles() {
    return this.filesList.length;
  }
}
