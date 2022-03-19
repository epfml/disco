export class Dataset {
    test: any
    labels: any
    constructor (test) {
      this.test = test
    }

    size (): number {
      return this.test.size()
    }

    getSamples () {}

    getLabels () {
        if (this.labels === undefined) {
            throw new Error()
        }
        return this.labels
    }
}
