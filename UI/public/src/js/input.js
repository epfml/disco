
var store = {
    debug: true,
    state: {
        message: 'Hello!'
    },
    setMessageAction(newValue) {
        if (this.debug) console.log('setMessageAction triggered with', newValue)
        this.state.message = newValue
    },
    clearMessageAction() {
        if (this.debug) console.log('clearMessageAction triggered')
        this.state.message = ''
    }
}

var vmA = new Vue({
    el: '#vma',
    data: {
        privateState: {},
        sharedState: store.state
    }
})

var vmB = new Vue({
    el: '#vmb',
    data: {
        privateState: {},
        sharedState: store.state
    }
})

var headerMapping = new Vue({
    el: '#mapHeader',
    data: {
        headers: [
            { id: 'PassengerId', userHeader: 'PassengerId' },
            { id: 'Survived', userHeader: 'Survived' },
            { id: 'Name', userHeader: 'Name' },
            { id: 'Sex', userHeader: 'Sex' },
            { id: 'Age', userHeader: 'Age' },
            { id: 'SibSp', userHeader: 'SibSp' },
            { id: 'Parch', userHeader: 'Parch' },
            { id: 'Ticket', userHeader: 'Ticket' },
            { id: 'Fare', userHeader: 'Cabin' },
            { id: 'Cabin', userHeader: 'Cabin' },
            { id: 'Embarked', userHeader: 'Embarked' },
            { id: 'Pclass', userHeader: 'Pclass' },

        ]
    }
});

var validationMessage = new Vue({
    el: '#feedbackMessage',
    data: {
        message: "",
        error: false // Is there an error
    }
})

var trainingStatus = new Vue({
    el: '#trainingStatus',
    data: {
        seen: false
    }
})

/**
 * ########################################
 * Task Description objects 
 * ########################################
 */

const titanicTaskDescription = new TaskDescription(
    "Titanic", 
    "In this challenge, we ask you to build a predictive model that answers the question: “what sorts of people were more likely to survive?” using passenger data (ie name, age, gender, socio-economic class, etc).",
    "The model takes as input a csv file with 3 columns that are: PassengerId (String), Survived (Int), Pclass (Int), Name (String), Sex ({male, female}), Age (Int), SibSp (Int), Parch (Int), Ticket (String), Fare (Int), Cabin (String), Embarked ({S, C, Q}). The model will use the column Survived as the label that have to be predicted.",
    "The example below is an example of the type of data that is accepted by the model",
    0,
    12, 
    ["PassengerId","Survived","Pclass","Name","Sex","Age","SibSp","Parch","Ticket","Fare","Cabin","Embarked"], 
    [1,0,3,"Braund, Mr. Owen Harri","male",22,1,0,"A/5 21171",7.25,,"S"],
    )


var titanicTaskDes = new Vue({
    el:"#titanicTaskDesc",
    data: {
        taskDescription: titanicTaskDescription
    }

})



/**
 * ########################################
 * Output some statistics on the trained dataset 
 * ########################################
 */

const cssColors = (color) => {
    return getComputedStyle(document.documentElement).getPropertyValue(color)
}

const getColor = () => {
    return window.localStorage.getItem('color') ?? 'cyan'
}

const colors = {
    primary: cssColors(`--color-${getColor()}`),
    primaryLight: cssColors(`--color-${getColor()}-light`),
    primaryLighter: cssColors(`--color-${getColor()}-lighter`),
    primaryDark: cssColors(`--color-${getColor()}-dark`),
    primaryDarker: cssColors(`--color-${getColor()}-darker`),
}

const val_accuracy = document.getElementById('val_accuracy')

const valAccuracyChart = new Chart(document.getElementById('valAccuracyChart'), {
    type: 'line',
    data: {
        labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        datasets: [
            {
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: colors.primary,
                borderWidth: 0,
                categoryPercentage: 1,
            },
        ],
    },
    options: {
        scales: {
            yAxes: [
                {
                    display: false,
                    gridLines: false,
                    // uncomment to stop chart auto scale 
                    /*
                    ticks: {
                        min:0,
                        max:100
                    }*/
                },
            ],
            xAxes: [
                {
                    display: false,
                    gridLines: false,
                },
            ],
            ticks: {
                padding: 10,
            },
        },
        cornerRadius: 2,
        maintainAspectRatio: false,
        legend: {
            display: false,
        },
        tooltips: {
            prefix: 'Validation Accuracy',
            bodySpacing: 4,
            footerSpacing: 4,
            hasIndicator: true,
            mode: 'index',
            intersect: true,
        },
        hover: {
            mode: 'nearest',
            intersect: true,
        },
    },
})

async function updateValidationAccuracy(epoch, accuracy) {
    valAccuracyChart.data.datasets[0].data.push(accuracy)
    valAccuracyChart.data.datasets[0].data.splice(0, 1)
    valAccuracyChart.data.labels.push(epoch)
    valAccuracyChart.data.labels.splice(0, 1)
    await valAccuracyChart.update()
    val_accuracy.innerText = accuracy
}

const accuracy = document.getElementById('accuracy')

const accuracyChart = new Chart(document.getElementById('accuracyChart'), {
    type: 'line',
    data: {
        labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        datasets: [
            {
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: colors.primary,
                borderWidth: 0,
                categoryPercentage: 1,
            },
        ],
    },
    options: {
        scales: {
            yAxes: [
                {
                    display: false,
                    gridLines: false,
                    // uncomment to stop chart auto scale 
                    /*
                    ticks: {
                        min:0,
                        max:100
                    }*/
                },
            ],
            xAxes: [
                {
                    display: false,
                    gridLines: false,
                },
            ],
            ticks: {
                padding: 10,
            },
        },
        cornerRadius: 2,
        maintainAspectRatio: false,
        legend: {
            display: false,
        },
        tooltips: {
            prefix: 'Validation Accuracy',
            bodySpacing: 4,
            footerSpacing: 4,
            hasIndicator: true,
            mode: 'index',
            intersect: true,
        },
        hover: {
            mode: 'nearest',
            intersect: true,
        },
    },
})

async function updateAccuracy(epoch, _accuracy) {
    accuracyChart.data.datasets[0].data.push(_accuracy)
    accuracyChart.data.datasets[0].data.splice(0, 1)
    accuracyChart.data.labels.push(epoch)
    accuracyChart.data.labels.splice(0, 1)
    await accuracyChart.update()
    accuracy.innerText = _accuracy
}

/**
 * ########################################
 * Titanic model handling 
 * ########################################
 */

/**
 * Function called when user's want's to train the data 
 */
async function load_process_data() {

    const filesElement = document.getElementById('hidden-input');

    // Assume we only read the first file 
    let file = filesElement.files[0];

    let reader = new FileReader();
    reader.onload = e => {
        console.log("Start: Processing Uploaded File")

        // Check some basic prop. in the user's uploaded file 
        var content = e.target.result
        var userHeader = content.split('\n').shift().split(',') // user's header array
        var checkHeaderLength = userHeader.length == 12 // Check that the user's file has the right number of columns
        if (!checkHeaderLength) {
            alert("Training aborted. The uploaded file has the wrong number of columns.")
        }
       
        // Check that the user's file and what has been translated as content is correct 
        var checkHeaderContent = true
        var wrongRow = ""
        var numberWrong = 0
        if(checkHeaderLength) {
            headerMapping.headers.forEach((row)=> {
                checkHeaderContent = checkHeaderContent && userHeader.includes(row.userHeader) 
                if (!userHeader.includes(row.userHeader)) {
                    wrongRow = wrongRow.concat("\n".concat(row.userHeader))
                    ++numberWrong
                }
            })  
            if(!checkHeaderContent){
                if (numberWrong == 1) {
                    alert("Training aborted. The following column name was not found in the uploaded file: ".concat(wrongRow))
                } else {
                    alert("Training aborted. The following columns name were not found in the uploaded file: ".concat(wrongRow))
                }
            }  
        }    
        
        var startTraining = checkHeaderLength && checkHeaderContent
        
        // If user's file respects our format, parse it and start training 
        if (startTraining) {
            console.log("User File Validated. Start parsing.")
            validationMessage.message = "Thanks for the data! Training has started."
            validationMessage.error = false

            var parsedCSV = d3.csv.parse(e.target.result, function (d) {
                return {
                    // Map the user's data point to our format 
                    // and convert what can be converted to int or string (with +) 
                    PassengerId: +d[headerMapping.headers[0].userHeader],
                    Survived: +d[headerMapping.headers[1].userHeader],
                    Name: d[headerMapping.headers[2].userHeader],
                    Sex: d[headerMapping.headers[3].userHeader],
                    Age: +d[headerMapping.headers[4].userHeader],
                    SibSp: +d[headerMapping.headers[5].userHeader],
                    Parch: +d[headerMapping.headers[6].userHeader],
                    Ticket: d[headerMapping.headers[7].userHeader],
                    Fare: +d[headerMapping.headers[8].userHeader],
                    Cabin: d[headerMapping.headers[9].userHeader],
                    Embarked: d[headerMapping.headers[10].userHeader],
                    Pclass: +d[headerMapping.headers[11].userHeader]
                };
            }, function (error, rows) { console.log(rows); })


            let df = new dfd.DataFrame(parsedCSV)
            // console.log(df)
            train(df)
        } else {
            console.log("Cannot Start training")
            validationMessage.message = "Somthing seems wrong with your data. Your file has the wrong number of features"
            validationMessage.error = true
        }
    };

    reader.readAsText(file);
}



/**
 * Function that processes the data uploaded by the user 
 * Encodes features, normalize them and create the training and label tensor vectors
 * @param {dfd} df a dfd (danfo.js) dataframe
 * @returns Two tensorsflows (tf) are returned, the training data and the labels
 */
async function data_processing(df) {

    // Extract the salutation feature from name 
    console.log(df)
    let title = df['Name'].apply((x) => { return x.split(".")[0] }).values

    // Replace the name feature by the salutation feature
    df.addColumn({ column: "Name", value: title })

    //label Encode Name feature
    let encoder = new dfd.LabelEncoder()
    let cols = ["Sex", "Name", "Ticket", "Embarked", "Cabin"]
    cols.forEach(col => {
        encoder.fit(df[col])
        enc_val = encoder.transform(df[col])
        df.addColumn({ column: col, value: enc_val })
    })

    // Create the training and label dataset 
    let Xtrain, ytrain;
    Xtrain = df.loc({ columns: ["PassengerId", "Name", "Pclass", "Sex", "Age", "SibSp", "Parch", "Ticket", "Fare", "Cabin", "Embarked"] })
    ytrain = df['Survived']

    // Standardize the data with MinMaxScaler
    let scaler = new dfd.MinMaxScaler()
    scaler.fit(Xtrain)
    Xtrain = scaler.transform(Xtrain)

    console.log("End: Process Uploaded File")
    return [Xtrain.tensor, ytrain.tensor]
}

/**
 * Creates the tf.model 
 * TO DO: fetch model from local storage 
 * @returns Returns a tf.model for training 
 */
function get_model() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [11], units: 124, activation: 'relu', kernelInitializer: 'leCunNormal' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }))
    model.summary();
    return model
}

async function train(df) {
    const model = get_model()
    data = await data_processing(df)
    const Xtrain = data[0]
    const ytrain = data[1]

    model.compile({
        optimizer: "rmsprop",
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    console.log("Training started....")
    await model.fit(Xtrain, ytrain, {
        batchSize: 32,
        epochs: 12,
        validationSplit: 0.2,
        callbacks: {
            onEpochEnd: async (epoch, logs) => {
                await updateValidationAccuracy(epoch + 1, (logs.val_acc * 100).toFixed(2))
                await updateAccuracy(epoch + 1, (logs.acc * 100).toFixed(2))
                console.log(`EPOCH (${epoch + 1}): Train Accuracy: ${(logs.acc * 100).toFixed(2)},
                                                   Val Accuracy:  ${(logs.val_acc * 100).toFixed(2)}\n`);
            }
        }
    });

    // Save model in browser's storage (indexeddb might not be big enough)
    await model.save('indexeddb://my-model');

    // await model.save('downloads://small-test');

}





