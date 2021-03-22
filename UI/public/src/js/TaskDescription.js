/**
 * Created by paulmansat on 27.02.21.
 */


/**
 * The different type of data possible
 * @type {{CSV: number, PNG: number, JPG: number}}
 */
const DATA_TYPE = {
    CSV : 0,
    PNG : 1,
    JPG : 2,

}
Object.freeze(DATA_TYPE) // make object immutable



class TaskDescription {

    /**
     *
     * @param {String} name the name of the task
     * @param {String} desc textual description of the task
     * @param {Number} dataType the type of objects (0: CSV, 1: PNG, 2: JPG)
     * @param {Object} dataArgs various features that can help describe the constraint put on the data
     */
    constructor(name, descTask, dataFormatDesc, dataExampleDesc, dataType, ...dataArgs) {
        this.name = name;
        this.desc = descTask;
        this.dataFormatDesc = dataFormatDesc;
        this.dataExampleDesc = dataExampleDesc
        this.dataType = dataType;

        // Initialization of the dataFormat object
        // Its value depends on the data type
        switch(dataType) {
            case DATA_TYPE.CSV:
                this.dataFormat = new DataFormatCSV(dataArgs)
                break
            case DATA_TYPE.JPG:
                this.dataFormat = new DataFormatJPG(dataArgs)
                break
            case DATA_TYPE:
                this.dataFormat = new DataFormatPNG(dataArgs)
                break
        }
    }

    send_data() {
        var descToSend = JSON.stringify(this); // Data to be sent
        // TO DO: send from the server the data
    }
}

/**
 * Class that represents the constraints associated to the format of a CSV file.
 * The constraints are: the number of feature of the CSV file, the header of the CSV file
 * and a data point that can be used as example.
 */
class DataFormatCSV {
    /**
     *
     * @param numberOfFeatures
     * @param featureHeader
     * @param dataPointExample
     */
    constructor([numberOfFeatures, featureHeader, dataPointExample]) {

        console.log("Call to dataformat CSV")
        this.numberOfFeatures = numberOfFeatures;
        this.featureHeader = featureHeader;
        this.dataPointExample = dataPointExample;
    }

}

class DataFormatJPG{
    // TO DO
}

class DataFormatPNG{
    // TO DO
}


