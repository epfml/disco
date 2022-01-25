export class FileUploadManager {
  nbrClasses: number;
  environment: any;
  multipleClass: boolean;
  filesList: any;
  labelFile: any;

  /**
   *
   * @param {Number} nbrClasses number of classes associated to the task
   * @param {Component} environment the component in which the fileUploadManager is created from
   */
  constructor (nbrClasses, environment) {
    this.nbrClasses = nbrClasses
    this.environment = environment
    this.multipleClass = nbrClasses > 1
    this.filesList = {}
    this.labelFile = {}
  }

  /**
   * Add a file to the file's list.
   * For CSV file, we associate the objectURL directly the file, for images we associated
   * for images we associated the label and the path to the file
   * @param {Object} objectURL
   * @param {Object} file
   * @param {String} label the label
   */
  addFile (objectURL, file, label) {
    // Add datatype check
    if (!this.multipleClass) {
      this.filesList[objectURL] = file
    } else {
      if (label === 'Labels') {
        this.labelFile[objectURL] = { label: label, name: file.name }
      } else {
        this.filesList[objectURL] = { label: label, name: file.name }
      }
    }
  }

  /**
   * Deletes the files at position objectURL
   * @param {Object} objectURL
   */
  deleteFile (objectURL) {
    delete this.filesList[objectURL]
  }

  /**
   *  TODO: Temporary function to append labels to files.
   *  The data checker (helpers_image_tasks) assumes that
   *  the labels file is added last, given the current
   *  implementation it is hard to do this in a proper way,
   *  as a temporary fix we add the labelFile in which we
   *  always store labels, and when files are fetched from the
   *  file_upload_manager we append the labels to the filesList
   *  like nothing has changed.
   *
   *  Originally there was no labelFile variable, to be also
   *  removed when this section is re-worked.
   *
   */
  _appendLabelFileToFilesList () {
    this.filesList = { ...this.filesList, ...this.labelFile }
    this.labelFile = {}
  }

  /**
   * Getter function for the first file in the file's list
   * @returns the first file in the file's list
   */
  getFirstFile () {
    this._appendLabelFileToFilesList()
    return this.filesList[Object.keys(this.filesList)[0]]
  }

  /**
   * Getter function for the file's list
   * @returns the file's list
   */
  getFilesList () {
    this._appendLabelFileToFilesList()
    return this.filesList
  }

  /**
   *
   * @returns the number of files in the file's list
   */
  numberOfFiles () {
    return (
      Object.keys(this.filesList).length + Object.keys(this.labelFile).length
    )
  }

  /**
   *
   * clears the fileList
   */
  clear () {
    this.filesList = {}
    this.labelFile = {}
  }
}
