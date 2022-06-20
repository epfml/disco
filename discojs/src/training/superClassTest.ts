export class superClass {
    addingNumbers(){
        console.log('5')
    }
}

class child extends superClass{
    override addingNumbers(){
        console.log('Worked!')
    }
}

let example: child = new child()
example.addingNumbers()