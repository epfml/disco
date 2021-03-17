// Data is passed under the form of Dictionary[ImageURL: label]
function helperJoinTraining(training_data){
    console.log("In auxiliary method")
    console.log(training_data)

    Object.keys(training_data).forEach(key => {
        console.log(key, training_data[key])
    });

    // Do feature preprocessing

    // Train model

    // Share weights
}

function featurePreprocessor(data){
    //TODO
}