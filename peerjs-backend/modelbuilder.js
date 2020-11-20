class ModelBuilder {
  constructor(ref, mode = "build", global = window) {
    this.args = {}
    this.args_serial = {}
    this.global = global

    if (mode === "build") {
      console.assert(ref.lib === "tf") // TODO remove in future
      this.model = global[ref.lib][ref.func](...ref.args)
      this.model_constructor = {lib : ref.lib, func : ref.func, args : ref.args}
      this.actions = []

    } else if (mode === "inject") {
      console.assert(ref.model_constructor.lib === "tf") // TODO remove in future
      this.model = global[ref.model_constructor.lib][ref.model_constructor.func](...ref.model_constructor.args)
      this.model_constructor = ref.model_constructor
      this.actions = ref.actions
      
      Object.keys(ref.args).forEach((k) => {this.compute_arg(k, ref.args[k].path, ...ref.args[k].args)})
      ref.actions.forEach((v) => {this._apply(v.name, v.args)})
    }
  }

  compute_arg(name, func_path, ...args) {
    this.args[name] = this._compute(this.global, func_path, ...args)
    this.args_serial[name] = {path : func_path, args : args}
    return this.args[name]
  }

  _compute(namespace, func_path, ...args) {
    var func = namespace[func_path[0]]
    for (var i = 1; i < func_path.length; i++) {
      func = func[func_path[i]]
    }
    var res = func(...args)
    return res
  }

  _apply(func_name, ...args) {
    var arg_array = []
    for (var i = 0; i < args.length; i++) {
      arg_array.push(this.args[args[i]])
    }

    this.model[func_name](...arg_array)
  }

  apply(func_name, ...args) {
    this._apply(func_name, ...args)
    this.actions.push({name : func_name, args : args})
  }

  set_model_constructor(constr) {
    this.constructor = constr
  }

  set_actions(actions) {
    this.actions = actions
  }

  get_model_constructor() {
    return this.model_constructor
  }

  get_actions() {
    return this.actions
  }

  get_args() {
    return this.args_serial
  }

  get_model() {
    return this.model
  }
}