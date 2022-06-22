export class superClass {
  addingNumbers (): void {
    console.log('5')
  }
}

class Child extends superClass {
  override addingNumbers (): void {
    console.log('Worked!')
  }
}

const Example: Child = new Child()
Example.addingNumbers()
