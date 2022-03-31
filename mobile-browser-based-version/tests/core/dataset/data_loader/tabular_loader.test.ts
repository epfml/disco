import { expect } from 'chai'
import { TabularLoader } from '../../../../src/core/dataset/data_loader/tabular_loader'
import { loadTasks } from '../../../../src/core/task/utils'

const inputFiles = ['file://./example_training_data/titanic.csv']

describe('tabular loader test', () => {
    it('titanic csv columns', async () => {
        const titanic = (await loadTasks())[0]
        const loader = new TabularLoader(',')
        const features = titanic.trainingInformation.inputColumns
        const labels = titanic.trainingInformation.outputColumns
        const dataset = loader.load(
            inputFiles,
            features,
            labels
        )
        expect(await dataset.columnNames()).eql(labels.concat(features))
    })
})