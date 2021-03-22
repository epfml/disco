const dfd = require("danfojs-node")
const tf = require("@tensorflow/tfjs-node")

async function load_process_data() {
    let df = await dfd.read_csv("https://web.stanford.edu/class/archive/cs/cs109/cs109.1166/stuff/titanic.csv")

    console.log(df.head())
    //A feature engineering: Extract all titles from names columns
    let title = df['Name'].apply((x) => { return x.split(".")[0] }).values
    //replace in df
    df.addColumn({ column: "Name", value: title })

    //label Encode Name feature
    let encoder = new dfd.LabelEncoder()
    let cols = ["Sex", "Name"]
    cols.forEach(col => {
        encoder.fit(df[col])
        enc_val = encoder.transform(df[col])
        df.addColumn({ column: col, value: enc_val })
    })


    let Xtrain,ytrain;
    Xtrain = df.iloc({ columns: [`1:`] })
    ytrain = df['Survived']

    // Standardize the data with MinMaxScaler
    let scaler = new dfd.MinMaxScaler()
    scaler.fit(Xtrain)
    Xtrain = scaler.transform(Xtrain)

    return [Xtrain.tensor, ytrain.tensor] //return the data as tensors
}

console.log("Start Loading the data")
load_process_data()


