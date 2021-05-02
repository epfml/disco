export async function check_data(training_data){
    return {accepted: Object.keys(training_data).length>1}
}